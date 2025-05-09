"use client";

import React, {useEffect, useMemo} from 'react';
import { useForm, useFieldArray, type UseFormReturn, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { ChartOfAccountsTemplate, AccountGroupTemplate, AccountTemplate } from '@/types'; 
import { PlusCircle, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export type ChartOfAccountsTemplateFormValues = Omit<ChartOfAccountsTemplate, 'id' | 'createdAt' | 'updatedAt'>;

const fixedGroupIdsSeed = { 
  asset: 'form_fixed_asset_group',
  liability: 'form_fixed_liability_group',
  equity: 'form_fixed_equity_group',
  revenue: 'form_fixed_revenue_group',
  expense: 'form_fixed_expense_group',
};

const getDefaultFixedGroups = (): AccountGroupTemplate[] => [
  { id: fixedGroupIdsSeed.asset, name: "Aktiven", mainType: "Asset", accounts: [], isFixed: true, parentId: null, level: 0 },
  { id: fixedGroupIdsSeed.liability, name: "Passiven", mainType: "Liability", accounts: [], isFixed: true, parentId: null, level: 0 },
  { id: fixedGroupIdsSeed.equity, name: "Eigenkapital", mainType: "Equity", accounts: [
      { id: crypto.randomUUID(), number: "2979", name: "Laufender Gewinn/Verlust", description: "Ergebnis des Geschäftsjahres. Systemkonto.", isSystemAccount: true },
    ], isFixed: true, parentId: null, level: 0 },
  { id: fixedGroupIdsSeed.revenue, name: "Ertrag", mainType: "Revenue", accounts: [], isFixed: true, parentId: null, level: 0 },
  { id: fixedGroupIdsSeed.expense, name: "Aufwand", mainType: "Expense", accounts: [], isFixed: true, parentId: null, level: 0 },
];

const accountTemplateSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  number: z.string().min(1, "Kontonummer ist erforderlich."),
  name: z.string().min(1, "Kontoname ist erforderlich."),
  description: z.string().optional().default(''),
  isSystemAccount: z.boolean().optional().default(false),
});

const accountGroupTemplateSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  name: z.string().min(1, "Gruppenname ist erforderlich."),
  mainType: z.enum(['Asset', 'Liability', 'Expense', 'Revenue', 'Equity'], { required_error: "Haupttyp ist erforderlich." }),
  accounts: z.array(accountTemplateSchema).default([]),
  isFixed: z.boolean().optional().default(false),
  parentId: z.string().nullable().optional().default(null),
  level: z.number().optional().default(0),
  fieldId: z.string().optional(), // For useFieldArray key compatibility if source data has it
});

const formSchema = z.object({
  name: z.string().min(2, "Vorlagename muss mindestens 2 Zeichen lang sein."),
  description: z.string().optional().default(''),
  groups: z.array(accountGroupTemplateSchema).min(5, "Mindestens 5 Hauptgruppen sind erforderlich (Aktiven, Passiven, Eigenkapital, Ertrag, Aufwand).")
    .refine(
      (groups) => {
        const fixedTypes: AccountGroupTemplate['mainType'][] = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
        const presentFixedTypes = groups.filter(g => g.isFixed).map(g => g.mainType);
        return fixedTypes.every(ft => presentFixedTypes.includes(ft));
      }, 
      { message: "Alle 5 fixen Hauptgruppen (Aktiven, Passiven, Eigenkapital, Ertrag, Aufwand) müssen vorhanden sein."}
    ),
});


interface ChartOfAccountsTemplateFormProps {
  onSubmit: (values: ChartOfAccountsTemplateFormValues) => Promise<void>;
  initialData?: ChartOfAccountsTemplate | null;
  isSubmitting?: boolean;
}

