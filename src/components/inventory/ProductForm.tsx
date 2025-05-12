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
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandItem, CommandList, CommandGroup } from "@/components/ui/command";
import { CheckIcon, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product, ProductFormValues, ProductCategory } from "@/types";
import { useGetProductCategories } from "@/hooks/useProductCategories";
// Import other necessary hooks, e.g., for tax rates, warehouses when implemented

const productFormSchema = z.object({
  itemNumber: z.string().min(1, "Artikelnummer ist erforderlich."),
  name: z.string().min(1, "Produktname ist erforderlich."),
  description: z.string().optional(),
  unitPrice: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val),
    z.number().positive("Verkaufspreis muss positiv sein.")
  ),
  purchasePrice: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '' ? parseFloat(val.replace(',', '.')) : (val === null || val === '' ? null : val)),
    z.number().positive("Einkaufspreis muss positiv sein.").nullable().optional()
  ),
  taxRateId: z.string().nullable().optional(),
  unit: z.string().optional(),
  minimumQuantity: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '' ? parseFloat(val.replace(',', '.')) : (val === null || val === '' ? null : val)),
    z.number().min(0, "Mindestmenge darf nicht negativ sein.").nullable().optional()
  ),
  categoryIds: z.array(z.string()).optional().default([]),
  // defaultWarehouseId: z.string().nullable().optional(), // Add when warehouses are implemented
  // customFields will be handled dynamically later
});

interface ProductFormProps {
  tenantId: string;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  initialData?: Product | null;
  isSubmitting?: boolean;
}

export function ProductForm({
  tenantId,
  onSubmit,
  initialData,
  isSubmitting,
}: ProductFormProps) {
  const { data: categories, isLoading: isLoadingCategories } = useGetProductCategories(tenantId);
  // Add hooks for tax rates and warehouses here when available

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          purchasePrice: initialData.purchasePrice ?? null,
          taxRateId: initialData.taxRateId ?? null,
          minimumQuantity: initialData.minimumQuantity ?? null,
          categoryIds: initialData.categoryIds || [],
        }
      : {
          itemNumber: "",
          name: "",
          description: "",
          unitPrice: 0,
          purchasePrice: null,
          taxRateId: null,
          unit: "Stk",
          minimumQuantity: null,
          categoryIds: [],
        },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        purchasePrice: initialData.purchasePrice ?? null,
        taxRateId: initialData.taxRateId ?? null,
        minimumQuantity: initialData.minimumQuantity ?? null,
        categoryIds: initialData.categoryIds || [],
      });
    }
  }, [initialData, form]);

  const handleSubmitInternal = async (values: ProductFormValues) => {
    const payload: ProductFormValues = {
      ...values,
      purchasePrice: (values.purchasePrice === undefined || values.purchasePrice === null) ? null : values.purchasePrice,
      taxRateId: (values.taxRateId === undefined || values.taxRateId === null) ? null : values.taxRateId,
      minimumQuantity: (values.minimumQuantity === undefined || values.minimumQuantity === null) ? null : values.minimumQuantity,
    };
    await onSubmit(payload);
    if (!initialData) {
      form.reset(); // Reset to default for new product
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmitInternal)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="itemNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Artikelnummer*</FormLabel>
                <FormControl><Input placeholder="ART-001" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Produktname*</FormLabel>
                <FormControl><Input placeholder="z.B. Schraubenzieher Set" {...field} /></FormControl>
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
              <FormControl><Textarea placeholder="Detaillierte Beschreibung des Produkts" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="unitPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Verkaufspreis (CHF)*</FormLabel>
                <FormControl><Input type="number" step="0.01" placeholder="19.90" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="purchasePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Einkaufspreis (CHF)</FormLabel>
                <FormControl><Input type="number" step="0.01" placeholder="12.50" {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Einheit</FormLabel>
                <FormControl><Input placeholder="Stk, kg, m" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="minimumQuantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mindestmenge/Meldebestand</FormLabel>
                <FormControl><Input type="number" step="1" placeholder="10" {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
            control={form.control}
            name="categoryIds"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Kategorien</FormLabel>
                <Controller
                    control={form.control}
                    name="categoryIds"
                    render={({ field: controllerField }) => (
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                    "w-full justify-between font-normal",
                                    !controllerField.value?.length && "text-muted-foreground"
                                )}
                                disabled={isLoadingCategories}
                                >
                                {isLoadingCategories ? "Lade Kategorien..." :
                                controllerField.value && controllerField.value.length > 0
                                    ? controllerField.value
                                        .map(val => categories?.find(s => s.id === val)?.name)
                                        .filter(Boolean)
                                        .join(", ")
                                    : "Kategorien wählen"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Kategorie suchen..." />
                            <CommandEmpty>Keine Kategorie gefunden.</CommandEmpty>
                            <CommandList>
                                <CommandGroup>
                                    {categories?.map((category) => (
                                    <CommandItem
                                        value={category.name}
                                        key={category.id}
                                        onSelect={() => {
                                        const currentValues = controllerField.value || [];
                                        const newValue = currentValues.includes(category.id)
                                            ? currentValues.filter((id) => id !== category.id)
                                            : [...currentValues, category.id];
                                        controllerField.onChange(newValue);
                                        }}
                                    >
                                        <CheckIcon
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            controllerField.value?.includes(category.id)
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                        />
                                        {category.name}
                                    </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                        </PopoverContent>
                    </Popover>
                    )}
                />
                <FormMessage />
                </FormItem>
            )}
        />


        {/* Placeholder for dynamic custom fields */}
        {/* <div>
          <h3 className="text-lg font-medium mb-2">Benutzerdefinierte Felder</h3>
          <p className="text-sm text-muted-foreground">Hier werden dynamisch die vom Mandanten definierten Felder angezeigt.</p>
        </div> */}


        <Button type="submit" disabled={isSubmitting || isLoadingCategories} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          {isSubmitting ? "Speichern..." : initialData ? "Änderungen speichern" : "Produkt erstellen"}
        </Button>
      </form>
    </Form>
  );
}
