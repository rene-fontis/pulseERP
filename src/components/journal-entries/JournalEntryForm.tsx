"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
import type { Account, NewJournalEntryPayload, FiscalYear, JournalEntryLine, JournalEntry } from '@/types';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const dateValidation = (fiscalYear?: FiscalYear | null) => z.date({ required_error: "Datum ist erforderlich." })
  .refine(date => {
    if (!fiscalYear) return true;
    const startDate = startOfDay(parseISO(fiscalYear.startDate));
    const endDate = endOfDay(parseISO(fiscalYear.endDate));
    return isWithinInterval(date, { start: startDate, end: endDate });
  }, {
    message: fiscalYear ? `Datum muss zwischen ${format(parseISO(fiscalYear.startDate), "dd.MM.yyyy", { locale: de })} und ${format(parseISO(fiscalYear.endDate), "dd.MM.yyyy", { locale: de })} liegen.` : "Ungültiger Datumsbereich."
  });

const journalEntryLineSchema = z.object({
  id: z.string().optional(),
  accountId: z.string(), // Allow empty string initially. Validation moved to .refine
  debit: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '' ? parseFloat(val.replace(',', '.')) : (typeof val === 'number' ? val : undefined)),
    z.number().optional()
  ),
  credit: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '' ? parseFloat(val.replace(',', '.')) : (typeof val === 'number' ? val : undefined)),
    z.number().optional()
  ),
}).refine(data => {
  const hasDebit = typeof data.debit === 'number' && data.debit !== 0;
  const hasCredit = typeof data.credit === 'number' && data.credit !== 0;

  // If it's an empty line (no debit/credit), it's fine regardless of accountId.
  if (!hasDebit && !hasCredit) return true;

  // If it has debit or credit, then accountId must be non-empty.
  if ((hasDebit || hasCredit) && (!data.accountId || data.accountId.trim() === '')) {
    return false; 
  }
  
  // Only one of debit/credit can have a value if amounts are present.
  return (hasDebit && !hasCredit) || (!hasDebit && hasCredit);
}, {
  message: "Wenn ein Betrag vorhanden ist, muss ein Konto ausgewählt sein. Pro Zeile entweder Soll oder Haben angeben (nicht beides).",
  path: ["accountId"], // General path, specific errors can be added via superRefine on batch schema if needed
});


const baseEntrySchema = z.object({
  date: dateValidation(null), 
  entryNumber: z.string().min(1, "Belegnummer ist erforderlich."),
  description: z.string().min(1, "Beschreibung ist erforderlich."),
});

const singleEntryPartSchema = z.object({
  entryType: z.literal('single'),
  debitAccountId: z.string().min(1, "Soll-Konto ist erforderlich."),
  creditAccountId: z.string().min(1, "Haben-Konto ist erforderlich."),
  amount: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '' ? parseFloat(val.replace(',', '.')) : (typeof val === 'number' ? val : undefined)),
    z.number({invalid_type_error: "Betrag muss eine Zahl sein."}).positive("Betrag muss positiv sein.")
  ),
});

const batchEntryPartSchema = z.object({
  entryType: z.literal('batch'),
  lines: z.array(journalEntryLineSchema).min(2, "Mindestens zwei Buchungszeilen erforderlich.")
    .refine(lines => lines.some(line => line.accountId && (line.debit || line.credit) && line.accountId.trim() !== ''), "Mindestens eine gültige Buchungszeile mit Konto und Betrag erforderlich.")
    .refine(lines => {
      const totalDebits = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
      const totalCredits = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
      return Math.abs(totalDebits - totalCredits) < 0.001;
    }, {
      message: "Summe Soll muss Summe Haben entsprechen.",
    }).refine(lines => {
        const totalDebits = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
        return totalDebits > 0;
    }, {
        message: "Mindestens eine Soll-Buchung mit Betrag > 0 erforderlich.",
    }).refine(lines => {
        const totalCredits = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
        return totalCredits > 0;
    }, {
        message: "Mindestens eine Haben-Buchung mit Betrag > 0 erforderlich.",
    }),
});

const getJournalEntryFormSchema = (fiscalYear?: FiscalYear | null) => {
  return baseEntrySchema.extend({
    date: dateValidation(fiscalYear) 
  }).and(z.discriminatedUnion("entryType", [
    singleEntryPartSchema,
    batchEntryPartSchema
  ]));
};


