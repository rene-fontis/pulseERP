"use client";

import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, AlertCircle, LayoutGrid, FileText as FileTextIcon, Loader2 } from 'lucide-react';
import { useGetTenantById } from '@/hooks/useTenants';
import { useGetTenantChartOfAccountsById } from '@/hooks/useTenantChartOfAccounts';
import { useGetJournalEntries } from '@/hooks/useJournalEntries';
import { Skeleton } from '@/components/ui/skeleton';
import React, { useMemo, useEffect, useState } from 'react';
import { AccountingOverview } from '@/components/accounting/AccountingOverview';
import { calculateFinancialSummary, type FinancialSummary } from '@/lib/accounting';
import { Button } from '@/components/ui/button';

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
  const { data: tenant, isLoading: isLoadingTenant, error: tenantError } = useGetTenantById(tenantId);
  const { data: chartOfAccounts, isLoading: isLoadingCoA, error: coaError } = useGetTenantChartOfAccountsById(tenant?.chartOfAccountsId);
  const { data: journalEntries, isLoading: isLoadingEntries, error: entriesError } = useGetJournalEntries(tenantId);
  const [clientLoaded, setClientLoaded] = useState(false);

  useEffect(() => {
    setClientLoaded(true);
  }, []);

  const financialSummary: FinancialSummary | null = useMemo(() => {
    if (!chartOfAccounts || !journalEntries || !clientLoaded) return null;
    return calculateFinancialSummary(chartOfAccounts, journalEntries);
  }, [chartOfAccounts, journalEntries, clientLoaded]);
  
  const isLoadingData = isLoadingTenant || (clientLoaded && isLoadingCoA) || (clientLoaded && isLoadingEntries);
  const combinedError = tenantError || coaError || entriesError;

  if (isLoadingData && !clientLoaded) { // Initial full page skeleton
    return (
       <div className="space-y-6 p-4 md:p-8">
        <Skeleton className="h-10 w-1/3 mb-2" />
        <Skeleton className="h-6 w-2/3 mb-6" />
        {/* Skeleton for AccountingOverview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6">
            {[...Array(4)].map((_, i) => (
            <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                <Skeleton className="h-8 w-3/4 mb-1" />
                <Skeleton className="h-4 w-full" />
                </CardContent>
            </Card>
            ))}
        </div>
         <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (combinedError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4 md:p-8">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Buchhaltungsdaten</h2>
        <p>{(combinedError as Error).message}</p>
      </div>
    );
  }
  
  if (!tenant && !isLoadingTenant) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 md:p-8">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Mandant nicht gefunden</h2>
        <p>Der angeforderte Mandant konnte nicht gefunden werden.</p>
      </div>
    );
  }

  if (tenant && !tenant.chartOfAccountsId && !isLoadingCoA && clientLoaded) {
    return (
      <div className="container mx-auto py-8 text-center">
        <div className="mb-8 px-4 md:px-0">
            <div className="flex items-center mb-2 justify-center">
                <BookOpen className="h-8 w-8 mr-3 text-primary" />
                <h1 className="text-3xl font-bold">Buchhaltung: {tenant?.name || 'Lade...'}</h1>
            </div>
        </div>
        <AlertCircle className="w-16 h-16 mb-4 mx-auto text-destructive" />
        <h2 className="text-2xl font-semibold mb-2">Kein Kontenplan zugewiesen</h2>
        <p>Für diesen Mandanten wurde kein Kontenplan zugewiesen.</p>
        <p>Bitte überprüfen Sie die Mandanteneinstellungen und weisen Sie einen Kontenplan zu.</p>
         <Button asChild variant="link" className="mt-4">
            <a href={`/tenants/${tenantId}/settings/chart-of-accounts`}>Zu Kontenplan Einstellungen</a>
        </Button>
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
            <h1 className="text-3xl font-bold">Buchhaltung: {tenant?.name || (isLoadingTenant ? "Lade..." : "Unbekannt")}</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Finanzmanagement und Buchführung für {tenant?.name || (isLoadingTenant ? "Lade..." : "Unbekannt")}.
        </p>
      </div>

      {isLoadingData && clientLoaded && <Loader2 className="mx-auto my-8 h-12 w-12 animate-spin text-primary" />}
      
      {!isLoadingData && clientLoaded && chartOfAccounts && (
        <AccountingOverview summary={financialSummary} isLoading={isLoadingCoA || isLoadingEntries || !clientLoaded} />
      )}
      
      {!isLoadingData && clientLoaded && !chartOfAccounts && tenant?.chartOfAccountsId && (
         <Card className="mb-6">
            <CardHeader>
            <CardTitle>Finanzübersicht</CardTitle>
            <CardDescription className="text-destructive">Kontenplan konnte nicht geladen werden.</CardDescription>
            </CardHeader>
            <CardContent>
            <p className="text-muted-foreground">Die Finanzübersicht kann nicht angezeigt werden, da der zugehörige Kontenplan nicht verfügbar ist.</p>
            </CardContent>
        </Card>
      )}


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 md:px-0 mt-8">
        {accountingFeatures.map(feature => (
          <AccountingFeatureCard key={feature.href} {...feature} />
        ))}
      </div>
    </div>
  );
}
