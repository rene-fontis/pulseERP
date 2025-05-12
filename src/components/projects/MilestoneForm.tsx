"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import type { Milestone, MilestoneFormValues } from "@/types";

const milestoneFormSchema = z.object({
  name: z.string().min(1, "Name des Meilensteins ist erforderlich."),
  description: z.string().optional(),
  dueDate: z.date().nullable().optional(),
  completed: z.boolean().default(false),
});

interface MilestoneFormProps {
  onSubmit: (values: MilestoneFormValues) => Promise<void>;
  initialData?: Milestone | null;
  isSubmitting?: boolean;
}

export function MilestoneForm({ onSubmit, initialData, isSubmitting }: MilestoneFormProps) {
  const form = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneFormSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          description: initialData.description || "",
          dueDate: initialData.dueDate ? parseISO(initialData.dueDate) : null,
          completed: initialData.completed || false,
        }
      : {
          name: "",
          description: "",
          dueDate: null,
          completed: false,
        },
  });

  const handleSubmitInternal = async (values: MilestoneFormValues) => {
    await onSubmit(values);
     if (!initialData) { // Reset form only if it was a create operation
      form.reset({
        name: "",
        description: "",
        dueDate: null,
        completed: false,
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmitInternal)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name*</FormLabel>
              <FormControl><Input placeholder="z.B. Konzeptphase abgeschlossen" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Beschreibung</FormLabel>
              <FormControl><Textarea placeholder="Details zum Meilenstein" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fälligkeitsdatum (optional)</FormLabel>
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
        <FormField
          control={form.control}
          name="completed"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Erledigt</FormLabel>
              </div>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          {isSubmitting ? "Speichern..." : initialData ? "Änderungen speichern" : "Meilenstein erstellen"}
        </Button>
      </form>
    </Form>
  );
}