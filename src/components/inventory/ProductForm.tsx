"use client";

import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandInput, CommandEmpty, CommandItem, CommandList, CommandGroup } from "@/components/ui/command";
import { CheckIcon, ChevronsUpDown, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import type { Product, ProductFormValues, ProductCategory, CustomProductFieldDefinition, CustomProductFieldType } from "@/types";
import { useGetProductCategories } from "@/hooks/useProductCategories";
import { useGetTenantById } from "@/hooks/useTenants"; // To fetch custom field definitions

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
  customFields: z.record(z.any()).optional().default({}), // For custom fields
});

interface ProductFormProps {
  tenantId: string;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  initialData?: Product | null;
  isSubmitting?: boolean;
}

// Helper function to translate custom mask to regex pattern for HTML pattern attribute
function translateMaskToPattern(mask?: string): string | undefined {
  if (!mask) return undefined;
  let pattern = ''; 
  for (const char of mask) {
    switch (char) {
      case '9':
        pattern += '\\d';
        break;
      case 'a':
        pattern += '[a-zA-Z]';
        break;
      case '*':
        pattern += '[a-zA-Z0-9]';
        break;
      // Escape special regex characters if they are part of the literal mask
      case '.': case '\\': case '+': case '?': case '[': case ']':
      case '^': case '$': case '(': case ')': case '{': case '}': case '|':
        pattern += `\\${char}`;
        break;
      default:
        pattern += char; // Literal character from mask (e.g., '-')
        break;
    }
  }
  return `^${pattern}$`; // Enforce full string match
}


