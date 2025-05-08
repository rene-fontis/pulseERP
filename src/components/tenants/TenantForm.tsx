"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { Tenant } from '@/types';

const formSchema = z.object({
  name: z.string().min(2, { message: "Mandantenname muss mindestens 2 Zeichen lang sein." }),
});

type TenantFormValues = z.infer<typeof formSchema>;

interface TenantFormProps {
  onSubmit: (values: TenantFormValues) => void;
  initialData?: Tenant | null;
  isSubmitting?: boolean;
}

export function TenantForm({ onSubmit, initialData, isSubmitting }: TenantFormProps) {
  const form = useForm<TenantFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? { name: initialData.name } : { name: '' },
  });

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
        <Button type="submit" disabled={isSubmitting} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          {isSubmitting ? 'Speichern...' : (initialData ? 'Änderungen speichern' : 'Mandant erstellen')}
        </Button>
      </form>
    </Form>
  );
}
