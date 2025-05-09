
"use client";

import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription as DialogDescriptionComponent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BookOpen, AlertCircle, PlusCircle, Edit, Trash2, Loader2, CalendarOff } from 'lucide-react';
import { useGetTenantById } from '@/hooks/useTenants';
import { useGetTenantChartOfAccountsById } from '@/hooks/useTenantChartOfAccounts';
import { useGetFiscalYearById } from '@/hooks/useFiscalYears';
import { useGetJournalEntries, useAddJournalEntry, useDeleteJournalEntry } from '@/hooks/useJournalEntries'; 
import type { Account, NewJournalEntryPayload, FiscalYear } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import React, { useState, useEffect, useMemo } from 'react';
import { JournalEntryForm } from '@/components/journal-entries/JournalEntryForm';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDescriptionRadix, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


export default function TenantJournalPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { data: tenant, isLoading: isLoadingTenant, error: tenantError } = useGetTenantById(tenantId);
  const { data: chartOfAccounts, isLoading: isLoadingCoA, error: coaError } = useGetTenantChartOfAccountsById(tenant?.chartOfAccountsId);
  
  const { data: activeFiscalYear, isLoading: isLoadingActiveFiscalYear, error: activeFiscalYearError } = useGetFiscalYearById(tenantId, tenant?.activeFiscalYearId ?? null);

  const { toast } = useToast();
  const [clientLoaded, setClientLoaded] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    setClientLoaded(true);
  }, []);

  const { data: journalEntriesData, isLoading: isLoadingEntries, error: entriesError } = useGetJournalEntries(tenantId, tenant?.activeFiscalYearId);
  const addEntryMutation = useAddJournalEntry(tenantId);
  const deleteEntryMutation = useDeleteJournalEntry(tenantId);


  const allAccounts: Account[] = useMemo(() => {
    if (!chartOfAccounts) return [];
    return chartOfAccounts.groups.flatMap(group => group.accounts);
  }, [chartOfAccounts]);

  const handleCreateJournalEntry = async (values: NewJournalEntryPayload) => {
    if (!tenant?.activeFiscalYearId) {
        toast({ title: "Fehler", description: "Kein aktives Geschäftsjahr ausgewählt.", variant: "destructive" });
        return;
    }
    try {
      await addEntryMutation.mutateAsync({...values, tenantId: tenantId, fiscalYearId: tenant.activeFiscalYearId});
      toast({ title: "Erfolg", description: "Buchungssatz erstellt." });
      setIsCreateModalOpen(false);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast({ title: "Fehler", description: `Buchungssatz konnte nicht erstellt werden: ${errorMessage}`, variant: "destructive" });
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
     try {
      await deleteEntryMutation.mutateAsync(entryId);
      toast({ title: "Erfolg", description: "Buchungssatz gelöscht." });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast({ title: "Fehler", description: `Buchungssatz konnte nicht gelöscht werden: ${errorMessage}`, variant: "destructive" });
    }
  };
  
  const formatDate = (dateInput: string | Date) => {
    if (!clientLoaded || !dateInput) return "Lädt...";
    try {
      const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
      return format(date, "PP", { locale: de });
    } catch (e) {
      return "Ungültiges Datum";
    }
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null || !clientLoaded) return '';
    return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(amount);
  }
  
  const isLoading = isLoadingTenant || isLoadingActiveFiscalYear || (tenantId && isLoadingEntries && !clientLoaded) || (tenant?.chartOfAccountsId && isLoadingCoA);

  if (isLoading && !clientLoaded) { 
    return (
       <div className="space-y-6 p-4 md:p-8">
        <Skeleton className="h-10 w-1/3 mb-2" />
        <Skeleton className="h-6 w-2/3 mb-6" />
        <Card>
          <CardHeader>
             <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-10 w-32" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </CardContent>
        </Card>
      </div>
    );
  }

  const combinedError = tenantError || entriesError || coaError || activeFiscalYearError;
  if (combinedError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4 md:p-8">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden des Journals</h2>
        <p>{(combinedError as Error)?.message}</p>
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

   if (tenant && !tenant.chartOfAccountsId && !isLoadingCoA) {
    return (
      <div className="container mx-auto py-8 text-center">
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

  if (tenant && tenant.chartOfAccountsId && !chartOfAccounts && !isLoadingCoA) {
     return (
      <div className="container mx-auto py-8 text-center">
        <AlertCircle className="w-16 h-16 mb-4 mx-auto text-destructive" />
        <h2 className="text-2xl font-semibold mb-2">Kontenplan nicht gefunden</h2>
        <p>Der zugewiesene Kontenplan konnte nicht geladen werden.</p>
        <p>Bitte überprüfen Sie die Mandanteneinstellungen.</p>
         <Button asChild variant="link" className="mt-4">
            <a href={`/tenants/${tenantId}/settings/chart-of-accounts`}>Zu Kontenplan Einstellungen</a>
        </Button>
      </div>
    );
  }

  if (tenant && !tenant.activeFiscalYearId && !isLoadingActiveFiscalYear) {
    return (
      <div className="container mx-auto py-8 text-center">
        <CalendarOff className="w-16 h-16 mb-4 mx-auto text-primary" />
        <h2 className="text-2xl font-semibold mb-2">Kein aktives Geschäftsjahr</h2>
        <p className="text-muted-foreground">Für diesen Mandanten ist kein Geschäftsjahr als aktiv markiert.</p>
        <p className="text-sm text-muted-foreground">Bitte wählen Sie ein aktives Geschäftsjahr in den <a href={`/tenants/${tenantId}/settings/fiscal-years`} className="underline hover:text-primary">Geschäftsjahr-Einstellungen</a>, um Buchungen zu erfassen.</p>
      </div>
    );
  }
    if (tenant && tenant.activeFiscalYearId && !activeFiscalYear && !isLoadingActiveFiscalYear) {
    return (
      <div className="container mx-auto py-8 text-center">
        <AlertCircle className="w-16 h-16 mb-4 mx-auto text-destructive" />
        <h2 className="text-2xl font-semibold mb-2">Aktives Geschäftsjahr nicht gefunden</h2>
        <p className="text-muted-foreground">Das als aktiv markierte Geschäftsjahr konnte nicht geladen werden.</p>
         <p className="text-sm text-muted-foreground">Bitte überprüfen Sie die <a href={`/tenants/${tenantId}/settings/fiscal-years`} className="underline hover:text-primary">Geschäftsjahr-Einstellungen</a>.</p>
      </div>
    );
  }

  const journalEntries = journalEntriesData || [];

  return (
    <div className="container mx-auto py-8">
       <Card className="shadow-xl mx-4 md:mx-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center">
            <BookOpen className="h-6 w-6 mr-3 text-primary" />
            <div>
                <CardTitle className="text-2xl font-bold">Journal: {tenant?.name || 'Lädt...'}</CardTitle>
                {activeFiscalYear && <CardDescription>Aktives Geschäftsjahr: {activeFiscalYear.name} ({formatDate(activeFiscalYear.startDate)} - {formatDate(activeFiscalYear.endDate)})</CardDescription>}
            </div>
          </div>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-accent text-accent-foreground hover:bg-accent/90" 
                disabled={!chartOfAccounts || allAccounts.length === 0 || !activeFiscalYear || isLoadingActiveFiscalYear}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Neue Buchung
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Neue Buchung erstellen</DialogTitle>
                <DialogDescriptionComponent>
                  Erfassen Sie einen neuen Buchungssatz für {tenant?.name} im Geschäftsjahr {activeFiscalYear?.name}.
                </DialogDescriptionComponent>
              </DialogHeader>
              {(isLoadingCoA || isLoadingActiveFiscalYear) && !clientLoaded ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2">Daten werden geladen...</p>
                </div>
              ) : allAccounts.length > 0 && activeFiscalYear ? (
                <JournalEntryForm
                  tenantId={tenantId}
                  accounts={allAccounts}
                  activeFiscalYear={activeFiscalYear}
                  onSubmit={handleCreateJournalEntry}
                  isSubmitting={addEntryMutation.isPending}
                  defaultEntryNumber={`BU-${String(journalEntries.length + 1).padStart(3, '0')}`}
                />
              ) : (
                 <div className="text-center py-4">
                    <p className="text-muted-foreground">Voraussetzungen nicht erfüllt.</p>
                    {!activeFiscalYear && <p className="text-sm text-muted-foreground">Kein aktives Geschäftsjahr.</p>}
                    {allAccounts.length === 0 && <p className="text-sm text-muted-foreground">Keine Konten im Kontenplan.</p>}
                 </div>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
            <CardDescription className="mb-4">
                Erfassen und verwalten Sie hier alle Buchungssätze für {tenant?.name}.
            </CardDescription>
          {(isLoadingEntries && !clientLoaded && !journalEntriesData) ? ( 
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Nr.</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead>Soll</TableHead>
                    <TableHead>Haben</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalEntries.length > 0 ? journalEntries.map((entry) => {
                    const debitLine = entry.lines.find(l => l.debit && l.debit > 0);
                    const creditLine = entry.lines.find(l => l.credit && l.credit > 0);
                    return (
                    <TableRow key={entry.id}>
                      <TableCell>{formatDate(entry.date)}</TableCell>
                      <TableCell>{entry.entryNumber}</TableCell>
                      <TableCell className="font-medium max-w-xs truncate" title={entry.description}>{entry.description}</TableCell>
                      <TableCell>{debitLine ? `${debitLine.accountNumber} ${debitLine.accountName}` : '-'}</TableCell>
                      <TableCell>{creditLine ? `${creditLine.accountNumber} ${creditLine.accountName}` : '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(debitLine?.debit || creditLine?.credit)}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="outline" size="icon" disabled title="Buchung bearbeiten (Demnächst)">
                            <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                             <Button variant="destructive" size="icon" title="Buchung löschen" disabled={deleteEntryMutation.isPending && deleteEntryMutation.variables === entry.id}>
                                <Trash2 className="h-4 w-4" />
                             </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                              <AlertDialogDescriptionRadix>
                                Diese Aktion kann nicht rückgängig gemacht werden. Der Buchungssatz "{entry.entryNumber}: {entry.description}" wird dauerhaft gelöscht.
                              </AlertDialogDescriptionRadix>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                disabled={deleteEntryMutation.isPending && deleteEntryMutation.variables === entry.id}
                              >
                                {(deleteEntryMutation.isPending && deleteEntryMutation.variables === entry.id) ? 'Löschen...' : 'Löschen'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  )}) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        Keine Buchungssätze für das aktive Geschäftsjahr gefunden.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}