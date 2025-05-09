
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import type { Account, NewJournalEntryPayload, FiscalYear } from '@/types';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

const createJournalEntryFormSchema = (fiscalYear?: FiscalYear | null) => z.object({
  date: z.date({ required_error: "Datum ist erforderlich." })
    .refine(date => {
      if (!fiscalYear) return true; // Allow if no fiscal year context (should be handled by disabling form)
      const startDate = startOfDay(parseISO(fiscalYear.startDate));
      const endDate = endOfDay(parseISO(fiscalYear.endDate));
      return isWithinInterval(date, { start: startDate, end: endDate });
    }, {
      message: fiscalYear ? `Datum muss zwischen ${format(parseISO(fiscalYear.startDate), "dd.MM.yyyy", { locale: de })} und ${format(parseISO(fiscalYear.endDate), "dd.MM.yyyy", { locale: de })} liegen.` : "Ungültiger Datumsbereich."
    }),
  entryNumber: z.string().min(1, "Buchungsnummer ist erforderlich."),
  description: z.string().min(1, "Beschreibung ist erforderlich."),
  debitAccountId: z.string().min(1, "Soll-Konto ist erforderlich."),
  creditAccountId: z.string().min(1, "Haben-Konto ist erforderlich."),
  amount: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val),
    z.number().positive("Betrag muss positiv sein.")
  ),
});

export type JournalEntryFormValues = z.infer<ReturnType<typeof createJournalEntryFormSchema>>;

interface JournalEntryFormProps {
  tenantId: string;
  accounts: Account[];
  activeFiscalYear: FiscalYear | null; // Pass the active fiscal year
  onSubmit: (values: NewJournalEntryPayload) => Promise<void>;
  isSubmitting?: boolean;
  defaultEntryNumber?: string;
}

interface AccountOption {
  value: string;
  label: string;
  account: Account;
}

export function JournalEntryForm({ tenantId, accounts, activeFiscalYear, onSubmit, isSubmitting, defaultEntryNumber }: JournalEntryFormProps) {
  const formSchema = createJournalEntryFormSchema(activeFiscalYear);
  
  const form = useForm<JournalEntryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: activeFiscalYear ? new Date(Math.max(new Date().getTime(), parseISO(activeFiscalYear.startDate).getTime())) : new Date(), // Default to today or start of fiscal year
      entryNumber: defaultEntryNumber || '',
      description: '',
      debitAccountId: '',
      creditAccountId: '',
      amount: 0,
    },
  });
  
  useEffect(() => {
    // Reset/update default date if activeFiscalYear changes or on initial load
    if (activeFiscalYear) {
      const today = new Date();
      const fiscalYearStartDate = parseISO(activeFiscalYear.startDate);
      let defaultDate = today;
      if (today < fiscalYearStartDate) {
        defaultDate = fiscalYearStartDate;
      }
      const fiscalYearEndDate = parseISO(activeFiscalYear.endDate);
      if (today > fiscalYearEndDate) {
        // This case should ideally be prevented by disabling the form if today is outside active FY
        // Or default to the end date if creating for past. For now, let's try to keep it within.
        defaultDate = fiscalYearEndDate; 
      }
       if(!isWithinInterval(form.getValues("date"), {start: fiscalYearStartDate, end: fiscalYearEndDate})) {
         form.setValue("date", defaultDate, { shouldValidate: true });
       }
    }
  }, [activeFiscalYear, form]);


  const accountOptions: AccountOption[] = accounts.map(acc => ({
    value: acc.id,
    label: `${acc.number} - ${acc.name}`,
    account: acc,
  }));

  const handleSubmit = async (values: JournalEntryFormValues) => {
    const debitAccount = accounts.find(acc => acc.id === values.debitAccountId);
    const creditAccount = accounts.find(acc => acc.id === values.creditAccountId);

    if (!debitAccount || !creditAccount) {
      form.setError("debitAccountId", { message: "Ungültiges Konto ausgewählt." });
      return;
    }
    
    const newJournalEntryPayload: NewJournalEntryPayload = {
      tenantId,
      fiscalYearId: activeFiscalYear?.id,
      entryNumber: values.entryNumber,
      date: values.date.toISOString(),
      description: values.description,
      posted: false, 
      lines: [
        {
          id: crypto.randomUUID(), 
          accountId: debitAccount.id,
          accountNumber: debitAccount.number,
          accountName: debitAccount.name,
          debit: values.amount,
          description: "Sollbuchung",
        },
        {
          id: crypto.randomUUID(), 
          accountId: creditAccount.id,
          accountNumber: creditAccount.number,
          accountName: creditAccount.name,
          credit: values.amount,
          description: "Habenbuchung",
        },
      ],
    };
    
    await onSubmit(newJournalEntryPayload); 
    form.reset({ 
        date: values.date, 
        entryNumber: '', 
        description: '',
        debitAccountId: '',
        creditAccountId: '',
        amount: 0,
    });
  };
  
  const fiscalYearStart = activeFiscalYear ? parseISO(activeFiscalYear.startDate) : undefined;
  const fiscalYearEnd = activeFiscalYear ? parseISO(activeFiscalYear.endDate) : undefined;


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Datum</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP", { locale: de })
                      ) : (
                        <span>Datum wählen</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => {
                        if (!activeFiscalYear || !fiscalYearStart || !fiscalYearEnd) return false; // No restriction if no fiscal year
                        return date < fiscalYearStart || date > fiscalYearEnd;
                      }
                    }
                    defaultMonth={field.value} // Ensure calendar opens to selected/default month
                    initialFocus
                    locale={de}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="entryNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Buchungsnummer</FormLabel>
              <FormControl>
                <Input placeholder="z.B. 2024-001" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Beschreibung</FormLabel>
              <FormControl>
                <Textarea placeholder="Beschreibung der Buchung" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="debitAccountId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Soll-Konto</FormLabel>
              <AccountAutocomplete
                options={accountOptions}
                value={field.value}
                onChange={field.onChange}
                placeholder="Soll-Konto wählen..."
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="creditAccountId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Haben-Konto</FormLabel>
               <AccountAutocomplete
                options={accountOptions}
                value={field.value}
                onChange={field.onChange}
                placeholder="Haben-Konto wählen..."
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Betrag (CHF)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="0.00" {...field} onChange={e => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting || !activeFiscalYear} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          {isSubmitting ? 'Speichern...' : 'Buchung erstellen'}
        </Button>
      </form>
    </Form>
  );
}


interface AccountAutocompleteProps {
  options: AccountOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function AccountAutocomplete({ options, value, onChange, placeholder }: AccountAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedOption ? selectedOption.label : placeholder || "Konto wählen..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Konto suchen..." />
          <CommandList>
            <CommandEmpty>Kein Konto gefunden.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label} 
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}