export type JournalEntryFormValues = z.infer<ReturnType<typeof getJournalEntryFormSchema>>;

interface JournalEntryFormProps {
  tenantId: string;
  accounts: Account[];
  activeFiscalYear: FiscalYear | null;
  onSubmit: (values: NewJournalEntryPayload) => Promise<void>;
  isSubmitting?: boolean;
  defaultEntryNumber?: string;
  initialData?: JournalEntry | null; 
}

interface AccountOption {
  value: string;
  label: string;
  account: Account;
}

export function JournalEntryForm({ tenantId, accounts, activeFiscalYear, onSubmit, isSubmitting, defaultEntryNumber, initialData }: JournalEntryFormProps) {
  const formSchema = useMemo(() => getJournalEntryFormSchema(activeFiscalYear), [activeFiscalYear]);
  
  const form = useForm<JournalEntryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: useMemo(() => {
      const today = new Date();
      let defaultDate = today;
      if (activeFiscalYear) {
          const fiscalYearStartDate = parseISO(activeFiscalYear.startDate);
          const fiscalYearEndDate = parseISO(activeFiscalYear.endDate);
          if (today < fiscalYearStartDate) defaultDate = fiscalYearStartDate;
          if (today > fiscalYearEndDate) defaultDate = fiscalYearEndDate;
      }

      if (initialData && activeFiscalYear) {
        return {
          entryType: 'batch',
          date: parseISO(initialData.date),
          entryNumber: initialData.entryNumber,
          description: initialData.description,
          lines: initialData.lines.map(line => ({
            id: line.id || crypto.randomUUID(),
            accountId: line.accountId,
            debit: line.debit,
            credit: line.credit,
          })),
          debitAccountId: undefined,
          creditAccountId: undefined,
          amount: undefined,
        };
      } else {
        return {
          entryType: 'single',
          date: defaultDate,
          entryNumber: defaultEntryNumber || '',
          description: '',
          debitAccountId: '',
          creditAccountId: '',
          amount: undefined,
          lines: [
            { id: crypto.randomUUID(), accountId: '', debit: undefined, credit: undefined },
            { id: crypto.randomUUID(), accountId: '', debit: undefined, credit: undefined },
            ],
        };
      }
    }, [initialData, activeFiscalYear, defaultEntryNumber])
  });
  

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "lines"
  });
  
  const currentEntryType = form.watch("entryType");

  useEffect(() => {
    const defaultDate = activeFiscalYear ? new Date(Math.max(new Date().getTime(), parseISO(activeFiscalYear.startDate).getTime())) : new Date();
    if (initialData && activeFiscalYear) {
        form.reset({
            entryType: 'batch',
            date: parseISO(initialData.date),
            entryNumber: initialData.entryNumber,
            description: initialData.description,
            lines: initialData.lines.map(line => ({
                id: line.id || crypto.randomUUID(),
                accountId: line.accountId,
                debit: line.debit,
                credit: line.credit,
            })),
            debitAccountId: undefined,
            creditAccountId: undefined,
            amount: undefined,
        });
    } else if (!initialData) {
        form.reset({
            entryType: 'single',
            date: defaultDate,
            entryNumber: defaultEntryNumber || '',
            description: '',
            debitAccountId: '',
            creditAccountId: '',
            amount: undefined,
            lines: [
                { id: crypto.randomUUID(), accountId: '', debit: undefined, credit: undefined },
                { id: crypto.randomUUID(), accountId: '', debit: undefined, credit: undefined },
            ],
        });
    }
  }, [initialData, form, activeFiscalYear, defaultEntryNumber]);


  const accountOptions: AccountOption[] = accounts.map(acc => ({
    value: acc.id,
    label: `${acc.number} - ${acc.name}`,
    account: acc,
  }));

  const handleSubmitInternal = async (values: JournalEntryFormValues) => {
    let finalLines: JournalEntryLine[] = [];

    if (values.entryType === 'single') {
      const debitAccount = accounts.find(acc => acc.id === values.debitAccountId);
      const creditAccount = accounts.find(acc => acc.id === values.creditAccountId);
      if (!debitAccount || !creditAccount || !values.amount) {
        console.error("Missing data for single entry. This should be caught by validation.");
        return;
      }
      finalLines = [
        { id: crypto.randomUUID(), accountId: debitAccount.id, accountNumber: debitAccount.number, accountName: debitAccount.name, debit: values.amount, credit: undefined },
        { id: crypto.randomUUID(), accountId: creditAccount.id, accountNumber: creditAccount.number, accountName: creditAccount.name, debit: undefined, credit: values.amount },
      ];
    } else { 
      finalLines = values.lines!.filter(line => line.accountId && (line.debit || line.credit)).map(line => {
        const account = accounts.find(acc => acc.id === line.accountId);
        if (!account) throw new Error(`Konto nicht gefunden: ${line.accountId}`);
        return {
          id: line.id || crypto.randomUUID(), 
          accountId: account.id,
          accountNumber: account.number,
          accountName: account.name,
          debit: line.debit || undefined,
          credit: line.credit || undefined,
        };
      });
    }
    
    const newJournalEntryPayload: NewJournalEntryPayload = {
      tenantId,
      fiscalYearId: activeFiscalYear?.id, 
      entryNumber: values.entryNumber,
      date: values.date.toISOString(),
      description: values.description,
      posted: false, 
      lines: finalLines,
    };
    
    await onSubmit(newJournalEntryPayload); 
    if (!initialData) { 
        const today = new Date();
        let nextDefaultDate = today;
        if (activeFiscalYear) {
            const fiscalYearStartDate = parseISO(activeFiscalYear.startDate);
            const fiscalYearEndDate = parseISO(activeFiscalYear.endDate);
            if (today < fiscalYearStartDate) nextDefaultDate = fiscalYearStartDate;
            if (today > fiscalYearEndDate) nextDefaultDate = fiscalYearEndDate;
             if (!isWithinInterval(values.date, {start: fiscalYearStartDate, end: fiscalYearEndDate})) {
                // This case should ideally not happen due to date picker validation
                // but if it does, reset to a valid date within the fiscal year.
                nextDefaultDate = fiscalYearStartDate; 
             } else {
                nextDefaultDate = values.date; // Keep the date from the previous valid entry
             }
        }


        form.reset({ 
            entryType: 'single', 
            date: nextDefaultDate, 
            entryNumber: (parseInt(values.entryNumber, 10) + 1).toString(), // Increment entry number
            description: '',
            debitAccountId: '',
            creditAccountId: '',
            amount: undefined,
            lines: [
                { id: crypto.randomUUID(), accountId: '', debit: undefined, credit: undefined },
                { id: crypto.randomUUID(), accountId: '', debit: undefined, credit: undefined },
            ],
        });
    }
  };
  
  const fiscalYearStart = activeFiscalYear ? parseISO(activeFiscalYear.startDate) : undefined;
  const fiscalYearEnd = activeFiscalYear ? parseISO(activeFiscalYear.endDate) : undefined;

  const watchedBatchLines = form.watch("lines");
  const totalDebits = currentEntryType === 'batch' ? (watchedBatchLines || []).reduce((sum, line) => sum + (Number(line.debit) || 0), 0) : (form.getValues("amount") || 0);
  const totalCredits = currentEntryType === 'batch' ? (watchedBatchLines || []).reduce((sum, line) => sum + (Number(line.credit) || 0), 0) : (form.getValues("amount") || 0);


  const buttonText = initialData ? 'Änderungen speichern' : 'Buchung erstellen';

  const handleTabChange = (newTabValue: string) => {
    const currentValues = form.getValues();
    form.setValue("entryType", newTabValue as 'single' | 'batch', { shouldValidate: true, shouldDirty: true });

    if (newTabValue === 'batch') {
      if (currentValues.entryType === 'single' && currentValues.debitAccountId && currentValues.creditAccountId && currentValues.amount) {
        replace([
          { id: crypto.randomUUID(), accountId: currentValues.debitAccountId, debit: currentValues.amount, credit: undefined },
          { id: crypto.randomUUID(), accountId: currentValues.creditAccountId, debit: undefined, credit: currentValues.amount },
        ]);
      } else if (fields.length < 2) {
         replace([
            { id: crypto.randomUUID(), accountId: '', debit: undefined, credit: undefined },
            { id: crypto.randomUUID(), accountId: '', debit: undefined, credit: undefined },
         ]);
      }
      form.setValue("debitAccountId", undefined);
      form.setValue("creditAccountId", undefined);
      form.setValue("amount", undefined);

    } else if (newTabValue === 'single') {
      if (currentValues.entryType === 'batch' && currentValues.lines && currentValues.lines.length === 2) {
        const firstLine = currentValues.lines[0];
        const secondLine = currentValues.lines[1];
        if (firstLine.debit && secondLine.credit && firstLine.debit === secondLine.credit) {
          form.setValue("debitAccountId", firstLine.accountId);
          form.setValue("creditAccountId", secondLine.accountId);
          form.setValue("amount", firstLine.debit);
        } else if (firstLine.credit && secondLine.debit && firstLine.credit === secondLine.debit) {
           form.setValue("debitAccountId", secondLine.accountId);
           form.setValue("creditAccountId", firstLine.accountId);
           form.setValue("amount", firstLine.credit);
        } else {
          form.setValue("debitAccountId", '');
          form.setValue("creditAccountId", '');
          form.setValue("amount", undefined);
        }
      } else {
        form.setValue("debitAccountId", '');
        form.setValue("creditAccountId", '');
        form.setValue("amount", undefined);
      }
    }
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmitInternal)} className="space-y-6">
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
                <FormLabel>Belegnummer</FormLabel>
                <FormControl>
                    <Input placeholder="Fortlaufende Nummer" {...field} />
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
              <FormLabel>Beschreibung</FormLabel>
              <FormControl>
                <Textarea placeholder="Beschreibung der Buchung" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Tabs defaultValue={form.getValues("entryType")} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Einzelbuchung</TabsTrigger>
            <TabsTrigger value="batch">Sammelbuchung</TabsTrigger>
          </TabsList>
          
          <TabsContent value="single" className="pt-4 space-y-4">
            <FormField
              control={form.control}
              name="debitAccountId"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Soll-Konto</FormLabel>
                   <AccountAutocomplete options={accountOptions} value={field.value || ''} onChange={field.onChange} placeholder="Soll-Konto wählen..." />
                  <FormMessage />
                  </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="creditAccountId"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Haben-Konto</FormLabel>
                   <AccountAutocomplete options={accountOptions} value={field.value || ''} onChange={field.onChange} placeholder="Haben-Konto wählen..." />
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
                      <Input type="number" step="0.01" placeholder="0.00" {...field} 
                       onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                       value={field.value ?? ''}
                      />
                  </FormControl>
                  <FormMessage />
                  </FormItem>
              )}
            />
             {form.formState.errors.amount && <FormMessage>{form.formState.errors.amount.message}</FormMessage>}
          </TabsContent>

          <TabsContent value="batch" className="pt-4 space-y-4">
            <FormLabel>Buchungszeilen</FormLabel>
            {fields.map((item, index) => (
                <Card key={item.id} className="p-4 relative bg-background/50">
                    <CardContent className="p-0 space-y-3">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 text-muted-foreground hover:text-destructive z-10 h-7 w-7"
                            onClick={() => remove(index)}
                            disabled={fields.length <= 2 && (index === 0 || index === 1) } 
                        >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Zeile entfernen</span>
                        </Button>
                        
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
                        {form.formState.errors.lines?.[index]?.accountId?.message && (
                            <FormMessage className="text-xs">{form.formState.errors.lines?.[index]?.accountId?.message}</FormMessage>
                        )}
                    </CardContent>
                </Card>
            ))}
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ id: crypto.randomUUID(), accountId: '', debit: undefined, credit: undefined })}
                className="w-full"
            >
                <PlusCircle className="mr-2 h-4 w-4" /> Zeile hinzufügen
            </Button>
            {form.formState.errors.lines && typeof form.formState.errors.lines === 'object' && 'message' in form.formState.errors.lines && (
                <FormMessage>{form.formState.errors.lines.message}</FormMessage>
            )}
            {form.formState.errors.lines?.root?.message && <FormMessage>{form.formState.errors.lines.root.message}</FormMessage>}
          </TabsContent>
        </Tabs>

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
          {isSubmitting ? 'Speichern...' : buttonText}
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
          className="w-full justify-between font-normal h-9 text-xs" 
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

