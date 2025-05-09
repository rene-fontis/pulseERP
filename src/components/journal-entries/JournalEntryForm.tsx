
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Check, ChevronsUpDown, PlusCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import type { Account, NewJournalEntryPayload, FiscalYear, JournalEntryLine } from '@/types';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Card, CardContent } from '@/components/ui/card';

const journalEntryLineSchema = z.object({
  id: z.string().optional(), // For useFieldArray key
  accountId: z.string().min(1, "Konto ist erforderlich."),
  debit: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val),
    z.number().optional()
  ),
  credit: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val),
    z.number().optional()
  ),
  lineDescription: z.string().optional(),
}).refine(data => {
  const hasDebit = typeof data.debit === 'number' && data.debit > 0;
  const hasCredit = typeof data.credit === 'number' && data.credit > 0;
  return (hasDebit && !hasCredit) || (hasCredit && !hasDebit);
}, {
  message: "Pro Zeile entweder Soll oder Haben > 0 angeben.",
  path: ["debit"], 
});


const createJournalEntryFormSchema = (fiscalYear?: FiscalYear | null) => z.object({
  date: z.date({ required_error: "Datum ist erforderlich." })
    .refine(date => {
      if (!fiscalYear) return true; 
      const startDate = startOfDay(parseISO(fiscalYear.startDate));
      const endDate = endOfDay(parseISO(fiscalYear.endDate));
      return isWithinInterval(date, { start: startDate, end: endDate });
    }, {
      message: fiscalYear ? `Datum muss zwischen ${format(parseISO(fiscalYear.startDate), "dd.MM.yyyy", { locale: de })} und ${format(parseISO(fiscalYear.endDate), "dd.MM.yyyy", { locale: de })} liegen.` : "Ungültiger Datumsbereich."
    }),
  entryNumber: z.string().min(1, "Buchungsnummer ist erforderlich."),
  description: z.string().min(1, "Beschreibung ist erforderlich."),
  lines: z.array(journalEntryLineSchema).min(2, "Mindestens zwei Buchungszeilen erforderlich.").refine(lines => {
    const totalDebits = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredits = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
    return totalDebits > 0 && totalCredits > 0;
  }, {
    message: "Es muss mindestens eine Soll- und eine Haben-Buchung vorhanden sein.",
  }),
}).refine(data => {
  const totalDebits = data.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredits = data.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  // Using a small tolerance for floating point comparison
  return Math.abs(totalDebits - totalCredits) < 0.001;
}, {
  message: "Summe Soll muss Summe Haben entsprechen.",
  path: ["lines"], 
});


export type JournalEntryFormValues = z.infer<ReturnType<typeof createJournalEntryFormSchema>>;

