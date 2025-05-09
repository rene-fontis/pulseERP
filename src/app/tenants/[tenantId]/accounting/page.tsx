
"use client";

import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, AlertCircle, LayoutGrid, FileText as FileTextIcon, Loader2, CalendarDays, Calendar, BarChart2 as BarChartIconLucide } from 'lucide-react';
import { useGetTenantById } from '@/hooks/useTenants';
import { useGetTenantChartOfAccountsById } from '@/hooks/useTenantChartOfAccounts';
import { useGetJournalEntries } from '@/hooks/useJournalEntries';
import { useGetFiscalYears, useGetFiscalYearById } from '@/hooks/useFiscalYears';
import { Skeleton } from '@/components/ui/skeleton';
import React, { useMemo, useEffect, useState } from 'react';
import { AccountingOverview } from '@/components/accounting/AccountingOverview';
import { GlobalSummaryCards } from '@/components/accounting/GlobalSummaryCards';
import { calculateFinancialSummary, type FinancialSummary } from '@/lib/accounting';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FiscalYear } from '@/types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

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
  const { data: fiscalYears, isLoading: isLoadingFiscalYears } = useGetFiscalYears(tenantId);

  const [selectedFiscalYearId, setSelectedFiscalYearId] = useState<string | undefined>(undefined);
  const [clientLoaded, setClientLoaded] = useState(false);

  useEffect(() => {
    setClientLoaded(true);
  }, []);

  useEffect(() => {
    if (tenant?.activeFiscalYearId && !selectedFiscalYearId) {
      setSelectedFiscalYearId(tenant.activeFiscalYearId);
    } else if (!tenant?.activeFiscalYearId && fiscalYears && fiscalYears.length > 0 && !selectedFiscalYearId) {
      // Default to the most recent fiscal year if no active one is set
      setSelectedFiscalYearId(fiscalYears.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0].id);
    }
  }, [tenant, fiscalYears, selectedFiscalYearId]);

  const { data: journalEntries, isLoading: isLoadingEntries, error: entriesError } = useGetJournalEntries(tenantId, selectedFiscalYearId);
  const { data: selectedFiscalYearDetails, isLoading: isLoadingSelectedFiscalYear } = useGetFiscalYearById(tenantId, selectedFiscalYearId ?? null);
  
  const financialSummary: FinancialSummary | null = useMemo(() => {
    if (!chartOfAccounts || !journalEntries || !clientLoaded || !selectedFiscalYearDetails) return null;
    return calculateFinancialSummary(chartOfAccounts, journalEntries, selectedFiscalYearDetails);
  }, [chartOfAccounts, journalEntries, clientLoaded, selectedFiscalYearDetails]);
  
  const isLoadingData = isLoadingTenant || 
                        (clientLoaded && isLoadingCoA) || 
                        (clientLoaded && isLoadingEntries) || 
                        (clientLoaded && isLoadingFiscalYears) ||
                        (clientLoaded && selectedFiscalYearId && isLoadingSelectedFiscalYear);

  const combinedError = tenantError || coaError || entriesError;

  const formatDate = (dateString: string | Date | undefined) => {
    if (!clientLoaded || !dateString) return "";
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return format(date, "dd.MM.yyyy", { locale: de });
    } catch (e) {
      return "Ungültiges Datum";
    }
  };
  
  const accountingFeatures: AccountingFeatureCardProps[] = [
    {
      title: "Journal",
      description: "Buchungssätze erfassen und Hauptbuch führen.",
      icon: BookOpen,
      href: `/tenants/${tenantId}/accounting/journal`
    },
    {
      title: "Berichte",
      description: "Monatliche Erfolgsübersicht und weitere Finanzberichte.",
      icon: BarChartIconLucide,
      href: `/tenants/${tenantId}/accounting/reports`, 
      disabled: false, // Enabled
    }
  ];

  if (isLoadingData && !clientLoaded) { 
    return (
       <div className="space-y-6 p-4 md:p-8">
        <Skeleton className="h-10 w-1/3 mb-2" />
        <Skeleton className="h-6 w-2/3 mb-6" />
        <Skeleton className="h-10 w-1/2 mb-4" /> {/* Fiscal Year Selector Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 mb-6">
            {[...Array(6)].map((_, i) => (
            <Card key={`summary-skeleton-${i}`}>
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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={`feature-skeleton-${i}`} className="h-32 w-full rounded-lg" />
          ))}
        </div>
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-5 w-3/4" />
            </CardHeader>
            <CardContent>
                 <Skeleton className="h-32 w-full" />
            </CardContent>
        </Card>
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
  
  const getOverviewSubtitle = () => {
    if (isLoadingSelectedFiscalYear && selectedFiscalYearId) return "Lade Geschäftsjahres Info...";
    if (selectedFiscalYearDetails) {
      return `Finanzübersicht für Geschäftsjahr: ${selectedFiscalYearDetails.name} (${formatDate(selectedFiscalYearDetails.startDate)} - ${formatDate(selectedFiscalYearDetails.endDate)})`;
    }
    if (tenant && !selectedFiscalYearId && fiscalYears && fiscalYears.length === 0) {
       return "Keine Geschäftsjahre definiert. Bitte in Einstellungen anlegen.";
    }
    return "Finanzielle Zusammenfassung (Bitte Geschäftsjahr wählen)";
  }


  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="px-4 md:px-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
            <div className="flex items-center mb-2 sm:mb-0">
                <BookOpen className="h-8 w-8 mr-3 text-primary" />
                <h1 className="text-3xl font-bold">Buchhaltung: {tenant?.name || (isLoadingTenant ? "Lade..." : "Unbekannt")}</h1>
            </div>
            {clientLoaded && fiscalYears && fiscalYears.length > 0 && (
                <div className="w-full sm:w-auto min-w-[250px]">
                    <Select
                        value={selectedFiscalYearId}
                        onValueChange={setSelectedFiscalYearId}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Geschäftsjahr wählen..." />
                        </SelectTrigger>
                        <SelectContent>
                        {fiscalYears.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()).map((fy) => (
                            <SelectItem key={fy.id} value={fy.id}>
                            {fy.name} ({formatDate(fy.startDate)} - {formatDate(fy.endDate)})
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>
        <p className="text-lg text-muted-foreground">
          Finanzmanagement und Buchführung für {tenant?.name || (isLoadingTenant ? "Lade..." : "Unbekannt")}.
        </p>
         {clientLoaded && fiscalYears && fiscalYears.length === 0 && !isLoadingFiscalYears && (
            <Card className="mt-4 border-destructive">
                <CardHeader className="flex-row items-center gap-2">
                    <AlertCircle className="text-destructive h-5 w-5"/>
                    <CardTitle className="text-destructive text-lg">Keine Geschäftsjahre</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Für diesen Mandanten wurden noch keine Geschäftsjahre definiert. Bitte legen Sie zuerst Geschäftsjahre in den <a href={`/tenants/${tenantId}/settings/fiscal-years`} className="underline hover:text-primary">Einstellungen</a> an.</p>
                </CardContent>
            </Card>
        )}
      </div>

      <GlobalSummaryCards summary={financialSummary} isLoading={isLoadingData || !clientLoaded} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 md:px-0">
        {accountingFeatures.map(feature => (
          <AccountingFeatureCard key={feature.href} {...feature} />
        ))}
      </div>
      
      <Card className="shadow-xl mx-4 md:mx-0">
        <CardHeader>
            <CardTitle className="text-2xl font-bold">Finanzübersicht im Detail</CardTitle>
             <CardDescription className="flex items-center">
                <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground"/> {getOverviewSubtitle()}
            </CardDescription>
        </CardHeader>
        <CardContent>
            {isLoadingData && clientLoaded && <Loader2 className="mx-auto my-8 h-12 w-12 animate-spin text-primary" />}
            
            {!isLoadingData && clientLoaded && chartOfAccounts && selectedFiscalYearDetails && (
                <AccountingOverview 
                    summary={financialSummary} 
                    isLoading={isLoadingCoA || isLoadingEntries || !clientLoaded || isLoadingSelectedFiscalYear} 
                    chartOfAccounts={chartOfAccounts}
                    selectedFiscalYear={selectedFiscalYearDetails}
                />
            )}
            
            {!isLoadingData && clientLoaded && !chartOfAccounts && tenant?.chartOfAccountsId && (
                <div className="text-destructive">
                    <p className="font-semibold">Kontenplan konnte nicht geladen werden.</p>
                    <p>Die Finanzübersicht kann nicht angezeigt werden, da der zugehörige Kontenplan nicht verfügbar ist.</p>
                </div>
            )}
             {!isLoadingData && clientLoaded && !financialSummary && chartOfAccounts && selectedFiscalYearDetails && (
                 <p className="text-muted-foreground">Keine Buchungsdaten für die detaillierte Übersicht im gewählten Geschäftsjahr vorhanden.</p>
            )}
             {!isLoadingData && clientLoaded && !selectedFiscalYearDetails && fiscalYears && fiscalYears.length > 0 && (
                 <p className="text-muted-foreground">Bitte wählen Sie ein Geschäftsjahr aus, um die detaillierte Übersicht anzuzeigen.</p>
            )}
        </CardContent>
      </Card>

    </div>
  );
}


    