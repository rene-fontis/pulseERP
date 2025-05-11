// src/app/tenants/[tenantId]/dashboard/page.tsx
"use client";

import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard, AlertCircle, BookOpen, BarChartBig, Users, Briefcase, Clock, FileText, ChevronRight, Package, Receipt } from 'lucide-react';
import { useGetTenantById } from '@/hooks/useTenants';
import { Skeleton } from '@/components/ui/skeleton';
import React from 'react';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  href?: string; // Optional, if not provided, card is a placeholder
  disabled?: boolean;
}

function FeatureCard({ title, description, icon: Icon, href, disabled }: FeatureCardProps) {
  const router = useRouter();
  const isPlaceholder = !href;

  const handleClick = () => {
    if (href && !disabled) {
      router.push(href);
    }
  };

  return (
    <Card
      className={`shadow-md transition-shadow ${disabled || isPlaceholder ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-lg cursor-pointer'}`}
      onClick={handleClick}
      role={href && !disabled ? "link" : "region"}
      tabIndex={(href && !disabled) ? 0 : -1}
      onKeyDown={(e) => { if (href && !disabled && (e.key === 'Enter' || e.key === ' ')) handleClick();}}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center">
          <Icon className="h-6 w-6 mr-3 text-primary" />
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        </div>
        {href && !disabled && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
        {isPlaceholder && <p className="text-xs text-amber-600 mt-1">(Demnächst verfügbar)</p>}
      </CardContent>
    </Card>
  );
}


export default function TenantDashboardPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { data: tenant, isLoading, error } = useGetTenantById(tenantId);

  const features: FeatureCardProps[] = [
    {
      title: "Buchhaltung",
      description: "Finanzmanagement, Journal und Berichte.",
      icon: BookOpen,
      href: `/tenants/${tenantId}/accounting`
    },
    {
      title: "Budgeting",
      description: "Budgets erstellen und verwalten.",
      icon: BarChartBig,
      href: `/tenants/${tenantId}/budgeting`
    },
    {
      title: "Kontakte",
      description: "Kunden, Lieferanten und Partner verwalten.",
      icon: Users,
      href: `/tenants/${tenantId}/contacts`
    },
    {
      title: "Projektverwaltung",
      description: "Projekte planen, verfolgen und abrechnen.",
      icon: Briefcase,
      href: `/tenants/${tenantId}/projects`
    },
    {
      title: "Zeiterfassung",
      description: "Arbeitszeiten erfassen und Projekten zuordnen.",
      icon: Clock,
      href: `/tenants/${tenantId}/time-tracking`
    },
    {
      title: "Warenwirtschaft",
      description: "Artikel und Lagerbestände verwalten.",
      icon: Package,
      href: `/tenants/${tenantId}/inventory`
    },
    {
      title: "Kundenrechnungen",
      description: "Rechnungen erstellen und versenden.",
      icon: Receipt, // Changed from FileText to Receipt for better distinction
      href: `/tenants/${tenantId}/invoicing` 
    },
  ];


  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-8">
        <div className="mb-8">
          <Skeleton className="h-10 w-1/2 mb-2" />
          <Skeleton className="h-6 w-3/4" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(features.length)].map((_, i) => ( // Use features.length for skeleton count
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center">
                  <Skeleton className="h-6 w-6 mr-3 rounded-full" />
                  <Skeleton className="h-6 w-3/4" />
                </div>
                <Skeleton className="h-5 w-5" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4 md:p-8">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden des Dashboards</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 md:p-8">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Mandant nicht gefunden</h2>
        <p>Das Dashboard für den angeforderten Mandant konnte nicht geladen werden, da der Mandant nicht existiert.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 px-4 md:px-0">
        <div className="flex items-center mb-2">
          <LayoutDashboard className="h-8 w-8 mr-3 text-primary" />
          <h1 className="text-3xl font-bold">Dashboard: {tenant.name}</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Willkommen zurück! Hier ist Ihre zentrale Anlaufstelle für {tenant.name}.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 md:px-0">
        {features.map((feature) => (
          <FeatureCard
            key={feature.title}
            title={feature.title}
            description={feature.description}
            icon={feature.icon}
            href={feature.href}
            disabled={feature.disabled}
          />
        ))}
      </div>
       <div className="mt-12 px-4 md:px-0">
         <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-xl">Hinweis</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Dieses Dashboard wird in Zukunft weitere Module und Übersichten enthalten. Einige Module sind als Platzhalter für zukünftige Erweiterungen gedacht und führen zu einer "Demnächst verfügbar" Seite.</p>
                 <img 
                    src="https://picsum.photos/seed/dashboardFuture/1200/400" 
                    data-ai-hint="office analytics"
                    alt="Platzhalter für zukünftige Dashboard-Inhalte" 
                    className="mt-4 rounded-lg shadow-md w-full object-cover h-64"
                 />
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
