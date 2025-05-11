
"use client";

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Receipt } from 'lucide-react';

export default function TenantInvoicingPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <Receipt className="h-8 w-8 mr-3 text-primary" />
        <h1 className="text-3xl font-bold">Kundenrechnungen</h1>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Rechnungsstellung</CardTitle>
          <CardDescription>Erstellen und verwalten Sie Rechnungen für Ihre Kunden.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Diese Funktion ist demnächst verfügbar. Hier können Sie Rechnungen aus erfassten Zeiten
            oder manuell erstellen, Artikel hinzufügen und den Rechnungsstatus verfolgen.
          </p>
          <img
            src="https://picsum.photos/seed/invoicingModule/1200/400"
            alt="Symbolbild Rechnungsstellung und Finanzen"
            data-ai-hint="invoice finance"
            className="rounded-lg shadow-md w-full object-cover h-64"
          />
        </CardContent>
      </Card>
    </div>
  );
}
