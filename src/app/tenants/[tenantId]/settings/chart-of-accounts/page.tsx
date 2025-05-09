"use client";

import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText as FileTextIcon, AlertCircle } from 'lucide-react'; 
import { useGetTenantById } from '@/hooks/useTenants'; 
import { useGetTenantChartOfAccountsById } from '@/hooks/useTenantChartOfAccounts'; 
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function TenantChartOfAccountsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { data: tenant, isLoading: isLoadingTenant, error: tenantError } = useGetTenantById(tenantId);
  
  const { data: chartOfAccounts, isLoading: isLoadingCoA, error: coaError } = useGetTenantChartOfAccountsById(tenant?.chartOfAccountsId);


  if (isLoadingTenant || (tenant?.chartOfAccountsId && isLoadingCoA)) {
    return (
       <div className="space-y-6 p-4 md:p-8">
        <Skeleton className="h-10 w-1/3 mb-2" />
        <Skeleton className="h-6 w-2/3 mb-6" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" /> 
            <Skeleton className="h-10 w-1/5" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tenantError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4 md:p-8">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden des Mandanten</h2>
        <p>{tenantError.message}</p>
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

  if (coaError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4 md:p-8">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden des Kontenplans</h2>
        <p>{(coaError as Error).message}</p>
      </div>
    );
  }
  
  const hasCoaAssigned = !!tenant.chartOfAccountsId;
  const coaStillLoading = tenant.chartOfAccountsId && isLoadingCoA;


  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 px-4 md:px-0">
        <div className="flex items-center mb-2">
            <FileTextIcon className="h-8 w-8 mr-3 text-primary" />
            <h1 className="text-2xl font-bold">Kontenplan: {tenant.name}</h1>
        </div>
        <p className="text-muted-foreground">
          Verwalten Sie den spezifischen Kontenplan für {tenant.name}.
        </p>
      </div>
      
      <Card className="shadow-lg mx-4 md:mx-0">
        <CardHeader>
          <CardTitle className="text-xl">Kontengruppen und Konten</CardTitle>
           <CardDescription>
            Hier können Sie die Kontengruppen (Aktiven, Passiven, Aufwand, Ertrag) und deren Untergruppen sowie einzelne Konten bearbeiten.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {coaStillLoading && (
            <div className="text-center py-10 text-muted-foreground">
                <FileTextIcon className="mx-auto h-12 w-12 mb-4 animate-pulse text-primary" />
                <p>Kontenplan wird geladen...</p>
            </div>
          )}
          {!hasCoaAssigned && !coaStillLoading && (
            <div className="text-center py-10 text-muted-foreground">
                <FileTextIcon className="mx-auto h-12 w-12 mb-4 text-primary" />
                <p className="font-semibold">Kein Kontenplan zugewiesen</p>
                <p>Für diesen Mandanten ist noch kein spezifischer Kontenplan aktiv.</p>
                {tenant.chartOfAccountsTemplateId ? (
                   <p>Ein Kontenplan wurde basierend auf der Vorlage (ID: {tenant.chartOfAccountsTemplateId.slice(0,8)}...) bei der Mandantenerstellung angelegt. Wenn er hier nicht erscheint, könnte bei der Erstellung ein Fehler unterlaufen sein.</p>
                ) : (
                  <p>Es wurde keine Vorlage bei der Erstellung des Mandanten ausgewählt. Ein Kontenplan kann manuell erstellt oder eine Vorlage zugewiesen werden (Funktion Demnächst).</p>
                )}
                <Button asChild variant="link" className="mt-4">
                    <Link href="/manage-tenants">Zur Mandantenübersicht</Link>
                </Button>
            </div>
          )}
          {hasCoaAssigned && !coaStillLoading && !chartOfAccounts && (
             <div className="text-center py-10 text-muted-foreground">
                <AlertCircle className="mx-auto h-12 w-12 mb-4 text-destructive" />
                <p className="font-semibold">Kontenplan nicht gefunden</p>
                <p>Der zugewiesene Kontenplan (ID: {tenant.chartOfAccountsId}) konnte nicht geladen werden.</p>
             </div>
          )}
           {hasCoaAssigned && !coaStillLoading && chartOfAccounts && (
             <div className="text-center py-10 text-muted-foreground">
                <FileTextIcon className="mx-auto h-12 w-12 mb-4 text-primary" />
                <p className="font-semibold">Kontenplan Verwaltung</p>
                <p>Die detaillierte Ansicht und Bearbeitung des Kontenplans ist in Entwicklung.</p>
                <p>Aktueller Kontenplan Name: {chartOfAccounts.name || 'N/A'}</p>
             </div>
          )}
          <Button disabled className="bg-accent text-accent-foreground hover:bg-accent/90">Kontenplan bearbeiten (Demnächst)</Button>
        </CardContent>
      </Card>
    </div>
  );
}

