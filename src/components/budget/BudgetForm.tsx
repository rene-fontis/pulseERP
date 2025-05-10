
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { Budget, BudgetFormValues } from '@/types';

// Scenario removed from main budget entity
const formSchema = z.object({
  name: z.string().min(2, "Budgetname muss mindestens 2 Zeichen lang sein."),
  description: z.string().optional(),
});

interface BudgetFormProps {
  onSubmit: (values: BudgetFormValues) => Promise<void>;
  initialData?: Budget | null;
  isSubmitting?: boolean;
}

export function BudgetForm({ onSubmit, initialData, isSubmitting }: BudgetFormProps) {
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          description: initialData.description || '',
        }
      : {
          name: '',
          description: '',
        },
  });

  const handleSubmit = async (values: BudgetFormValues) => {
    await onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Budgetname</FormLabel>
              <FormControl>
                <Input placeholder="z.B. Marketing Q3" {...field} />
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
                <Textarea placeholder="Kurze Beschreibung des Budgets" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Scenario Select removed */}
        <Button type="submit" disabled={isSubmitting} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          {isSubmitting ? 'Speichern...' : (initialData ? 'Änderungen speichern' : 'Budget erstellen')}
        </Button>
      </form>
    </Form>
  );
}

    