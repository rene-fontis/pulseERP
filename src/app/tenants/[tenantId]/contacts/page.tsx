
"use client";

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function TenantContactsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string; // Assuming tenantId is always present

  // In a real scenario, you would fetch tenant data here:
  // const { data: tenant, isLoading, error } = useGetTenantById(tenantId);

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <Users className="h-8 w-8 mr-3 text-primary" />
        <h1 className="text-3xl font-bold">Kontaktverwaltung</h1>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Kontakte</CardTitle>
          <CardDescription>Verwalten Sie Ihre Kunden, Lieferanten und Partner.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Diese Funktion ist demnächst verfügbar. Hier können Sie Kontakte anlegen, bearbeiten, segmentieren und exportieren.
            Für Kunden können Stundensätze hinterlegt und Projekte sowie erfasste Zeiten eingesehen werden.
          </p>
          <img
            src="https://picsum.photos/seed/contactsModule/1200/400"
            alt="Symbolbild Kontaktverwaltung und Netzwerk"
            data-ai-hint="contacts network"
            className="rounded-lg shadow-md w-full object-cover h-64"
          />
        </CardContent>
      </Card>
    </div>
  );
}
