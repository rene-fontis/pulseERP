
"use client";

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Boxes, PlusCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Placeholder - This will be expanded with actual product management UI
export default function ProductManagementPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Boxes className="h-8 w-8 mr-3 text-primary" />
          <h1 className="text-3xl font-bold">Produktverwaltung</h1>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
                <Link href={`/tenants/${tenantId}/settings/inventory`}>
                    <Settings className="mr-2 h-4 w-4" /> Benutzerdefinierte Felder
                </Link>
            </Button>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                <PlusCircle className="mr-2 h-4 w-4" /> Produkt hinzufügen (Demnächst)
            </Button>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Produktliste</CardTitle>
          <CardDescription>Hier werden Ihre Produkte verwaltet. Diese Funktion ist in Entwicklung.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            In diesem Bereich können Sie bald Ihre Produkte anlegen, bearbeiten und verwalten.
            Dazu gehören Artikelnummer, Name, Beschreibung, Preise, Steuersätze und die von Ihnen definierten benutzerdefinierten Felder.
            Eine Import-/Exportfunktion für Produkte ist ebenfalls geplant.
          </p>
          <img
            src="https://picsum.photos/seed/productsPage/1200/400"
            alt="Symbolbild Produktmanagement und Artikelverwaltung"
            data-ai-hint="product management list"
            className="rounded-lg shadow-md w-full object-cover h-64"
          />
        </CardContent>
      </Card>
    </div>
  );
}
