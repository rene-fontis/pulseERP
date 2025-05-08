"use client";

import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, AlertCircle } from 'lucide-react';
import { useGetTenantById } from '@/hooks/useTenants';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function TenantSettingsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { data: tenant, isLoading, error } = useGetTenantById(tenantId);

  if (isLoading) {
    return (
       <div className="space-y-6">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-8 w-3/4 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-1/3" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Mandanteneinstellungen</h2>
        <p>{error.message}</p>
      </div>
    );
  }
  
  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Mandant nicht gefunden</h2>
        <p>Der angeforderte Mandant konnte nicht gefunden werden.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center mb-2">
            <Settings className="h-8 w-8 mr-3 text-primary" />
            <CardTitle className="text-3xl font-bold">Einstellungen: {tenant.name}</CardTitle>
          </div>
          <CardDescription className="text-lg">
            Konfigurieren Sie Einstellungen und Präferenzen für {tenant.name}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="tenant-name">Mandantenname</Label>
            <Input id="tenant-name" defaultValue={tenant.name} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="timezone">Zeitzone</Label>
            <Input id="timezone" placeholder="z.B. (GMT+01:00) Mitteleuropäische Zeit" />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch id="notifications-enabled" />
            <Label htmlFor="notifications-enabled">E-Mail-Benachrichtigungen aktivieren</Label>
          </div>

          <div className="border-t pt-6">
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90">Änderungen speichern</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
