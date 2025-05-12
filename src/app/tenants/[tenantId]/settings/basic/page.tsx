"use client";

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, AlertCircle, Percent } from 'lucide-react';
import { useGetTenantById, useUpdateTenant } from '@/hooks/useTenants';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import type { Tenant } from '@/types';

const basicSettingsSchema = z.object({
  name: z.string().min(2, "Mandantenname muss mindestens 2 Zeichen lang sein."),
  vatNumber: z.string().optional(),
  timezone: z.string().optional(),
  notificationsEnabled: z.boolean().optional(),
});

type BasicSettingsFormValues = z.infer<typeof basicSettingsSchema>;

export default function TenantBasicSettingsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { data: tenant, isLoading, error, refetch } = useGetTenantById(tenantId);
  const updateTenantMutation = useUpdateTenant();
  const { toast } = useToast();

  const form = useForm<BasicSettingsFormValues>({
    resolver: zodResolver(basicSettingsSchema),
    defaultValues: {
      name: '',
      vatNumber: '',
      timezone: '',
      notificationsEnabled: false,
    }
  });

  useEffect(() => {
    if (tenant) {
      form.reset({
        name: tenant.name,
        vatNumber: tenant.vatNumber || '',
        timezone: (tenant as any).timezone || '(GMT+01:00) Mitteleuropäische Zeit', 
        notificationsEnabled: (tenant as any).notificationsEnabled === undefined ? true : (tenant as any).notificationsEnabled,
      });
    }
  }, [tenant, form]);

  const onSubmit = async (values: BasicSettingsFormValues) => {
    if (!tenant) {
        toast({ title: "Fehler", description: "Mandant nicht geladen.", variant: "destructive" });
        return;
    }
    try {
      const dataToUpdate: Partial<Tenant> = {
        name: values.name,
        vatNumber: values.vatNumber || null,
        // TODO: Add other fields like timezone, notifications when backend supports them
      };
      
      await updateTenantMutation.mutateAsync({
        id: tenant.id,
        data: dataToUpdate
      });
      toast({ title: "Erfolg", description: "Basiseinstellungen erfolgreich aktualisiert." });
      refetch();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast({ title: "Fehler", description: `Einstellungen konnten nicht gespeichert werden: ${errorMessage}`, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
       <div className="space-y-6 p-4 md:p-8">
        <Skeleton className="h-10 w-1/3 mb-2" />
        <Skeleton className="h-6 w-2/3 mb-6" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/4" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/5" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/5" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-6 w-10" />
              <Skeleton className="h-4 w-2/5" />
            </div>
            <Skeleton className="h-10 w-1/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4 md:p-8">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Einstellungen</h2>
        <p>{error.message}</p>
      </div>
    );
  }
  
  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 md:p-8">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Mandant nicht gefunden</h2>
        <p>Der angeforderte Mandant konnte nicht gefunden werden.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 px-4 md:px-0">
        <div className="flex items-center mb-2">
            <Settings className="h-8 w-8 mr-3 text-primary" />
            <h1 className="text-2xl font-bold">Basiseinstellungen: {tenant.name}</h1>
        </div>
        <p className="text-muted-foreground">
          Allgemeine Einstellungen und Präferenzen für den Mandanten {tenant.name}.
        </p>
      </div>
      
      <Card className="shadow-lg mx-4 md:mx-0">
        <CardHeader>
          <CardTitle className="text-xl">Mandanten Details</CardTitle>
           <CardDescription>
            Passen Sie hier die grundlegenden Informationen Ihres Mandanten an.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mandantenname</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vatNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MWST-Nummer (UID)</FormLabel>
                    <FormControl>
                      <Input placeholder="CHE-XXX.XXX.XXX MWST" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zeitzone (Platzhalter)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="z.B. Europe/Berlin" disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="notificationsEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background">
                    <div className="space-y-0.5">
                      <FormLabel>E-Mail-Benachrichtigungen (Platzhalter)</FormLabel>
                       <CardDescription className="text-xs">
                        Benachrichtigungen für diesen Mandanten aktivieren oder deaktivieren.
                      </CardDescription>
                    </div>
                    <FormControl>
                       <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled // if the setting is not yet saveable
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="border-t pt-6">
                <Button type="submit" disabled={updateTenantMutation.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  {updateTenantMutation.isPending ? "Speichern..." : "Änderungen speichern"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="shadow-lg mx-4 md:mx-0 mt-8">
        <CardHeader>
          <CardTitle className="text-xl">Steuersätze</CardTitle>
           <CardDescription>
            Verwalten Sie die Mehrwertsteuersätze für diesen Mandanten.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="text-center py-6 text-muted-foreground">
                <Percent className="mx-auto h-10 w-10 mb-3 text-primary" />
                <p className="font-semibold">Funktion in Entwicklung</p>
                <p>Hier können Sie bald die für die Schweiz gültigen Steuersätze (z.B. 8.1% Normalsatz, 2.6% Reduzierter Satz) verwalten und als Standard für Rechnungen festlegen.</p>
            </div>
             <Button disabled className="mt-4">Steuersätze verwalten (Demnächst)</Button>
        </CardContent>
      </Card>
    </div>
  );
}
