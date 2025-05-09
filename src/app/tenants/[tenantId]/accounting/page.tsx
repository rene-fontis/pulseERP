"use client";

import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, AlertCircle, LayoutGrid, FileText as FileTextIcon } from 'lucide-react';
import { useGetTenantById } from '@/hooks/useTenants';
import { Skeleton } from '@/components/ui/skeleton';
import React from 'react'; // Import React

interface AccountingFeatureCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  disabled?: boolean;
}

function AccountingFeatureCard({ title, description, icon: Icon, href, disabled }: AccountingFeatureCardProps) {
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
        {!disabled && <LayoutGrid className="h-5 w-5 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function TenantAccountingPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { data: tenant, isLoading, error } = useGetTenantById(tenantId);
  
  if (isLoading) {
    return (
       <div className="space-y-6 p-4 md:p-8">
        <Skeleton className="h-10 w-1/3 mb-2" />
        <Skeleton className="h-6 w-2/3 mb-6" />
         <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4 md:p-8">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Buchhaltungsdaten</h2>
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
  
  const accountingFeatures: AccountingFeatureCardProps[] = [
    {
      title: "Journal",
      description: "Buchungssätze erfassen und Hauptbuch führen.",
      icon: BookOpen,
      href: `/tenants/${tenantId}/accounting/journal`
    },
    {
      title: "Berichte",
      description: "Bilanz, Erfolgsrechnung und weitere Finanzberichte erstellen.",
      icon: FileTextIcon,
      href: `/tenants/${tenantId}/accounting/reports`, 
      disabled: true,
    }
  ];


  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 px-4 md:px-0">
        <div className="flex items-center mb-2">
            <BookOpen className="h-8 w-8 mr-3 text-primary" />
            <h1 className="text-3xl font-bold">Buchhaltung: {tenant.name}</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Finanzmanagement und Buchführung für {tenant.name}.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 md:px-0">
        {accountingFeatures.map(feature => (
          <AccountingFeatureCard key={feature.href} {...feature} />
        ))}
      </div>
    </div>
  );
}
