"use client";

import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Users, FileText as FileTextIcon, AlertCircle, ChevronRight, CalendarDays, PackagePlus, Tag } from 'lucide-react'; // Added Tag
import { useGetTenantById } from '@/hooks/useTenants';
import { Skeleton } from '@/components/ui/skeleton';

interface SettingCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
}

function SettingCard({ title, description, icon: Icon, href }: SettingCardProps) {
  const router = useRouter();
  return (
    <Card 
      className="shadow-md hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => router.push(href)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push(href);}}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center">
          <Icon className="h-6 w-6 mr-3 text-primary" />
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}


export default function TenantSettingsOverviewPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { data: tenant, isLoading, error } = useGetTenantById(tenantId);

  if (isLoading) {
    return (
       <div className="space-y-6 p-4 md:p-8">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-8 w-3/4 mb-6" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4 md:p-8">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Mandanteneinstellungen</h2>
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

  const settingsCards: SettingCardProps[] = [
    {
      title: "Basiseinstellungen",
      description: "Allgemeine Einstellungen des Mandanten bearbeiten.",
      icon: Settings,
      href: `/tenants/${tenantId}/settings/basic`
    },
    {
      title: "Benutzerverwaltung",
      description: "Benutzer und deren Berechtigungen für diesen Mandanten verwalten.",
      icon: Users,
      href: `/tenants/${tenantId}/settings/users`
    },
    {
      title: "Kontenplan",
      description: "Den Kontenrahmen für diesen Mandanten definieren und bearbeiten.",
      icon: FileTextIcon,
      href: `/tenants/${tenantId}/settings/chart-of-accounts`
    },
    {
      title: "Geschäftsjahre",
      description: "Geschäftsjahre definieren und das aktive Jahr festlegen.",
      icon: CalendarDays,
      href: `/tenants/${tenantId}/settings/fiscal-years`
    },
    {
      title: "Produktfelder",
      description: "Benutzerdefinierte Felder für Produkte definieren.",
      icon: PackagePlus,
      href: `/tenants/${tenantId}/settings/inventory`
    },
    {
      title: "Produktkategorien",
      description: "Produktkategorien und deren Hierarchie verwalten.",
      icon: Tag,
      href: `/tenants/${tenantId}/settings/product-categories`
    }
  ];

  return (
    <div className="container mx-auto py-8">
       <div className="mb-8 px-4 md:px-0">
        <h1 className="text-3xl font-bold">Einstellungen: {tenant.name}</h1>
        <p className="text-lg text-muted-foreground">
          Verwalten Sie die verschiedenen Konfigurationen für {tenant.name}.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 md:px-0">
        {settingsCards.map(card => (
          <SettingCard key={card.href} {...card} />
        ))}
      </div>
    </div>
  );
}
