
"use client";

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Package } from 'lucide-react';

export default function TenantInventoryPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <Package className="h-8 w-8 mr-3 text-primary" />
        <h1 className="text-3xl font-bold">Warenwirtschaft</h1>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Artikel & Lager</CardTitle>
          <CardDescription>Verwalten Sie Ihre Artikel, Preise und optional Lagerbestände.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Diese Funktion ist demnächst verfügbar. Hier können Sie Artikel mit Nummern, Beschreibungen,
            Stückpreisen und optional Umsatzsteuersätzen erfassen und verwalten.
          </p>
          <img
            src="https://picsum.photos/seed/inventoryModule/1200/400"
            alt="Symbolbild Warenwirtschaft und Lagerhaltung"
            data-ai-hint="inventory stock"
            className="rounded-lg shadow-md w-full object-cover h-64"
          />
        </CardContent>
      </Card>
    </div>
  );
}