export function ChartOfAccountsTemplateForm({ onSubmit, initialData, isSubmitting }: ChartOfAccountsTemplateFormProps) {
  
  const mergedInitialGroups = useMemo(() => {
    const defaultFixed = getDefaultFixedGroups();
    if (!initialData || !initialData.groups || initialData.groups.length === 0) {
      return defaultFixed;
    }

    let processedGroups = [...initialData.groups];

    defaultFixed.forEach(dfg => {
      const existing = processedGroups.find(g => g.id === dfg.id || (g.isFixed && g.mainType === dfg.mainType));
      if (existing) {
        existing.isFixed = true;
        existing.level = 0;
        existing.parentId = null;
        existing.name = dfg.name; 
        existing.mainType = dfg.mainType; 
        if (dfg.mainType === 'Equity' && !existing.accounts.some(acc => acc.isSystemAccount)) {
          const profitLossAccount = dfg.accounts.find(acc => acc.isSystemAccount);
          if (profitLossAccount) existing.accounts.push({...profitLossAccount, id: crypto.randomUUID() });
        }

      } else {
        processedGroups.push({ ...dfg, id: dfg.id || crypto.randomUUID() });
      }
    });
    
    return processedGroups.map(g => ({
      ...g,
      id: g.id || crypto.randomUUID(),
      accounts: g.accounts.map(a => ({ ...a, id: a.id || crypto.randomUUID() }))
    }));

  }, [initialData]);


  const form = useForm<ChartOfAccountsTemplateFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData 
      ? { 
          name: initialData.name, 
          description: initialData.description || '',
          groups: mergedInitialGroups
        } 
      : { 
          name: '', 
          description: '', 
          groups: getDefaultFixedGroups().map(g => ({...g, id: g.id || crypto.randomUUID()})) 
        },
  });

  const { fields: groupFields, append: appendGroup, remove: removeGroup } = useFieldArray({
    control: form.control,
    name: "groups",
    keyName: "fieldId" 
  });
  
  useEffect(() => {
    if (initialData) {
        form.reset({
            name: initialData.name,
            description: initialData.description || '',
            groups: mergedInitialGroups
        });
    } else {
        form.reset({
            name: '',
            description: '',
            groups: getDefaultFixedGroups().map(g => ({...g, id: g.id || crypto.randomUUID()}))
        });
    }
  }, [initialData, form, mergedInitialGroups]);


  const handleSubmit = async (values: ChartOfAccountsTemplateFormValues) => {
    const equityGroup = values.groups.find(g => g.mainType === 'Equity' && g.isFixed);
    if (equityGroup && !equityGroup.accounts.some(acc => acc.isSystemAccount)) {
        equityGroup.accounts.push({
            id: crypto.randomUUID(),
            number: "2979",
            name: "Laufender Gewinn/Verlust",
            description: "Ergebnis des Geschäftsjahres. Systemkonto.",
            isSystemAccount: true
        });
    }
    await onSubmit(values);
  };

  const watchedGroups = form.watch("groups");

  const renderGroup = (
    groupField: AccountGroupTemplate & { fieldId: string },
    groupIndexInForm: number,
    level: number = 0
  ) => {
    const isFixedGroup = groupField.isFixed;
    
    const childSubgroupFields = watchedGroups.filter(
      (gf) => gf.parentId === groupField.id && !gf.isFixed
    );
    
    const childSubgroupOriginalIndices = childSubgroupFields.map(
        subGField => groupFields.findIndex(originalField => originalField.fieldId === subGField.fieldId)
    ).filter(index => index !== -1);


    return (
      <Card key={groupField.fieldId} className={cn("p-4 relative bg-background/50", level > 0 && "ml-4 mt-3")}>
        {!isFixedGroup && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 text-muted-foreground hover:text-destructive z-10 h-7 w-7"
            onClick={() => removeGroup(groupIndexInForm)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Gruppe entfernen</span>
          </Button>
        )}
        <CardHeader className="p-0 mb-2">
          <CardTitle className="text-lg">{groupField.name} {/* Removed: {isFixedGroup ? `(${groupField.mainType})` : ''} */} </CardTitle>
          {isFixedGroup && <FormDescription>Fixe Hauptgruppe. Untergruppen können hinzugefügt werden.</FormDescription>}
        </CardHeader>
        <CardContent className="p-0 space-y-3">
          {!isFixedGroup && (
            <>
              <FormField
                control={form.control}
                name={`groups.${groupIndexInForm}.name`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name der Untergruppe</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. Umlaufvermögen" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
          
          {level === 1 && ( // Only show accounts field for level 1 subgroups
            <AccountsArrayField control={form.control} groupIndex={groupIndexInForm} form={form} isFixedGroup={!!isFixedGroup}/>
          )}
          
          {level === 0 && childSubgroupOriginalIndices.length > 0 && (
            <div className="ml-0 mt-4 space-y-3 pt-3 border-t">
              {childSubgroupOriginalIndices.map(subGOriginalIndex => {
                const subGField = groupFields[subGOriginalIndex];
                return renderGroup(subGField as AccountGroupTemplate & { fieldId: string }, subGOriginalIndex, 1);
              })}
            </div>
          )}

          {isFixedGroup && level === 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={() => {
                appendGroup({
                  id: crypto.randomUUID(),
                  name: 'Neue Untergruppe',
                  mainType: groupField.mainType, 
                  accounts: [],
                  isFixed: false,
                  parentId: groupField.id,
                  level: 1
                } as AccountGroupTemplate);
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Untergruppe zu "{groupField.name}" hinzufügen
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <ScrollArea className="h-[calc(90vh-220px)] pr-4"> 
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vorlagename</FormLabel>
                  <FormControl>
                    <Input placeholder="z.B. KMU Schweiz Standard" {...field} />
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
                  <FormLabel>Beschreibung (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Kurze Beschreibung der Vorlage" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Kontenplan Struktur</FormLabel>
              <FormDescription>Definieren Sie Hauptgruppen und deren Untergruppen/Konten.</FormDescription>
              {form.formState.errors.groups?.message && <FormMessage>{form.formState.errors.groups.message}</FormMessage>}
              {form.formState.errors.groups?.root?.message && <FormMessage>{form.formState.errors.groups.root.message}</FormMessage>}

              <div className="space-y-4 mt-2">
                {groupFields
                  .filter((groupFieldItem) => groupFieldItem.level === 0 && groupFieldItem.isFixed)
                  .map((groupFieldItem) => {
                    const originalIndex = groupFields.findIndex(item => item.fieldId === groupFieldItem.fieldId);
                    if (originalIndex === -1) return null;
                    return renderGroup(groupFieldItem, originalIndex, 0);
                })}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="pt-6 border-t mt-auto"> 
          <Button type="submit" disabled={isSubmitting} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            {isSubmitting ? 'Speichern...' : (initialData ? 'Änderungen speichern' : 'Vorlage erstellen')}
          </Button>
        </div>
      </form>
    </Form>
  );
}


interface AccountsArrayFieldProps {
  control: ReturnType<typeof useForm<ChartOfAccountsTemplateFormValues>>['control'];
  groupIndex: number;
  form: UseFormReturn<ChartOfAccountsTemplateFormValues>;
  isFixedGroup: boolean; 
}

function AccountsArrayField({ control, groupIndex, form, isFixedGroup }: AccountsArrayFieldProps) { 
  const { fields, append, remove } = useFieldArray({
    control,
    name: `groups.${groupIndex}.accounts`,
    keyName: "accountFieldId"
  });

  if (isFixedGroup) { 
    const groupData = form.getValues(`groups.${groupIndex}`);
    if (groupData.mainType === 'Equity' && groupData.isFixed) {
        const systemAccountField = fields.find(f => {
            const accountData = form.getValues(`groups.${groupIndex}.accounts.${fields.indexOf(f)}`);
            return accountData && accountData.isSystemAccount;
        });
        if (systemAccountField) {
            const systemAccountIndex = fields.indexOf(systemAccountField);
             return (
                 <div className="space-y-3 pl-4 border-l border-border">
                     <FormLabel className="text-base">Systemkonten</FormLabel>
                     <Card key={systemAccountField.accountFieldId} className="p-3 bg-muted/30 relative">
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                             <FormField
                                 control={control}
                                 name={`groups.${groupIndex}.accounts.${systemAccountIndex}.number`}
                                 render={({ field }) => (
                                     <FormItem><FormLabel className="text-xs">Nr.</FormLabel><FormControl><Input {...field} className="h-8 text-sm" disabled /></FormControl></FormItem>
                                 )} />
                             <FormField
                                 control={control}
                                 name={`groups.${groupIndex}.accounts.${systemAccountIndex}.name`}
                                 render={({ field }) => (
                                     <FormItem><FormLabel className="text-xs">Name</FormLabel><FormControl><Input {...field} className="h-8 text-sm" disabled /></FormControl></FormItem>
                                 )} />
                         </div>
                         <FormField
                             control={control}
                             name={`groups.${groupIndex}.accounts.${systemAccountIndex}.description`}
                             render={({ field }) => (
                                 <FormItem className="mt-2"><FormLabel className="text-xs">Beschreibung</FormLabel><FormControl><Input {...field} className="h-8 text-sm" disabled /></FormControl></FormItem>
                             )} />
                         <p className="text-xs text-muted-foreground mt-1">Systemkonto, nicht bearbeitbar.</p>
                     </Card>
                 </div>
             );
        }
    }
    return null;
  }


  return (
    <div className="space-y-3 pl-4 border-l border-border">
      <FormLabel className="text-base">Konten in dieser Untergruppe</FormLabel>
      {fields.map((accountItem, accountIndex) => {
         const isSystemAcc = form.getValues(`groups.${groupIndex}.accounts.${accountIndex}.isSystemAccount`);
        return (
        <Card key={accountItem.accountFieldId} className="p-3 bg-muted/30 relative">
           <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 text-muted-foreground hover:text-destructive h-6 w-6 z-10"
              onClick={() => remove(accountIndex)}
              disabled={isSystemAcc}
            >
              <Trash2 className="h-3 w-3" />
              <span className="sr-only">Konto entfernen</span>
            </Button>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              control={control}
              name={`groups.${groupIndex}.accounts.${accountIndex}.number`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Nr.</FormLabel>
                  <FormControl>
                    <Input placeholder="1000" {...field} className="h-8 text-sm" disabled={isSystemAcc} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`groups.${groupIndex}.accounts.${accountIndex}.name`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Kasse" {...field} className="h-8 text-sm" disabled={isSystemAcc} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={control}
            name={`groups.${groupIndex}.accounts.${accountIndex}.description`}
            render={({ field }) => (
              <FormItem className="mt-2">
                <FormLabel className="text-xs">Beschreibung (opt.)</FormLabel>
                <FormControl>
                  <Input placeholder="Details zum Konto" {...field} className="h-8 text-sm" disabled={isSystemAcc} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           {isSystemAcc && (
             <p className="text-xs text-muted-foreground mt-1">Systemkonto, nicht vollständig bearbeitbar.</p>
           )}
        </Card>
      )})}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ id: crypto.randomUUID(), number: '', name: '', description: '', isSystemAccount: false })}
        className="w-full mt-2"
      >
        <PlusCircle className="mr-2 h-4 w-4" /> Konto zu dieser Untergruppe hinzufügen
      </Button>
    </div>
  );
}


