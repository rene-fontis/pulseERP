"use client";

import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription as DialogDescriptionComponent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText as FileTextIcon, AlertCircle, Edit, Loader2 } from 'lucide-react'; 
import { useGetTenantById } from '@/hooks/useTenants'; 
import { useGetTenantChartOfAccountsById, useUpdateTenantChartOfAccounts } from '@/hooks/useTenantChartOfAccounts'; 
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import React, { useState, useEffect, useMemo } from 'react';
import { TenantChartOfAccountsForm, type TenantChartOfAccountsFormValues } from '@/components/tenants/TenantChartOfAccountsForm';
import { useToast } from '@/hooks/use-toast';
import type { TenantChartOfAccounts, AccountGroup } from '@/types';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';

interface GroupDisplayProps {
  group: AccountGroup;
  allGroups: AccountGroup[]; // Pass all groups for subgroup lookup
  level: number;
}

const GroupDisplay: React.FC<GroupDisplayProps> = ({ group, allGroups, level }) => {
  // Find subgroups specifically for *this* group from the complete list
  const subgroups = allGroups.filter(g => g.parentId === group.id && !g.isFixed);
  const cardPadding = level === 0 ? "p-4" : "p-3"; // Less padding for subgroups
  const titleSize = level === 0 ? "text-lg" : "text-md";

  return (
    <Card className={cn("bg-background/50", cardPadding, level > 0 && "ml-0")}>
      <CardHeader className="p-0 pb-2">
        <CardTitle className={titleSize}>
          {group.name} <span className="text-sm font-normal text-muted-foreground">({group.mainType})</span>
          {group.isFixed && <span className="ml-2 text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">Fixe Hauptgruppe</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {group.accounts.length > 0 && (
          <div className="overflow-x-auto mt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px] h-8">Nummer</TableHead>
                  <TableHead className="h-8">Name</TableHead>
                  <TableHead className="h-8">Beschreibung</TableHead>
                  <TableHead className="text-right h-8">Anfangsbestand</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium py-2">{account.number}</TableCell>
                    <TableCell className="py-2">{account.name}</TableCell>
                    <TableCell className="py-2">{account.description || '-'}</TableCell>
                    <TableCell className="text-right py-2">{formatCurrency(account.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {group.accounts.length === 0 && !subgroups.length && (
           <p className="text-sm text-muted-foreground py-2">Keine Konten oder Untergruppen in dieser Gruppe.</p>
        )}

        {/* Render Subgroups */}
        {subgroups.length > 0 && (
          <div className="mt-3 space-y-3 pl-4 border-l"> {/* Indentation for subgroups */}
            {subgroups.map(subG => (
              <GroupDisplay key={subG.id} group={subG} allGroups={allGroups} level={level + 1} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};


export default function TenantChartOfAccountsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { data: tenant, isLoading: isLoadingTenant, error: tenantError } = useGetTenantById(tenantId);
  
  const { data: chartOfAccounts, isLoading: isLoadingCoA, error: coaError, refetch: refetchCoA } = useGetTenantChartOfAccountsById(tenant?.chartOfAccountsId);
  const updateCoAMutation = useUpdateTenantChartOfAccounts();
  const { toast } = useToast();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [clientLoaded, setClientLoaded] = useState(false);

  useEffect(() => {
    setClientLoaded(true);
  }, []);

  const handleUpdateCoA = async (values: TenantChartOfAccountsFormValues) => {
    if (!chartOfAccounts) {
      toast({ title: "Fehler", description: "Kein Kontenplan zum Aktualisieren vorhanden.", variant: "destructive" });
      return;
    }
    try {
      await updateCoAMutation.mutateAsync({ coaId: chartOfAccounts.id, data: values });
      toast({ title: "Erfolg", description: "Kontenplan erfolgreich aktualisiert." });
      setIsEditModalOpen(false);
      refetchCoA();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast({ title: "Fehler", description: `Kontenplan konnte nicht aktualisiert werden: ${errorMessage}`, variant: "destructive" });
    }
  };

  const topLevelFixedGroups = useMemo(() => {
    if (!chartOfAccounts) return [];
    return chartOfAccounts.groups.filter(g => g.isFixed && g.level === 0)
      .sort((a, b) => { 
        const order: AccountGroup['mainType'][] = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
        return order.indexOf(a.mainType) - order.indexOf(b.mainType);
      });
  }, [chartOfAccounts]);


  if (isLoadingTenant || (clientLoaded && tenant?.chartOfAccountsId && isLoadingCoA)) {
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
        <p>{(tenantError as Error)?.message}</p>
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
  const coaStillLoading = clientLoaded && tenant.chartOfAccountsId && isLoadingCoA;


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
          <CardTitle className="text-xl">Aktiver Kontenplan</CardTitle>
           <CardDescription>
            Hier können Sie die Hauptgruppen, Untergruppen und deren Konten einsehen und bearbeiten.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {coaStillLoading && (
            <div className="text-center py-10 text-muted-foreground">
                <Loader2 className="mx-auto h-12 w-12 mb-4 animate-spin text-primary" />
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
                    <Link href={`/manage-tenants`}>Zur Mandantenübersicht</Link>
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
             <div>
                <div className="mb-4">
                    <h2 className="text-lg font-semibold">Name: {chartOfAccounts.name}</h2>
                </div>

                <div className="space-y-4">
                  {/* Render top-level fixed groups. GroupDisplay will handle rendering their subgroups. */}
                  {topLevelFixedGroups.map((group) => (
                    <GroupDisplay key={group.id} group={group} allGroups={chartOfAccounts.groups} level={0} />
                  ))}
                </div>
                <div className="mt-6 border-t pt-6 flex justify-end">
                  <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                        <Edit className="mr-2 h-4 w-4" />
                        Kontenplan bearbeiten
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh]">
                      <DialogHeader>
                        <DialogTitle>Kontenplan bearbeiten: {chartOfAccounts.name}</DialogTitle>
                        <DialogDescriptionComponent>
                          Aktualisieren Sie die Details des Kontenplans. Hauptgruppen sind fix.
                        </DialogDescriptionComponent>
                      </DialogHeader>
                      <TenantChartOfAccountsForm
                        onSubmit={handleUpdateCoA}
                        initialData={chartOfAccounts}
                        isSubmitting={updateCoAMutation.isPending}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