interface JournalEntryFormProps {
  tenantId: string;
  accounts: Account[];
  activeFiscalYear: FiscalYear | null;
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
      date: activeFiscalYear ? new Date(Math.max(new Date().getTime(), parseISO(activeFiscalYear.startDate).getTime())) : new Date(),
      entryNumber: defaultEntryNumber || '',
      description: '',
      lines: [
        { accountId: '', debit: undefined, credit: undefined, lineDescription: '' },
        { accountId: '', debit: undefined, credit: undefined, lineDescription: '' },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines"
  });
  
  useEffect(() => {
    if (activeFiscalYear) {
      const today = new Date();
      const fiscalYearStartDate = parseISO(activeFiscalYear.startDate);
      let defaultDate = today;
      if (today < fiscalYearStartDate) defaultDate = fiscalYearStartDate;
      const fiscalYearEndDate = parseISO(activeFiscalYear.endDate);
      if (today > fiscalYearEndDate) defaultDate = fiscalYearEndDate; 
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
    const mappedLines: JournalEntryLine[] = values.lines.map(line => {
      const account = accounts.find(acc => acc.id === line.accountId);
      if (!account) throw new Error(`Konto nicht gefunden: ${line.accountId}`);
      return {
        id: crypto.randomUUID(),
        accountId: account.id,
        accountNumber: account.number,
        accountName: account.name,
        debit: line.debit || undefined,
        credit: line.credit || undefined,
        description: line.lineDescription || '',
      };
    });
    
    const newJournalEntryPayload: NewJournalEntryPayload = {
      tenantId,
      fiscalYearId: activeFiscalYear?.id,
      entryNumber: values.entryNumber,
      date: values.date.toISOString(),
      description: values.description,
      posted: false, 
      lines: mappedLines,
    };
    
    await onSubmit(newJournalEntryPayload); 
    form.reset({ 
        date: values.date, 
        entryNumber: '', 
        description: '',
        lines: [
            { accountId: '', debit: undefined, credit: undefined, lineDescription: '' },
            { accountId: '', debit: undefined, credit: undefined, lineDescription: '' },
        ],
    });
  };
  
  const fiscalYearStart = activeFiscalYear ? parseISO(activeFiscalYear.startDate) : undefined;
  const fiscalYearEnd = activeFiscalYear ? parseISO(activeFiscalYear.endDate) : undefined;

  const watchedLines = form.watch("lines");
  const totalDebits = watchedLines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const totalCredits = watchedLines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            if (!activeFiscalYear || !fiscalYearStart || !fiscalYearEnd) return false;
                            return date < fiscalYearStart || date > fiscalYearEnd;
                        }}
                        defaultMonth={field.value}
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
        </div>
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Beschreibung (Hauptbuchung)</FormLabel>
              <FormControl>
                <Textarea placeholder="Beschreibung der gesamten Buchung" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
            <FormLabel>Buchungszeilen</FormLabel>
            {fields.map((item, index) => (
                <Card key={item.id} className="p-4 relative bg-background/50">
                    <CardContent className="p-0 space-y-3">
                        {index > 1 && ( // Allow removing lines beyond the initial two
                             <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 text-muted-foreground hover:text-destructive z-10 h-7 w-7"
                                onClick={() => remove(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Zeile entfernen</span>
                            </Button>
                        )}
                        <FormField
                            control={form.control}
                            name={`lines.${index}.accountId`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-xs">Konto</FormLabel>
                                <AccountAutocomplete
                                    options={accountOptions}
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Konto wählen..."
                                />
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <FormField
                                control={form.control}
                                name={`lines.${index}.debit`}
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs">Soll (CHF)</FormLabel>
                                    <FormControl>
                                    <Input type="number" step="0.01" placeholder="0.00" {...field} 
                                        onChange={e => {
                                            const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                            field.onChange(value);
                                            if(value && value > 0) form.setValue(`lines.${index}.credit`, undefined, {shouldValidate: true});
                                        }}
                                        value={field.value ?? ''}
                                    />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`lines.${index}.credit`}
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs">Haben (CHF)</FormLabel>
                                    <FormControl>
                                    <Input type="number" step="0.01" placeholder="0.00" {...field} 
                                        onChange={e => {
                                            const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                            field.onChange(value);
                                             if(value && value > 0) form.setValue(`lines.${index}.debit`, undefined, {shouldValidate: true});
                                        }}
                                         value={field.value ?? ''}
                                    />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                         <FormField
                            control={form.control}
                            name={`lines.${index}.lineDescription`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-xs">Beschreibung Zeile (optional)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Details zu dieser Zeile" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         {/* Display line-specific error for debit/credit validation */}
                        {form.formState.errors.lines?.[index]?.debit?.message && (
                            <FormMessage className="text-xs">{form.formState.errors.lines?.[index]?.debit?.message}</FormMessage>
                        )}
                         {form.formState.errors.lines?.[index]?.credit?.message && !form.formState.errors.lines?.[index]?.debit?.message && (
                            <FormMessage className="text-xs">{form.formState.errors.lines?.[index]?.credit?.message}</FormMessage>
                        )}
                    </CardContent>
                </Card>
            ))}
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ accountId: '', debit: undefined, credit: undefined, lineDescription: '' })}
                className="w-full"
            >
                <PlusCircle className="mr-2 h-4 w-4" /> Zeile hinzufügen
            </Button>
        </div>

        {form.formState.errors.lines?.message && <FormMessage>{form.formState.errors.lines.message}</FormMessage>}
        {form.formState.errors.lines?.root?.message && <FormMessage>{form.formState.errors.lines.root.message}</FormMessage>}


        <div className="mt-4 p-3 border rounded-md bg-muted/50">
            <div className="flex justify-between font-medium">
                <span>Total Soll:</span>
                <span>{totalDebits.toLocaleString('de-CH', { style: 'currency', currency: 'CHF' })}</span>
            </div>
            <div className="flex justify-between font-medium">
                <span>Total Haben:</span>
                <span>{totalCredits.toLocaleString('de-CH', { style: 'currency', currency: 'CHF' })}</span>
            </div>
            {Math.abs(totalDebits - totalCredits) >= 0.001 && (
                <p className="text-destructive text-sm mt-1">Summe Soll und Haben müssen übereinstimmen.</p>
            )}
        </div>


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
          className="w-full justify-between font-normal h-9 text-xs" // Adjusted size
        >
          {selectedOption ? selectedOption.label : placeholder || "Konto wählen..."}
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Konto suchen..." className="text-xs h-9"/>
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
                  className="text-xs"
                >
                  <Check
                    className={cn(
                      "mr-2 h-3 w-3",
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
