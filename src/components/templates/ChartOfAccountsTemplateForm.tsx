"use client";

import React, {useEffect} from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { ChartOfAccountsTemplate, AccountGroupTemplate } from '@/types'; // ChartOfAccountsTemplateFormValues removed
import { PlusCircle, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

// Re-define form values type locally if not exporting from types/index.ts
export type ChartOfAccountsTemplateFormValues = Omit<ChartOfAccountsTemplate, 'id' | 'createdAt' | 'updatedAt'>;


const accountTemplateSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  number: z.string().min(1, "Kontonummer ist erforderlich."),
  name: z.string().min(1, "Kontoname ist erforderlich."),
  description: z.string().optional().default(''),
});

const accountGroupTemplateSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  name: z.string().min(1, "Gruppenname ist erforderlich."),
  mainType: z.enum(['Asset', 'Liability', 'Expense', 'Revenue'], { required_error: "Haupttyp ist erforderlich." }),
  accounts: z.array(accountTemplateSchema).default([]),
});

const formSchema = z.object({
  name: z.string().min(2, "Vorlagename muss mindestens 2 Zeichen lang sein."),
  description: z.string().optional().default(''),
  groups: z.array(accountGroupTemplateSchema).min(1, "Mindestens eine Kontengruppe ist erforderlich.").default([{ id: crypto.randomUUID(), name: '', mainType: 'Asset', accounts: [] }]),
});


interface ChartOfAccountsTemplateFormProps {
  onSubmit: (values: ChartOfAccountsTemplateFormValues) => Promise<void>;
  initialData?: ChartOfAccountsTemplate | null;
  isSubmitting?: boolean;
}

const mainTypeOptions: { value: AccountGroupTemplate['mainType']; label: string }[] = [
  { value: 'Asset', label: 'Aktiven (Asset)' },
  { value: 'Liability', label: 'Passiven (Liability)' },
  { value: 'Expense', label: 'Aufwand (Expense)' },
  { value: 'Revenue', label: 'Ertrag (Revenue)' },
];

export function ChartOfAccountsTemplateForm({ onSubmit, initialData, isSubmitting }: ChartOfAccountsTemplateFormProps) {
  const form = useForm<ChartOfAccountsTemplateFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData 
      ? { 
          name: initialData.name, 
          description: initialData.description || '',
          groups: initialData.groups.map(g => ({
            ...g,
            id: g.id || crypto.randomUUID(), // Ensure IDs
            accounts: g.accounts.map(a => ({...a, id: a.id || crypto.randomUUID()})) 
          }))
        } 
      : { name: '', description: '', groups: [{ id: crypto.randomUUID(), name: 'Gruppe 1', mainType: 'Asset', accounts: [{id: crypto.randomUUID(), number: '1000', name: 'Kasse', description: ''}] }] },
  });

  const { fields: groupFields, append: appendGroup, remove: removeGroup } = useFieldArray({
    control: form.control,
    name: "groups",
  });
  
  useEffect(() => {
    if (initialData) {
        form.reset({
            name: initialData.name,
            description: initialData.description || '',
            groups: initialData.groups.map(g => ({
                ...g,
                id: g.id || crypto.randomUUID(),
                accounts: g.accounts.map(a => ({
                    ...a,
                    id: a.id || crypto.randomUUID(),
                    description: a.description || ''
                }))
            }))
        });
    }
  }, [initialData, form]);


  const handleSubmit = async (values: ChartOfAccountsTemplateFormValues) => {
    await onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <ScrollArea className="h-[calc(90vh-220px)] pr-4"> {/* Adjusted height */}
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
              <FormLabel>Kontengruppen</FormLabel>
              <FormDescription>Definieren Sie Hauptgruppen und deren Konten.</FormDescription>
              {form.formState.errors.groups?.message && <FormMessage>{form.formState.errors.groups.message}</FormMessage>}
              {form.formState.errors.groups?.root?.message && <FormMessage>{form.formState.errors.groups.root.message}</FormMessage>}

              <div className="space-y-4 mt-2">
                {groupFields.map((groupItem, groupIndex) => (
                  <Card key={groupItem.id} className="p-4 relative bg-background/50">
                     <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 text-muted-foreground hover:text-destructive z-10"
                        onClick={() => removeGroup(groupIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Gruppe entfernen</span>
                      </Button>
                    <CardHeader className="p-0 mb-4">
                      <CardTitle className="text-lg">Gruppe {groupIndex + 1}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 space-y-4">
                      <FormField
                        control={form.control}
                        name={`groups.${groupIndex}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name der Gruppe</FormLabel>
                            <FormControl>
                              <Input placeholder="z.B. Umlaufvermögen" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`groups.${groupIndex}.mainType`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Haupttyp</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Haupttyp wählen" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {mainTypeOptions.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <AccountsArrayField control={form.control} groupIndex={groupIndex} />

                    </CardContent>
                  </Card>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => appendGroup({ id: crypto.randomUUID(), name: '', mainType: 'Asset', accounts: [] })}
                  className="w-full"
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Kontengruppe hinzufügen
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="pt-6 border-t mt-auto"> {/* Ensure this is at the bottom */}
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
}

function AccountsArrayField({ control, groupIndex }: AccountsArrayFieldProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `groups.${groupIndex}.accounts`,
  });

  return (
    <div className="space-y-3 pl-4 border-l border-border">
      <FormLabel className="text-base">Konten</FormLabel>
      {fields.map((accountItem, accountIndex) => (
        <Card key={accountItem.id} className="p-3 bg-muted/30 relative">
           <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 text-muted-foreground hover:text-destructive h-6 w-6 z-10"
              onClick={() => remove(accountIndex)}
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
                    <Input placeholder="1000" {...field} className="h-8 text-sm" />
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
                    <Input placeholder="Kasse" {...field} className="h-8 text-sm" />
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
                  <Input placeholder="Details zum Konto" {...field} className="h-8 text-sm" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Card>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ id: crypto.randomUUID(), number: '', name: '', description: '' })}
        className="w-full mt-2"
      >
        <PlusCircle className="mr-2 h-4 w-4" /> Konto hinzufügen
      </Button>
    </div>
  );
}