export function ProductForm({
  tenantId,
  onSubmit,
  initialData,
  isSubmitting,
}: ProductFormProps) {
  const { data: categories, isLoading: isLoadingCategories } = useGetProductCategories(tenantId);
  const { data: tenant, isLoading: isLoadingTenant } = useGetTenantById(tenantId);
  const customFieldDefinitions = tenant?.productCustomFieldDefinitions || [];

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          purchasePrice: initialData.purchasePrice ?? null,
          taxRateId: initialData.taxRateId ?? null,
          minimumQuantity: initialData.minimumQuantity ?? null,
          categoryIds: initialData.categoryIds || [],
          customFields: initialData.customFields || {},
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
          customFields: {},
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
        customFields: initialData.customFields || {},
      });
    } else { // Initialize custom fields with default values for new products
      const defaultCustomFields: Record<string, any> = {};
      customFieldDefinitions.forEach(def => {
        if (def.type === 'boolean') {
          defaultCustomFields[def.name] = false;
        } else if (def.type === 'number' && (!def.inputMask || /^[0-9]+$/.test(def.inputMask.replace(/9/g, '')))) {
          // Only default to null for pure numbers or digit-only masks
          defaultCustomFields[def.name] = null; 
        } else { // Text, textarea, date, or number with non-digit mask literals
          defaultCustomFields[def.name] = '';
        }
      });
      form.reset({
        ...form.getValues(), 
        customFields: defaultCustomFields,
      });
    }
  }, [initialData, form, customFieldDefinitions]);


  const handleSubmitInternal = async (values: ProductFormValues) => {
    const payload: ProductFormValues = {
      ...values,
      purchasePrice: (values.purchasePrice === undefined || values.purchasePrice === null) ? null : values.purchasePrice,
      taxRateId: (values.taxRateId === undefined || values.taxRateId === null) ? null : values.taxRateId,
      minimumQuantity: (values.minimumQuantity === undefined || values.minimumQuantity === null) ? null : values.minimumQuantity,
      customFields: values.customFields || {},
    };
    await onSubmit(payload);
    if (!initialData) {
        const defaultCustomFields: Record<string, any> = {};
        customFieldDefinitions.forEach(def => {
            if (def.type === 'boolean') defaultCustomFields[def.name] = false;
            else if (def.type === 'number' && (!def.inputMask || /^[0-9]+$/.test(def.inputMask.replace(/9/g, '')))) defaultCustomFields[def.name] = null;
            else defaultCustomFields[def.name] = '';
        });
        form.reset({
            itemNumber: "", name: "", description: "", unitPrice: 0, purchasePrice: null,
            taxRateId: null, unit: "Stk", minimumQuantity: null, categoryIds: [],
            customFields: defaultCustomFields,
        });
    }
  };
  
  const renderCustomField = (definition: CustomProductFieldDefinition) => {
    const fieldName = `customFields.${definition.name}` as const;
    const htmlPattern = definition.inputMask ? translateMaskToPattern(definition.inputMask) : undefined;

    const renderActualInput = (field: any) => {
      const commonProps = {
        ...field,
        placeholder: definition.label,
        title: htmlPattern ? `Format: ${definition.inputMask}` : undefined,
      };

      if (definition.type === 'text') {
        return <Input type="text" {...commonProps} value={field.value || ''} pattern={htmlPattern} />;
      }
      if (definition.type === 'textarea') {
        return <Textarea {...commonProps} value={field.value || ''} />;
      }
      if (definition.type === 'number') {
        if (definition.inputMask && /[^0-9]/.test(definition.inputMask.replace(/9/g, ''))) {
          // Mask contains non-digits (e.g., hyphens for ISBN), render as text input for formatting.
          // The value will be stored as a string. The pattern attribute handles validation.
          return <Input type="text" {...commonProps} value={field.value || ''} pattern={htmlPattern} />;
        } else {
          // Pure number or number with digit-only mask (or no mask)
          return (
            <Input
              type="number"
              {...commonProps}
              value={field.value ?? ''}
              onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
              pattern={htmlPattern} // Still useful for digit-only masks, e.g., length constraints
            />
          );
        }
      }
      if (definition.type === 'boolean') {
        return (
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox id={fieldName} checked={field.value || false} onCheckedChange={field.onChange} />
            <label htmlFor={fieldName} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {definition.label}
            </label>
          </div>
        );
      }
      if (definition.type === 'date') {
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {field.value ? format(parseISO(field.value), "PPP", { locale: de }) : <span>Datum wählen</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={field.value ? parseISO(field.value) : undefined}
                onSelect={(date) => field.onChange(date ? date.toISOString() : null)}
                initialFocus
                locale={de}
              />
            </PopoverContent>
          </Popover>
        );
      }
      return null;
    };
    
    return (
      <FormField
        key={definition.id}
        control={form.control}
        name={fieldName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{definition.label}{definition.isRequired && "*"}</FormLabel>
            <FormControl>
              {renderActualInput(field)}
            </FormControl>
            {definition.inputMask && (definition.type === 'text' || definition.type === 'number') && (
                <FormDescription className="text-xs">
                  Erwartetes Format: {definition.inputMask} (9=Ziffer, a=Buchstabe, *=Alphanumerisch).
                  {definition.type === 'number' && definition.inputMask && /[^0-9]/.test(definition.inputMask.replace(/9/g, ''))
                    ? " Eingabe als Text erforderlich, um Formatierung zu ermöglichen."
                    : definition.type === 'number'
                    ? " Eingabe als Zahl."
                    : " Bitte beachten Sie das angegebene Format."}
                </FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    );
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

        {customFieldDefinitions.length > 0 && (
            <div className="space-y-4 rounded-md border p-4">
                 <h3 className="text-sm font-medium">Zusätzliche Felder</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customFieldDefinitions.sort((a,b) => (a.order || 0) - (b.order || 0)).map(renderCustomField)}
                 </div>
            </div>
        )}


        <Button type="submit" disabled={isSubmitting || isLoadingCategories || isLoadingTenant} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          {isSubmitting ? "Speichern..." : initialData ? "Änderungen speichern" : "Produkt erstellen"}
        </Button>
      </form>
    </Form>
  );
}
