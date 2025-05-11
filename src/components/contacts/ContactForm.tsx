"use client";

import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { Contact, NewContactPayload, Segment } from "@/types";
import { useGetSegments } from "@/hooks/useSegments"; // For segment selection
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandItem, CommandList, CommandGroup } from "@/components/ui/command";
import { CheckIcon, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";


const addressSchema = z.object({
  street: z.string().optional(),
  zip: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

const contactFormSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich."),
  firstName: z.string().optional(),
  companyName: z.string().optional(),
  address: addressSchema.default({}),
  phone: z.string().optional(),
  email: z.string().email({ message: "Ungültige E-Mail-Adresse." }).optional().or(z.literal('')),
  segmentIds: z.array(z.string()).optional().default([]),
  hourlyRate: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '' ? parseFloat(val.replace(',', '.')) : (val === null || val === '' ? undefined : val)),
    z.number().positive("Stundensatz muss positiv sein.").optional().nullable()
  ),
  isClient: z.boolean().default(false),
  isSupplier: z.boolean().default(false),
  isPartner: z.boolean().default(false),
  notes: z.string().optional(),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

interface ContactFormProps {
  tenantId: string;
  onSubmit: (values: NewContactPayload) => Promise<void>;
  initialData?: Contact | null;
  isSubmitting?: boolean;
}

export function ContactForm({
  tenantId,
  onSubmit,
  initialData,
  isSubmitting,
}: ContactFormProps) {
  const { data: segments, isLoading: isLoadingSegments } = useGetSegments(tenantId);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          address: initialData.address || {},
          segmentIds: initialData.segmentIds || [],
        }
      : {
          name: "",
          firstName: "",
          companyName: "",
          address: { street: "", zip: "", city: "", country: "" },
          phone: "",
          email: "",
          segmentIds: [],
          hourlyRate: undefined,
          isClient: true, // Default to client
          isSupplier: false,
          isPartner: false,
          notes: "",
        },
  });

   useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        address: initialData.address || { street: "", zip: "", city: "", country: "" },
        segmentIds: initialData.segmentIds || [],
        hourlyRate: initialData.hourlyRate ?? undefined, // Ensure undefined if null
      });
    }
  }, [initialData, form]);

  const handleSubmitInternal = async (values: ContactFormValues) => {
    const payload: NewContactPayload = {
      ...values,
      tenantId,
      // Ensure hourlyRate is null if undefined or null from form, otherwise use the number value.
      hourlyRate: (values.hourlyRate === undefined || values.hourlyRate === null) ? null : values.hourlyRate,
    };
    await onSubmit(payload);
    if (!initialData) {
      form.reset({ // Reset to default for new contact after submission
          name: "",
          firstName: "",
          companyName: "",
          address: { street: "", zip: "", city: "", country: "" },
          phone: "",
          email: "",
          segmentIds: [],
          hourlyRate: undefined,
          isClient: true,
          isSupplier: false,
          isPartner: false,
          notes: "",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmitInternal)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nachname / Hauptname*</FormLabel>
                <FormControl><Input placeholder="Mustermann" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vorname</FormLabel>
                <FormControl><Input placeholder="Max" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Firma</FormLabel>
              <FormControl><Input placeholder="Muster AG" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2 rounded-md border p-4">
            <h3 className="text-sm font-medium">Adresse</h3>
            <FormField
                control={form.control}
                name="address.street"
                render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-xs">Strasse</FormLabel>
                    <FormControl><Input placeholder="Musterstrasse 1" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                    control={form.control}
                    name="address.zip"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs">PLZ</FormLabel>
                        <FormControl><Input placeholder="8000" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="address.city"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs">Ort</FormLabel>
                        <FormControl><Input placeholder="Zürich" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="address.country"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs">Land</FormLabel>
                        <FormControl><Input placeholder="Schweiz" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefon</FormLabel>
                <FormControl><Input placeholder="+41 79 123 45 67" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-Mail</FormLabel>
                <FormControl><Input type="email" placeholder="max.mustermann@example.com" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
            control={form.control}
            name="segmentIds"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Segmente</FormLabel>
                <Controller
                    control={form.control}
                    name="segmentIds"
                    render={({ field: controllerField }) => (
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                    "w-full justify-between",
                                    !controllerField.value?.length && "text-muted-foreground"
                                )}
                                disabled={isLoadingSegments}
                                >
                                {isLoadingSegments ? "Lade Segmente..." :
                                controllerField.value && controllerField.value.length > 0
                                    ? controllerField.value
                                        .map(val => segments?.find(s => s.id === val)?.name)
                                        .filter(Boolean)
                                        .join(", ")
                                    : "Segmente wählen"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Segment suchen..." />
                            <CommandEmpty>Kein Segment gefunden.</CommandEmpty>
                            <CommandList>
                                <CommandGroup>
                                    {segments?.map((segment) => (
                                    <CommandItem
                                        value={segment.name}
                                        key={segment.id}
                                        onSelect={() => {
                                        const currentValues = controllerField.value || [];
                                        const newValue = currentValues.includes(segment.id)
                                            ? currentValues.filter((id) => id !== segment.id)
                                            : [...currentValues, segment.id];
                                        controllerField.onChange(newValue);
                                        }}
                                    >
                                        <CheckIcon
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            controllerField.value?.includes(segment.id)
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                        />
                                        {segment.name}
                                    </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                        </PopoverContent>
                    </Popover>
                    )}
                />
                <FormDescription>Ordnen Sie diesen Kontakt Segmenten zu.</FormDescription>
                <FormMessage />
                </FormItem>
            )}
        />


        <div className="space-y-3">
            <Label>Kontakttyp</Label>
            <FormField
                control={form.control}
                name="isClient"
                render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <div className="space-y-1 leading-none">
                    <FormLabel>Kunde</FormLabel>
                    <FormDescription>Markieren, wenn dieser Kontakt ein Kunde ist.</FormDescription>
                    </div>
                </FormItem>
                )}
            />
            {form.watch("isClient") && (
                 <FormField
                    control={form.control}
                    name="hourlyRate"
                    render={({ field }) => (
                    <FormItem className="pl-6">
                        <FormLabel className="text-xs">Stundensatz (CHF)</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder="z.B. 150.00" {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            )}
            <FormField
                control={form.control}
                name="isSupplier"
                render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <div className="space-y-1 leading-none">
                    <FormLabel>Lieferant</FormLabel>
                    </div>
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="isPartner"
                render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <div className="space-y-1 leading-none">
                    <FormLabel>Partner</FormLabel>
                    </div>
                </FormItem>
                )}
            />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notizen</FormLabel>
              <FormControl><Textarea placeholder="Zusätzliche Informationen..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          {isSubmitting ? "Speichern..." : initialData ? "Änderungen speichern" : "Kontakt erstellen"}
        </Button>
      </form>
    </Form>
  );
}