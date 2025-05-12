"use client";

import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProductCategory, ProductCategoryFormValues } from "@/types";
import { useGetProductCategories } from "@/hooks/useProductCategories"; // To fetch parent categories

const productCategoryFormSchema = z.object({
  name: z.string().min(1, "Kategoriename ist erforderlich."),
  description: z.string().optional(),
  parentId: z.string().nullable().optional(), // Allow null for top-level categories
});

interface ProductCategoryFormProps {
  tenantId: string;
  onSubmit: (values: ProductCategoryFormValues) => Promise<void>;
  initialData?: ProductCategory | null;
  isSubmitting?: boolean;
  currentCategoryId?: string | null; // To prevent self-parenting
}

export function ProductCategoryForm({
  tenantId,
  onSubmit,
  initialData,
  isSubmitting,
  currentCategoryId,
}: ProductCategoryFormProps) {
  // Fetch all categories for parent selection by passing undefined or omitting parentId
  const { data: categories, isLoading: isLoadingCategories } = useGetProductCategories(tenantId); 

  const form = useForm<ProductCategoryFormValues>({
    resolver: zodResolver(productCategoryFormSchema),
    defaultValues: initialData
      ? { 
          name: initialData.name, 
          description: initialData.description || "",
          parentId: initialData.parentId || null,
        }
      : { 
          name: "", 
          description: "",
          parentId: null,
        },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        description: initialData.description || "",
        parentId: initialData.parentId || null,
      });
    }
  }, [initialData, form]);

  const handleSubmitInternal = async (values: ProductCategoryFormValues) => {
    await onSubmit(values);
    if (!initialData) {
      form.reset({ name: "", description: "", parentId: null });
    }
  };

  const parentCategoryOptions = React.useMemo(() => {
    if (!categories) return [];
    // Filter out the current category to prevent self-parenting
    // Also, ideally, filter out descendants of the current category if editing,
    // but that's more complex and not implemented here for simplicity.
    return categories
      .filter(cat => cat.id !== currentCategoryId) 
      .map(cat => ({ value: cat.id, label: cat.name }));
  }, [categories, currentCategoryId]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmitInternal)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kategoriename</FormLabel>
              <FormControl>
                <Input placeholder="z.B. Elektronik, Bücher" {...field} />
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
                <Textarea
                  placeholder="Kurze Beschreibung der Kategorie"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="parentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Übergeordnete Kategorie (optional)</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(value === "NONE" ? null : value)} 
                defaultValue={field.value || undefined}
                disabled={isLoadingCategories}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingCategories ? "Lade Kategorien..." : "Wählen..."} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="NONE">(Keine übergeordnete Kategorie)</SelectItem>
                  {parentCategoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting || isLoadingCategories} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          {isSubmitting ? "Speichern..." : initialData ? "Änderungen speichern" : "Kategorie erstellen"}
        </Button>
      </form>
    </Form>
  );
}