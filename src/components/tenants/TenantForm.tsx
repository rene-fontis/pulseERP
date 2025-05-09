
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tenant } from '@/types';
import { useGetChartOfAccountsTemplates } from '@/hooks/useChartOfAccountsTemplates';
import { Skeleton } from '../ui/skeleton';

const NO_TEMPLATE_VALUE = "NO_TEMPLATE_SELECTED_INTERNAL_VALUE";

const formSchema = z.object({
  name: z.string().min(2, { message: "Mandantenname muss mindestens 2 Zeichen lang sein." }),
  chartOfAccountsTemplateId: z.string().optional(),
});

export type TenantFormValues = z.infer<typeof formSchema>;

interface TenantFormProps {
  onSubmit: (values: TenantFormValues) => void;
  initialData?: Tenant | null;
  isSubmitting?: boolean;
}

export function TenantForm({ onSubmit, initialData, isSubmitting }: TenantFormProps) {
  const { data: templates, isLoading: isLoadingTemplates } = useGetChartOfAccountsTemplates();
  
  const form = useForm<TenantFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData 
      ? { name: initialData.name, chartOfAccountsTemplateId: initialData.chartOfAccountsTemplateId || '' } 
      : { name: '', chartOfAccountsTemplateId: '' },
  });

  React.useEffect(() => {
    if (initialData) {
        form.reset({
            name: initialData.name,
            chartOfAccountsTemplateId: initialData.chartOfAccountsTemplateId || ''
        });
    }
  }, [initialData, form]);


  const handleSubmit = (values: TenantFormValues) => {
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mandantenname</FormLabel>
              <FormControl>
                <Input placeholder="Mandantenname eingeben" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!initialData && ( // Only show template selection on create
            <FormField
            control={form.control}
            name="chartOfAccountsTemplateId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Kontenplan Vorlage (optional)</FormLabel>
                {isLoadingTemplates ? (
                    <Skeleton className="h-10 w-full" />
                ) : (
                    <Select 
                        onValueChange={(value) => field.onChange(value === NO_TEMPLATE_VALUE ? '' : value)} 
                        defaultValue={field.value || undefined}
                    >
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Standardvorlage wählen..." />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value={NO_TEMPLATE_VALUE}>Keine Vorlage (leerer Kontenplan)</SelectItem>
                        {templates?.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                            {template.name}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                )}
                <FormMessage />
                </FormItem>
            )}
            />
        )}

        <Button type="submit" disabled={isSubmitting || isLoadingTemplates} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          {isSubmitting ? 'Speichern...' : (initialData ? 'Änderungen speichern' : 'Mandant erstellen')}
        </Button>
      </form>
    </Form>
  );
}

