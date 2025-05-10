
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CalendarIcon, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import type { Account, BudgetEntry, BudgetEntryFormValues, BudgetEntryType, BudgetRecurrence, NewBudgetEntryPayload } from '@/types';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useGetTenantChartOfAccountsById } from '@/hooks/useTenantChartOfAccounts';
import { useGetTenantById } from '@/hooks/useTenants';

const budgetEntryTypes: BudgetEntryType[] = ["Income", "Expense"];
const budgetRecurrences: BudgetRecurrence[] = ["None", "Monthly", "Bimonthly", "Quarterly", "EveryFourMonths", "Semiannually", "Yearly"];

const budgetRecurrenceLabels: Record<BudgetRecurrence, string> = {
  None: "Einmalig / Keine",
  Monthly: "Monatlich",
  Bimonthly: "Alle zwei Monate",
  Quarterly: "Quartalsweise (alle 3 Monate)",
  EveryFourMonths: "Alle vier Monate",
  Semiannually: "Halbjährlich",
  Yearly: "Jährlich",
};


const createBudgetEntryFormSchema = () => z.object({
  description: z.string().min(1, "Beschreibung ist erforderlich."),
  accountId: z.string().min(1, "Budgetkonto ist erforderlich."),
  counterAccountId: z.string().optional(),
  amountActual: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val),
    z.number().positive("Standardbetrag muss positiv sein.")
  ),
  amountBestCase: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '' ? parseFloat(val.replace(',', '.')) : (val === null || val === undefined ? null : val)),
    z.number().positive("Best-Case Betrag muss positiv sein.").nullable().optional()
  ),
  amountWorstCase: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '' ? parseFloat(val.replace(',', '.')) : (val === null || val === undefined ? null : val)),
    z.number().positive("Worst-Case Betrag muss positiv sein.").nullable().optional()
  ),
  type: z.enum(budgetEntryTypes, { required_error: "Typ ist erforderlich." }),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  isRecurring: z.boolean().default(false),
  recurrence: z.enum(budgetRecurrences).default('None'),
}).refine(data => {
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
        return false;
    }
    return true;
}, {
    message: "Enddatum muss nach dem Startdatum liegen.",
    path: ["endDate"],
}).refine(data => {
    if (data.isRecurring && data.recurrence === 'None') {
        return false;
    }
    return true;
}, {
    message: "Bei wiederkehrenden Einträgen muss eine Wiederholungsart gewählt werden.",
    path: ["recurrence"],
}).refine(data => {
    if (data.isRecurring && !data.startDate) {
        return false;
    }
    return true;
}, {
    message: "Startdatum ist für wiederkehrende Einträge erforderlich.",
    path: ["startDate"],
});

type FormValues = z.infer<ReturnType<typeof createBudgetEntryFormSchema>>;

interface BudgetEntryFormProps {
  budgetId: string;
  tenantId: string;
  onSubmit: (values: NewBudgetEntryPayload) => Promise<void>;
  isSubmitting?: boolean;
  initialData?: BudgetEntry | null;
}

interface AccountOption {
  value: string;
  label: string;
  account: Account;
}

