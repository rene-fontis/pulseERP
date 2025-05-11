
"use client";

import React from "react";
import { useForm } from "react-hook-form";
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
import type { Segment, NewSegmentPayload } from "@/types";

const segmentFormSchema = z.object({
  name: z.string().min(1, "Segmentname ist erforderlich."),
  description: z.string().optional(),
});

export type SegmentFormValues = z.infer<typeof segmentFormSchema>;

interface SegmentFormProps {
  onSubmit: (values: NewSegmentPayload) => Promise<void>;
  initialData?: Segment | null;
  isSubmitting?: boolean;
}

export function SegmentForm({
  onSubmit,
  initialData,
  isSubmitting,
}: SegmentFormProps) {
  const form = useForm<SegmentFormValues>({
    resolver: zodResolver(segmentFormSchema),
    defaultValues: initialData
      ? { name: initialData.name, description: initialData.description || "" }
      : { name: "", description: "" },
  });

  const handleSubmitInternal = async (values: SegmentFormValues) => {
    await onSubmit(values);
     if (!initialData) {
      form.reset({ name: "", description: "" });
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
              <FormLabel>Segmentname</FormLabel>
              <FormControl>
                <Input placeholder="z.B. VIP Kunden, Leads" {...field} />
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
                  placeholder="Kurze Beschreibung des Segments"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          {isSubmitting ? "Speichern..." : initialData ? "Änderungen speichern" : "Segment erstellen"}
        </Button>
      </form>
    </Form>
  );
}
