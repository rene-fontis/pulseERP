"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import type { TaxRate } from '@/types';

const taxRateFormSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich."),
  rate: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val),
    z.number().min(0, "Steuersatz muss null oder positiv sein.").max(100, "Steuersatz darf nicht über 100% liegen.")
  ),
  isDefault: z.boolean().default(false),
});

export type TaxRateFormValues = z.infer<typeof taxRateFormSchema>;

interface TaxRateFormProps {
  onSubmit: (values: TaxRateFormValues) => void;
  initialData?: TaxRate | null;
  isSubmitting?: boolean;
}

export function TaxRateForm({ onSubmit, initialData, isSubmitting }: TaxRateFormProps) {
  const form = useForm<TaxRateFormValues>({
    resolver: zodResolver(taxRateFormSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          rate: initialData.rate,
          isDefault: initialData.isDefault || false,
        }
      : {
          name: '',
          rate: 0, // Default to 0 or a common rate like 7.7
          isDefault: false,
        },
  });

  React.useEffect(() => {
    if (initialData) {
        form.reset({
            name: initialData.name,
            rate: initialData.rate,
            isDefault: initialData.isDefault || false,
        });
    }
  }, [initialData, form]);


  const handleSubmit = (values: TaxRateFormValues) => {
    onSubmit(values);
     if (!initialData) {
      form.reset({
        name: '',
        rate: 0,
        isDefault: false,
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name des Steuersatzes</FormLabel>
              <FormControl>
                <Input placeholder="z.B. Normalsatz, Reduzierter Satz" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="rate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Steuersatz (%)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="z.B. 7.7" {...field} />
              </FormControl>
              <FormDescription>Geben Sie den Wert als Prozentzahl ein (z.B. 7.7 für 7.7%).</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isDefault"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Standardsteuersatz?</FormLabel>
                <FormDescription>
                  Dieser Steuersatz wird standardmässig verwendet, wenn kein anderer gewählt wird.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          {isSubmitting ? 'Speichern...' : (initialData ? 'Änderungen speichern' : 'Steuersatz hinzufügen')}
        </Button>
      </form>
    </Form>
  );
}