export function BudgetEntryForm({ budgetId, tenantId, onSubmit, isSubmitting, initialData }: BudgetEntryFormProps) {
  const { data: tenant } = useGetTenantById(tenantId);
  const { data: chartOfAccounts, isLoading: isLoadingCoA } = useGetTenantChartOfAccountsById(tenant?.chartOfAccountsId);
  
  const formSchema = createBudgetEntryFormSchema();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? {
          description: initialData.description,
          accountId: initialData.accountId,
          counterAccountId: initialData.counterAccountId || '',
          amountActual: initialData.amountActual,
          amountBestCase: initialData.amountBestCase,
          amountWorstCase: initialData.amountWorstCase,
          type: initialData.type,
          startDate: initialData.startDate ? parseISO(initialData.startDate) : undefined,
          endDate: initialData.endDate ? parseISO(initialData.endDate) : undefined,
          isRecurring: initialData.isRecurring,
          recurrence: initialData.recurrence,
        }
      : {
          description: '',
          accountId: '',
          counterAccountId: '',
          amountActual: 0,
          amountBestCase: undefined,
          amountWorstCase: undefined,
          type: 'Expense',
          startDate: new Date(), 
          endDate: undefined,
          isRecurring: false,
          recurrence: 'None',
        },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        description: initialData.description,
        accountId: initialData.accountId,
        counterAccountId: initialData.counterAccountId || '',
        amountActual: initialData.amountActual,
        amountBestCase: initialData.amountBestCase,
        amountWorstCase: initialData.amountWorstCase,
        type: initialData.type,
        startDate: initialData.startDate ? parseISO(initialData.startDate) : undefined,
        endDate: initialData.endDate ? parseISO(initialData.endDate) : undefined,
        isRecurring: initialData.isRecurring,
        recurrence: initialData.recurrence,
      });
    }
  }, [initialData, form]);

  const pnlAccounts: AccountOption[] = React.useMemo(() => {
    if (!chartOfAccounts) return [];
    return chartOfAccounts.groups
      .filter(g => g.mainType === 'Revenue' || g.mainType === 'Expense')
      .flatMap(g => g.accounts.map(acc => ({ value: acc.id, label: `${acc.number} - ${acc.name}`, account: acc })))
      .sort((a,b) => a.label.localeCompare(b.label));
  }, [chartOfAccounts]);

  const balanceSheetAccounts: AccountOption[] = React.useMemo(() => {
     if (!chartOfAccounts) return [];
    return chartOfAccounts.groups
      .filter(g => g.mainType === 'Asset' || g.mainType === 'Liability' || g.mainType === 'Equity')
      .flatMap(g => g.accounts.map(acc => ({ value: acc.id, label: `${acc.number} - ${acc.name}`, account: acc })))
      .sort((a,b) => a.label.localeCompare(b.label));
  }, [chartOfAccounts]);


  const handleSubmitInternal = async (values: FormValues) => {
    const selectedAccount = pnlAccounts.find(opt => opt.value === values.accountId)?.account;
    const selectedCounterAccount = balanceSheetAccounts.find(opt => opt.value === values.counterAccountId)?.account;

    const payload: NewBudgetEntryPayload = {
      budgetId,
      description: values.description,
      accountId: values.accountId,
      accountNumber: selectedAccount?.number,
      accountName: selectedAccount?.name,
      counterAccountId: values.counterAccountId || undefined,
      counterAccountNumber: selectedCounterAccount?.number,
      counterAccountName: selectedCounterAccount?.name,
      amountActual: values.amountActual,
      amountBestCase: values.amountBestCase,
      amountWorstCase: values.amountWorstCase,
      type: values.type,
      startDate: values.startDate?.toISOString(),
      endDate: values.isRecurring && values.endDate ? values.endDate.toISOString() : undefined,
      isRecurring: values.isRecurring,
      recurrence: values.isRecurring ? values.recurrence : 'None',
    };
    await onSubmit(payload);
    if (!initialData) {
       form.reset({
          description: '',
          accountId: '',
          counterAccountId: '',
          amountActual: 0,
          amountBestCase: undefined,
          amountWorstCase: undefined,
          type: 'Expense',
          startDate: new Date(),
          endDate: undefined,
          isRecurring: false,
          recurrence: 'None',
       });
    }
  };
  
  const watchedIsRecurring = form.watch("isRecurring");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmitInternal)} className="space-y-6">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Beschreibung</FormLabel>
              <FormControl><Textarea placeholder="z.B. Monatliche Miete Server" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="accountId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Budgetkonto (Erfolgsrechnung)</FormLabel>
                    <AccountAutocomplete options={pnlAccounts} value={field.value} onChange={field.onChange} placeholder="Konto wählen..." isLoading={isLoadingCoA}/>
                <FormDescription className="text-xs">Das Hauptkonto für diesen Budgetposten (z.B. Miete, Lohn).</FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="counterAccountId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Gegenkonto (Bilanz, optional)</FormLabel>
                    <AccountAutocomplete options={balanceSheetAccounts} value={field.value} onChange={field.onChange} placeholder="Gegenkonto wählen..." isLoading={isLoadingCoA}/>
                <FormDescription className="text-xs">Woher das Geld kommt / wohin es fliesst (z.B. Bank).</FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <FormField
            control={form.control}
            name="amountActual"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Betrag Standard (CHF)</FormLabel>
                <FormControl><Input type="number" step="0.01" placeholder="100.00" {...field} /></FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="amountBestCase"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Betrag Best-Case (optional)</FormLabel>
                <FormControl><Input type="number" step="0.01" placeholder="z.B. 90.00" {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="amountWorstCase"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Betrag Worst-Case (optional)</FormLabel>
                <FormControl><Input type="number" step="0.01" placeholder="z.B. 110.00" {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        
        <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Typ</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                    {budgetEntryTypes.map(type => (
                        <SelectItem key={type} value={type}>{type === "Income" ? "Einnahme" : "Ausgabe"}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />

        <FormField
            control={form.control}
            name="isRecurring"
            render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                    <FormLabel>Wiederkehrender Eintrag?</FormLabel>
                </div>
                <FormControl>
                    <Switch checked={field.value} onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (!checked) {
                            form.setValue('recurrence', 'None');
                            form.setValue('endDate', undefined); 
                        } else {
                           if(form.getValues('recurrence') === 'None') form.setValue('recurrence', 'Monthly'); 
                        }
                    }} />
                </FormControl>
                </FormItem>
            )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>{watchedIsRecurring ? "Startdatum Wiederholung" : "Datum des Eintrags"}</FormLabel>
                    <Popover><PopoverTrigger asChild>
                    <FormControl>
                        <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "PPP", { locale: de }) : <span>Datum wählen</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </FormControl>
                    </PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={de} /></PopoverContent></Popover>
                    <FormMessage />
                    </FormItem>
                )}
            />
            {watchedIsRecurring && (
              <>
                <FormField
                    control={form.control}
                    name="recurrence"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Intervall</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!watchedIsRecurring}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                            {budgetRecurrences.map(rec => (
                                <SelectItem key={rec} value={rec} disabled={rec === 'None' && watchedIsRecurring}>
                                {budgetRecurrenceLabels[rec]}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Enddatum (optional)</FormLabel>
                        <Popover><PopoverTrigger asChild>
                        <FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={!watchedIsRecurring}>
                            {field.value ? format(field.value, "PPP", { locale: de }) : <span>Datum wählen</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={de} disabled={(date) => form.getValues("startDate") ? date < form.getValues("startDate")! : false} /></PopoverContent></Popover>
                         <FormDescription className="text-xs">Letzter Tag der Ausführung.</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />
              </>
            )}
        </div>
        <Button type="submit" disabled={isSubmitting || isLoadingCoA} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          {isSubmitting ? 'Speichern...' : (initialData ? 'Änderungen speichern' : 'Eintrag erstellen')}
        </Button>
      </form>
    </Form>
  );
}


interface AccountAutocompleteProps {
  options: AccountOption[];
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  isLoading?: boolean;
}

function AccountAutocomplete({ options, value, onChange, placeholder, isLoading }: AccountAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-9 text-sm"
          disabled={isLoading}
        >
          {isLoading ? "Lade Konten..." : (selectedOption ? selectedOption.label : placeholder || "Konto wählen...")}
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

    