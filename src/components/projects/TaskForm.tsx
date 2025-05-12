
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import type { ProjectTask, TaskFormValues, Milestone, TaskStatus } from "@/types";
import { taskStatusLabels } from "@/types";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";


const taskFormSchema = z.object({
  name: z.string().min(1, "Aufgabenname ist erforderlich."),
  description: z.string().optional(),
  milestoneId: z.string().nullable().optional(),
  status: z.enum(['Open', 'InProgress', 'InReview', 'Completed', 'Blocked']).default('Open'),
  dueDate: z.date().nullable().optional(),
  estimatedHours: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '' ? parseFloat(val.replace(',', '.')) : (val === null || val === '' ? undefined : val)),
    z.number().positive("Geschätzte Stunden müssen positiv sein.").optional().nullable()
  ),
  // assigneeId can be added later
});

interface TaskFormProps {
  projectMilestones: Milestone[];
  onSubmit: (values: TaskFormValues) => Promise<void>;
  initialData?: ProjectTask | null;
  isSubmitting?: boolean;
}

interface MilestoneOption {
  value: string;
  label: string;
}


export function TaskForm({ projectMilestones, onSubmit, initialData, isSubmitting }: TaskFormProps) {
  const milestoneOptions: MilestoneOption[] = React.useMemo(() => 
    projectMilestones.map(ms => ({ value: ms.id, label: ms.name })),
    [projectMilestones]
  );

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          dueDate: initialData.dueDate ? parseISO(initialData.dueDate) : null,
          estimatedHours: initialData.estimatedHours ?? undefined,
          milestoneId: initialData.milestoneId || null,
        }
      : {
          name: "",
          description: "",
          milestoneId: null,
          status: 'Open',
          dueDate: null,
          estimatedHours: undefined,
        },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        dueDate: initialData.dueDate ? parseISO(initialData.dueDate) : null,
        estimatedHours: initialData.estimatedHours ?? undefined,
        milestoneId: initialData.milestoneId || null,
      });
    }
  }, [initialData, form]);


  const handleSubmitInternal = async (values: TaskFormValues) => {
    const payload: TaskFormValues = {
        ...values,
        estimatedHours: (values.estimatedHours === undefined || values.estimatedHours === null) ? null : values.estimatedHours,
    };
    await onSubmit(payload);
     if (!initialData) { 
      form.reset({
          name: "",
          description: "",
          milestoneId: null,
          status: 'Open',
          dueDate: null,
          estimatedHours: undefined,
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
              <FormLabel>Aufgabenname*</FormLabel>
              <FormControl><Input placeholder="z.B. Designentwurf erstellen" {...field} /></FormControl>
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
              <FormControl><Textarea placeholder="Details zur Aufgabe" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                    {(Object.keys(taskStatusLabels) as Array<keyof typeof taskStatusLabels>).map(statusKey => (
                        <SelectItem key={statusKey} value={statusKey}>{taskStatusLabels[statusKey]}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
                control={form.control}
                name="milestoneId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Meilenstein (optional)</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant="outline"
                            role="combobox"
                            className={cn("w-full justify-between font-normal", !field.value && "text-muted-foreground")}
                            >
                            {field.value ? milestoneOptions.find(ms => ms.value === field.value)?.label : "Meilenstein wählen"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Meilenstein suchen..." />
                            <CommandList>
                            <CommandEmpty>Kein Meilenstein gefunden.</CommandEmpty>
                            <CommandGroup>
                                <CommandItem onSelect={() => field.onChange(null)}>
                                    <Check className={cn("mr-2 h-4 w-4", field.value === null ? "opacity-100" : "opacity-0")} />
                                    (Kein Meilenstein)
                                </CommandItem>
                                {milestoneOptions.map((option) => (
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
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                name="estimatedHours"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Geschätzte Stunden (opt.)</FormLabel>
                    <FormControl><Input type="number" step="0.1" placeholder="z.B. 8" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>
        <Button type="submit" disabled={isSubmitting} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          {isSubmitting ? "Speichern..." : initialData ? "Änderungen speichern" : "Aufgabe erstellen"}
        </Button>
      </form>
    </Form>
  );
}

