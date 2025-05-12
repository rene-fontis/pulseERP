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
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import type { TimeEntry, TimeEntryFormValues, Contact, Project as ProjectType, ProjectTask, NewTimeEntryPayload } from "@/types"; // Renamed Project to ProjectType
import { useGetContacts } from "@/hooks/useContacts";
import { useGetProjects } from "@/hooks/useProjects"; // Assuming hook name, adjust if different
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const timeEntryFormSchema = z.object({
  date: z.date({ required_error: "Datum ist erforderlich." }),
  hours: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val),
    z.number().positive("Stunden müssen positiv sein.")
  ),
  description: z.string().optional(),
  contactId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  taskId: z.string().nullable().optional(),
  rate: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '' ? parseFloat(val.replace(',', '.')) : (val === null || val === '' ? undefined : val)),
    z.number().positive("Stundensatz muss positiv sein.").optional().nullable()
  ),
  isBillable: z.boolean().default(false),
});

interface TimeEntryFormProps {
  tenantId: string;
  onSubmit: (values: NewTimeEntryPayload) => Promise<void>;
  initialData?: Partial<TimeEntry> | null; // Allow partial for timer pre-fill
  isSubmitting?: boolean;
}

interface SelectOption {
  value: string;
  label: string;
}

export function TimeEntryForm({ tenantId, onSubmit, initialData, isSubmitting }: TimeEntryFormProps) {
  const { data: contacts, isLoading: isLoadingContacts } = useGetContacts(tenantId);
  const { data: projects, isLoading: isLoadingProjects } = useGetProjects(tenantId, ['Active', 'OnHold']);

  const form = useForm<TimeEntryFormValues>({
    resolver: zodResolver(timeEntryFormSchema),
    defaultValues: initialData
      ? {
          date: initialData.date ? (typeof initialData.date === 'string' ? parseISO(initialData.date) : initialData.date) : new Date(),
          hours: initialData.hours || 0,
          description: initialData.description || "",
          contactId: initialData.contactId || null,
          projectId: initialData.projectId || null,
          taskId: initialData.taskId || null,
          rate: initialData.rate ?? undefined,
          isBillable: initialData.isBillable === undefined ? true : initialData.isBillable,
        }
      : {
          date: new Date(),
          hours: 0,
          description: "",
          contactId: null,
          projectId: null,
          taskId: null,
          rate: undefined,
          isBillable: true,
        },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        date: initialData.date ? (typeof initialData.date === 'string' ? parseISO(initialData.date) : initialData.date) : new Date(),
        hours: initialData.hours || 0,
        description: initialData.description || "",
        contactId: initialData.contactId || null,
        projectId: initialData.projectId || null,
        taskId: initialData.taskId || null,
        rate: initialData.rate ?? undefined, // Ensure undefined if null from initialData for the form
        isBillable: initialData.isBillable === undefined ? true : initialData.isBillable,
      });
    }
  }, [initialData, form]);

  const contactOptions: SelectOption[] = React.useMemo(() => 
    contacts?.map(c => ({ value: c.id, label: c.companyName ? `${c.companyName} (${c.name})` : `${c.firstName || ''} ${c.name}`.trim() })) || [],
  [contacts]);

  const projectOptions: SelectOption[] = React.useMemo(() =>
    projects?.map(p => ({ value: p.id, label: p.name })) || [],
  [projects]);
  
  const selectedProjectId = form.watch("projectId");
  const taskOptions: SelectOption[] = React.useMemo(() => {
    if (!selectedProjectId || !projects) return [];
    const selectedProject = projects.find(p => p.id === selectedProjectId);
    return selectedProject?.tasks.filter(t => t.status !== 'Completed').map(t => ({ value: t.id, label: t.name })) || [];
  }, [selectedProjectId, projects]);


  const selectedContactId = form.watch("contactId");
  useEffect(() => {
    // Only auto-fill if rate is not already set by initialData (which could be from a timer stop)
    // and if not explicitly set in the form by the user yet.
    if (selectedContactId && contacts && (!initialData || initialData.rate === undefined || initialData.rate === null) && (form.getValues("rate") === undefined || form.getValues("rate") === null) ) {
      const contact = contacts.find(c => c.id === selectedContactId);
      if (contact?.hourlyRate) {
        form.setValue("rate", contact.hourlyRate);
      }
    }
  }, [selectedContactId, contacts, form, initialData]);


  const handleSubmitInternal = async (values: TimeEntryFormValues) => {
    const payload: NewTimeEntryPayload = {
      ...values,
      tenantId,
      date: values.date.toISOString(),
      rate: (values.rate === undefined || values.rate === null) ? null : values.rate,
      contactId: values.contactId || null,
      projectId: values.projectId || null,
      taskId: values.taskId || null,
      description: values.description || undefined,
    };
    await onSubmit(payload);
    if (!initialData?.id) { // Reset form only if it was a new entry (not an edit or timer save)
      form.reset({
        date: new Date(),
        hours: 0,
        description: "",
        contactId: null,
        projectId: null,
        taskId: null,
        rate: undefined,
        isBillable: true,
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmitInternal)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Datum*</FormLabel>
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
                name="hours"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Stunden*</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="z.B. 1.5" {...field} /></FormControl>
                    <FormDescription className="text-xs">Dezimal (z.B. 1.5 für 1h 30m)</FormDescription>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Beschreibung</FormLabel>
              <FormControl><Textarea placeholder="Details zur erfassten Zeit" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
                control={form.control}
                name="contactId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Kontakt (optional)</FormLabel>
                    <AutocompleteSelect options={contactOptions} value={field.value} onChange={field.onChange} placeholder="Kontakt wählen..." isLoading={isLoadingContacts} />
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Projekt (optional)</FormLabel>
                    <AutocompleteSelect options={projectOptions} value={field.value} onChange={(value) => { field.onChange(value); form.setValue("taskId", null);}} placeholder="Projekt wählen..." isLoading={isLoadingProjects} />
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="taskId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Aufgabe (optional)</FormLabel>
                    <AutocompleteSelect options={taskOptions} value={field.value} onChange={field.onChange} placeholder="Aufgabe wählen..." isLoading={isLoadingProjects || !selectedProjectId} disabled={!selectedProjectId || taskOptions.length === 0} />
                     <FormDescription className="text-xs">Nur wählbar wenn Projekt selektiert.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <FormField
                control={form.control}
                name="rate"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Stundensatz (CHF)</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="z.B. 150.00" {...field} value={field.value ?? ''} /></FormControl>
                    <FormDescription className="text-xs">Wird vom Kontakt übernommen, falls dort definiert.</FormDescription>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="isBillable"
                render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm h-10">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <div className="space-y-1 leading-none">
                    <FormLabel>Verrechenbar</FormLabel>
                    </div>
                </FormItem>
                )}
            />
        </div>

        <Button type="submit" disabled={isSubmitting || isLoadingContacts || isLoadingProjects} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          {isSubmitting ? "Speichern..." : (initialData?.id ? "Änderungen speichern" : "Zeiteintrag erstellen")}
        </Button>
      </form>
    </Form>
  );
}


interface AutocompleteSelectProps {
  options: SelectOption[];
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
  isLoading?: boolean;
  disabled?: boolean;
}

function AutocompleteSelect({ options, value, onChange, placeholder, isLoading, disabled }: AutocompleteSelectProps) {
  const [open, setOpen] = React.useState(false);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={isLoading || disabled}
        >
          {isLoading ? "Laden..." : (selectedOption ? selectedOption.label : placeholder || "Wählen...")}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Suchen..." />
          <CommandList>
            <CommandEmpty>Nichts gefunden.</CommandEmpty>
            <CommandGroup>
                <CommandItem onSelect={() => { onChange(null); setOpen(false);}} className="text-xs">
                    <Check className={cn("mr-2 h-3 w-3", value === null ? "opacity-100" : "opacity-0")} />
                    (Keine Auswahl)
                </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label} 
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
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

