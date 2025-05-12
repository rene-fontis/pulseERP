
"use client";

import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import type { Project, NewProjectPayload, Contact, ProjectStatus, ProjectFormValues } from "@/types";
import { projectStatusLabels } from "@/types"; // Import projectStatusLabels
import { useGetContacts } from "@/hooks/useContacts";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';


const projectFormZodSchema = z.object({
  name: z.string().min(1, "Projektname ist erforderlich."),
  description: z.string().optional(),
  contactId: z.string().nullable().optional(),
  startDate: z.date().nullable().optional(),
  endDate: z.date().nullable().optional(),
  status: z.enum(['Active', 'Archived', 'Completed', 'OnHold', 'Cancelled']),
}).refine(data => {
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
        return false;
    }
    return true;
}, {
    message: "Enddatum muss nach oder am Startdatum liegen.",
    path: ["endDate"],
});


interface ProjectFormProps {
  tenantId: string;
  onSubmit: (values: ProjectFormValues) => Promise<void>;
  initialData?: Project | null;
  isSubmitting?: boolean;
}

interface ContactOption {
  value: string;
  label: string;
}

export function ProjectForm({ tenantId, onSubmit, initialData, isSubmitting }: ProjectFormProps) {
  const { data: contacts, isLoading: isLoadingContacts } = useGetContacts(tenantId);

  const contactOptions: ContactOption[] = React.useMemo(() => {
    if (!contacts) return [];
    return contacts.map(c => ({ value: c.id, label: c.companyName ? `${c.companyName} (${c.firstName} ${c.name})` : `${c.firstName} ${c.name}` }));
  }, [contacts]);
  
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormZodSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          description: initialData.description || "",
          contactId: initialData.contactId || null,
          startDate: initialData.startDate ? parseISO(initialData.startDate) : null,
          endDate: initialData.endDate ? parseISO(initialData.endDate) : null,
          status: initialData.status || 'Active',
        }
      : {
          name: "",
          description: "",
          contactId: null,
          startDate: null,
          endDate: null,
          status: 'Active',
        },
  });

   useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        description: initialData.description || "",
        contactId: initialData.contactId || null,
        startDate: initialData.startDate ? parseISO(initialData.startDate) : null,
        endDate: initialData.endDate ? parseISO(initialData.endDate) : null,
        status: initialData.status || 'Active',
      });
    }
  }, [initialData, form]);

  const handleSubmitInternal = async (values: ProjectFormValues) => {
    await onSubmit(values);
    if (!initialData) { // Reset form only if it was a create operation
      form.reset({
          name: "",
          description: "",
          contactId: null,
          startDate: null,
          endDate: null,
          status: 'Active',
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
              <FormLabel>Projektname*</FormLabel>
              <FormControl><Input placeholder="z.B. Website Relaunch" {...field} /></FormControl>
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
              <FormControl><Textarea placeholder="Detaillierte Beschreibung des Projekts" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contactId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kunde (optional)</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn("w-full justify-between font-normal", !field.value && "text-muted-foreground")}
                      disabled={isLoadingContacts}
                    >
                      {isLoadingContacts ? "Lade Kunden..." : (field.value ? contactOptions.find(c => c.value === field.value)?.label : "Kunde wählen")}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Kunde suchen..." />
                    <CommandList>
                      <CommandEmpty>Kein Kunde gefunden.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem onSelect={() => field.onChange(null)}>
                           <Check className={cn("mr-2 h-4 w-4", field.value === null ? "opacity-100" : "opacity-0")} />
                           (Kein Kunde)
                        </CommandItem>
                        {contactOptions.map((option) => (
                          <CommandItem
                            value={option.label}
                            key={option.value}
                            onSelect={() => field.onChange(option.value)}
                          >
                            <Check className={cn("mr-2 h-4 w-4", option.value === field.value ? "opacity-100" : "opacity-0")} />
                            {option.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                <FormLabel>Startdatum (optional)</FormLabel>
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
            name="endDate"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                <FormLabel>Enddatum (optional)</FormLabel>
                <Popover><PopoverTrigger asChild>
                <FormControl>
                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                    {field.value ? format(field.value, "PPP", { locale: de }) : <span>Datum wählen</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                </FormControl>
                </PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={de} disabled={(date) => form.getValues("startDate") ? date < form.getValues("startDate")! : false} /></PopoverContent></Popover>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                    {(Object.keys(projectStatusLabels) as Array<keyof typeof projectStatusLabels>).map(statusKey => (
                        <SelectItem key={statusKey} value={statusKey}>{projectStatusLabels[statusKey]}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
        />
        <Button type="submit" disabled={isSubmitting || isLoadingContacts} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          {isSubmitting ? "Speichern..." : initialData ? "Änderungen speichern" : "Projekt erstellen"}
        </Button>
      </form>
    </Form>
  );
}

