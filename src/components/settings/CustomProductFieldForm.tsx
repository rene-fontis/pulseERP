
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { CustomProductFieldDefinition, CustomProductFieldType } from '@/types';

const fieldTypes: CustomProductFieldType[] = ['text', 'textarea', 'number', 'boolean', 'date'];

const customProductFieldFormSchema = z.object({
  label: z.string().min(1, "Bezeichnung ist erforderlich."),
  name: z.string().min(1, "Interner Name ist erforderlich.").regex(/^[a-zA-Z0-9_]+$/, "Interner Name darf nur Buchstaben, Zahlen und Unterstriche enthalten."),
  type: z.enum(fieldTypes, { required_error: "Typ ist erforderlich." }),
  isRequired: z.boolean().default(false),
  // `options` could be added here if a 'select' type is introduced
});

export type CustomProductFieldFormValues = Omit<CustomProductFieldDefinition, 'id' | 'order'>;

interface CustomProductFieldFormProps {
  onSubmit: (values: CustomProductFieldFormValues) => void;
  initialData?: CustomProductFieldDefinition | null;
  isSubmitting?: boolean;
}

export function CustomProductFieldForm({ onSubmit, initialData, isSubmitting }: CustomProductFieldFormProps) {
  const form = useForm<CustomProductFieldFormValues>({
    resolver: zodResolver(customProductFieldFormSchema),
    defaultValues: initialData
      ? {
          label: initialData.label,
          name: initialData.name,
          type: initialData.type,
          isRequired: initialData.isRequired || false,
        }
      : {
          label: '',
          name: '',
          type: 'text',
          isRequired: false,
        },
  });

  const handleSubmit = async (values: CustomProductFieldFormValues) => {
    onSubmit(values);
     if (!initialData) { // Reset form only if it was a create operation
      form.reset();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bezeichnung (Angezeigter Name)</FormLabel>
              <FormControl>
                <Input placeholder="z.B. Farbe, Material" {...field} />
              </FormControl>
              <FormDescription>Dies ist der Name, der Benutzern im Formular angezeigt wird.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Interner Feldname (Schlüssel)</FormLabel>
              <FormControl>
                <Input placeholder="z.B. farbe, material_typ (ohne Leerzeichen/Sonderzeichen)" {...field} disabled={!!initialData} />
              </FormControl>
              <FormDescription>
                Technischer Name des Feldes. Darf nur Buchstaben, Zahlen und Unterstriche enthalten.
                Kann nach Erstellung nicht mehr geändert werden.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Feldtyp</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Feldtyp auswählen" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {fieldTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type === 'text' && 'Text (Einzeilig)'}
                      {type === 'textarea' && 'Text (Mehrzeilig)'}
                      {type === 'number' && 'Zahl'}
                      {type === 'boolean' && 'Ja/Nein (Checkbox)'}
                      {type === 'date' && 'Datum'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isRequired"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Pflichtfeld</FormLabel>
                <FormDescription>
                  Muss dieses Feld beim Erfassen eines Produkts ausgefüllt werden?
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          {isSubmitting ? 'Speichern...' : (initialData ? 'Änderungen speichern' : 'Feld definieren')}
        </Button>
      </form>
    </Form>
  );
}

    