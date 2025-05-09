"use client";

import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, AlertCircle } from 'lucide-react';
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
import React from 'react';

const basicSettingsSchema = z.object({
  name: z.string().min(2, "Mandantenname muss mindestens 2 Zeichen lang sein."),
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
      timezone: '', // Placeholder, load from tenant.timezone if available
      notificationsEnabled: false, // Placeholder, load from tenant.notificationsEnabled if available
    }
  });

  React.useEffect(() => {
    if (tenant) {
      form.reset({
        name: tenant.name,
        // Assuming tenant object might have these fields in the future
        timezone: (tenant as any).timezone || '(GMT+01:00) Mitteleuropäische Zeit', 
        notificationsEnabled: (tenant as any).notificationsEnabled === undefined ? true : (tenant as any).notificationsEnabled,
      });
    }
  }, [tenant, form]);

  const onSubmit = async (values: BasicSettingsFormValues) => {
    if (!tenant) return;
    try {
      // Only update name for now, as other fields are not on Tenant type yet
      await updateTenantMutation.mutateAsync({ id: tenant.id, name: values.name });
      // TODO: Add mutation for other settings like timezone, notifications when they are added to Tenant type and service
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
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zeitzone (Platzhalter)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="z.B. Europe/Berlin" />
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
                        aria-readonly // if the setting is not yet saveable
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
    </div>
  );
}
