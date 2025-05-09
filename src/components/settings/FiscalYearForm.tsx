"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import type { FiscalYearFormValues } from '@/types';

// Client-side form values will use Date objects
export type FiscalYearFormValuesClient = {
  name: string;
  startDate: Date;
  endDate: Date;
};

const formSchema = z.object({
  name: z.string().min(2, "Name muss mindestens 2 Zeichen lang sein."),
  startDate: z.date({ required_error: "Startdatum ist erforderlich." }),
  endDate: z.date({ required_error: "Enddatum ist erforderlich." }),
}).refine(data => data.endDate > data.startDate, {
  message: "Enddatum muss nach dem Startdatum liegen.",
  path: ["endDate"], // Path to the field to attach the error to
});


interface FiscalYearFormProps {
  onSubmit: (values: FiscalYearFormValuesClient) => Promise<void>;
  initialData?: FiscalYearFormValuesClient | null;
  isSubmitting?: boolean;
}

export function FiscalYearForm({ onSubmit, initialData, isSubmitting }: FiscalYearFormProps) {
  const form = useForm<FiscalYearFormValuesClient>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData 
      ? { 
          name: initialData.name, 
          startDate: initialData.startDate ? new Date(initialData.startDate) : new Date(),
          endDate: initialData.endDate ? new Date(initialData.endDate) : new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        } 
      : { 
          name: `Geschäftsjahr ${new Date().getFullYear()}`, 
          startDate: new Date(new Date().getFullYear(), 0, 1), // Default to Jan 1st of current year
          endDate: new Date(new Date().getFullYear(), 11, 31), // Default to Dec 31st of current year
        },
  });

  const handleSubmit = async (values: FiscalYearFormValuesClient) => {
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
              <FormLabel>Name des Geschäftsjahres</FormLabel>
              <FormControl>
                <Input placeholder="z.B. 2024 oder GJ 23/24" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Startdatum</FormLabel>
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
          name="endDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Enddatum</FormLabel>
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
                    disabled={(date) =>
                        form.getValues("startDate") ? date <= form.getValues("startDate") : false
                    }
                    initialFocus
                    locale={de}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={isSubmitting} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          {isSubmitting ? 'Speichern...' : (initialData ? 'Änderungen speichern' : 'Geschäftsjahr erstellen')}
        </Button>
      </form>
    </Form>
  );
}