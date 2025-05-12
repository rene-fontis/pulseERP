
"use client";

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Package, Settings } from 'lucide-react'; // Keep Package, Settings for custom fields link
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function TenantInventoryPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
            <Package className="h-8 w-8 mr-3 text-primary" />
            <h1 className="text-3xl font-bold">Warenwirtschaft</h1>
        </div>
        <Button asChild variant="outline">
            <Link href={`/tenants/${tenantId}/settings/inventory`}>
                <Settings className="mr-2 h-4 w-4"/> Benutzerdefinierte Felder verwalten
            </Link>
        </Button>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Produkt- & Lagerverwaltung</CardTitle>
          <CardDescription>Verwalten Sie Ihre Artikel, Preise und optional Lagerbestände.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Diese Funktion ist demnächst verfügbar. Hier können Sie Produkte mit Standard- und benutzerdefinierten Feldern erfassen und verwalten.
            Die Lagerbewirtschaftung wird ebenfalls hier integriert.
          </p>
          <img
            src="https://picsum.photos/seed/inventoryModuleFuture/1200/400"
            alt="Symbolbild Warenwirtschaft und Lagerhaltung mit benutzerdefinierten Feldern"
            data-ai-hint="inventory stock custom"
            className="rounded-lg shadow-md w-full object-cover h-64"
          />
        </CardContent>
      </Card>
    </div>
  );
}

    