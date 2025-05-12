
"use client";

import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Package, Settings, Warehouse as WarehouseIcon, Boxes } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  disabled?: boolean;
}

function InventoryFeatureCard({ title, description, icon: Icon, href, disabled }: FeatureCardProps) {
  const router = useRouter();
  return (
    <Card 
      className={`shadow-md transition-shadow ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg cursor-pointer'}`}
      onClick={() => !disabled && router.push(href)}
      role="link"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) router.push(href);}}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center">
          <Icon className="h-6 w-6 mr-3 text-primary" />
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function TenantInventoryPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const inventoryFeatures: FeatureCardProps[] = [
    {
      title: "Produkte",
      description: "Produktstamm verwalten, Preise und benutzerdefinierte Felder definieren.",
      icon: Boxes,
      href: `/tenants/${tenantId}/inventory/products`,
    },
    {
      title: "Lager",
      description: "Verschiedene Lagerorte definieren und verwalten.",
      icon: WarehouseIcon,
      href: `/tenants/${tenantId}/inventory/warehouses`,
    },
  ];

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
      
      <Card className="shadow-lg mb-8">
        <CardHeader>
          <CardTitle className="text-xl">Übersicht Warenwirtschaft</CardTitle>
          <CardDescription>Verwalten Sie hier Ihre Produkte, Lagerbestände und verwandte Einstellungen.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Wählen Sie einen Bereich aus, um Produkte oder Lager zu verwalten. Die detaillierte Lagerbestandsverfolgung und Bewegungen werden in Kürze implementiert.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {inventoryFeatures.map(feature => (
          <InventoryFeatureCard key={feature.href} {...feature} />
        ))}
      </div>
       <Card className="mt-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Zukünftige Funktionen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Funktionen wie detaillierte Lagerbewegungen (Ein-/Ausgänge, Umlagerungen) und Bestandsbewertungen werden in zukünftigen Versionen hinzugefügt.
            </p>
            <img
                src="https://picsum.photos/seed/inventoryAdvanced/1200/300"
                data-ai-hint="warehouse logistics chart"
                alt="Platzhalter für erweiterte Warenwirtschaftsfunktionen"
                className="rounded-lg shadow-md w-full object-cover h-48"
            />
          </CardContent>
        </Card>
    </div>
  );
}

    
