
"use client";

import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BookOpen, AlertCircle, PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import { useGetTenantById } from '@/hooks/useTenants';
import { useGetTenantChartOfAccountsById } from '@/hooks/useTenantChartOfAccounts';
// import { useGetJournalEntries, useDeleteJournalEntry, useAddJournalEntry } from '@/hooks/useJournalEntries'; 
import type { JournalEntry, Account } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import React, { useState, useEffect, useMemo } from 'react';
import { JournalEntryForm } from '@/components/journal-entries/JournalEntryForm';

// Placeholder hooks
const useGetJournalEntries = (tenantId: string | null) => {
    // Simulate fetching some initial entries. In a real app, this would be from a DB.
    const initialEntries: JournalEntry[] = tenantId ? [
        // { 
        //     id: 'entry1', tenantId, entryNumber: '2024-001', date: new Date('2024-01-15').toISOString(), 
        //     description: 'Bareinzahlung Kasse', posted: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        //     lines: [
        //         { id: 'line1a', accountId: 'kasse', accountNumber: '1000', accountName: 'Kasse', debit: 1000, description: 'Soll Kasse' },
        //         { id: 'line1b', accountId: 'bank', accountNumber: '1020', accountName: 'Bank', credit: 1000, description: 'Haben Bank' },
        //     ]
        // },
        // { 
        //     id: 'entry2', tenantId, entryNumber: '2024-002', date: new Date('2024-01-20').toISOString(), 
        //     description: 'Kauf Büromaterial', posted: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        //     lines: [
        //         { id: 'line2a', accountId: 'buero', accountNumber: '6500', accountName: 'Büroaufwand', debit: 150.75, description: 'Soll Büroaufwand' },
        //         { id: 'line2b', accountId: 'kasse', accountNumber: '1000', accountName: 'Kasse', credit: 150.75, description: 'Haben Kasse' },
        //     ]
        // }
    ] : [];
    const [entries, setEntries] = useState<JournalEntry[]>(initialEntries);
    const addEntry = (newEntry: JournalEntry) => {
        const fullEntry: JournalEntry = {
            ...newEntry,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        setEntries(prev => [fullEntry, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.entryNumber.localeCompare(a.entryNumber)));
    }
    return { data: entries, isLoading: false, error: null, addEntry };
}

const useDeleteJournalEntry = () => {
    // This would interact with the state from useGetJournalEntries or a global store/backend
    return { mutateAsync: async (id: string) => { console.log("Delete", id); return Promise.resolve(); }, isPending: false };
}


export default function TenantJournalPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { data: tenant, isLoading: isLoadingTenant, error: tenantError } = useGetTenantById(tenantId);
  const { data: chartOfAccounts, isLoading: isLoadingCoA, error: coaError } = useGetTenantChartOfAccountsById(tenant?.chartOfAccountsId);
  
  const { toast } = useToast();
  const [clientLoaded, setClientLoaded] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    setClientLoaded(true);
  }, []);

  const { data: journalEntriesData, isLoading: isLoadingEntries, error: entriesError, addEntry: addJournalEntry } = useGetJournalEntries(tenantId);
  // const deleteEntryMutation = useDeleteJournalEntry();
  // const addEntryMutation = useAddJournalEntry(); // Assuming a mutation hook for adding

  const allAccounts: Account[] = useMemo(() => {
    if (!chartOfAccounts) return [];
    return chartOfAccounts.groups.flatMap(group => group.accounts);
  }, [chartOfAccounts]);

  const handleCreateJournalEntry = async (values: JournalEntry) => {
    try {
      // await addEntryMutation.mutateAsync(values); // Use this with a real mutation
      addJournalEntry(values); // Using placeholder state update
      toast({ title: "Erfolg", description: "Buchungssatz erstellt." });
      setIsCreateModalOpen(false);
    } catch (e) {
      toast({ title: "Fehler", description: "Buchungssatz konnte nicht erstellt werden.", variant: "destructive" });
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    toast({title: "Platzhalter", description: `Löschen von ${entryId} noch nicht implementiert.`})
  };
  
  const formatDate = (dateString: string) => {
    if (!clientLoaded || !dateString) return "Lädt...";
    try {
      return format(new Date(dateString), "PP", { locale: de });
    } catch (e) {
      return "Ungültiges Datum";
    }
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null || !clientLoaded) return '';
    return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(amount);
  }
  
  const isLoading = isLoadingTenant || (tenantId && isLoadingEntries && !clientLoaded) || (tenant?.chartOfAccountsId && isLoadingCoA);

  if (isLoading) {
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
            <Skeleton className="h-10 w-full" /> {/* For table header */}
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)} {/* For table rows */}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tenantError || entriesError || coaError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4 md:p-8">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden des Journals</h2>
        <p>{(tenantError as Error)?.message || (entriesError as Error)?.message || (coaError as Error)?.message}</p>
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

   if (!tenant.chartOfAccountsId || !chartOfAccounts) {
    return (
      <div className="container mx-auto py-8 text-center">
        <AlertCircle className="w-16 h-16 mb-4 mx-auto text-destructive" />
        <h2 className="text-2xl font-semibold mb-2">Kontenplan nicht gefunden</h2>
        <p>Für diesen Mandanten wurde kein Kontenplan gefunden oder er konnte nicht geladen werden.</p>
        <p>Bitte überprüfen Sie die Mandanteneinstellungen.</p>
         <Button asChild variant="link" className="mt-4">
            <a href={`/tenants/${tenantId}/settings/chart-of-accounts`}>Zu Kontenplan Einstellungen</a>
        </Button>
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
            <CardTitle className="text-2xl font-bold">Journal: {tenant.name}</CardTitle>
          </div>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                <PlusCircle className="mr-2 h-4 w-4" /> Neue Buchung
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Neue Buchung erstellen</DialogTitle>
                <DialogDescription>
                  Erfassen Sie einen neuen Buchungssatz für {tenant.name}.
                </DialogDescription>
              </DialogHeader>
              {isLoadingCoA ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2">Kontenplan wird geladen...</p>
                </div>
              ) : allAccounts.length > 0 ? (
                <JournalEntryForm
                  tenantId={tenantId}
                  accounts={allAccounts}
                  onSubmit={handleCreateJournalEntry}
                  isSubmitting={false} // Replace with addEntryMutation.isPending when implemented
                  defaultEntryNumber={`BU-${String(journalEntries.length + 1).padStart(3, '0')}`}
                />
              ) : (
                 <div className="text-center py-4">
                    <p className="text-muted-foreground">Keine Konten im Kontenplan gefunden.</p>
                    <p className="text-sm text-muted-foreground">Bitte zuerst Konten im Kontenplan anlegen.</p>
                 </div>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
            <CardDescription className="mb-4">
                Erfassen und verwalten Sie hier alle Buchungssätze für {tenant.name}.
            </CardDescription>
          {(isLoadingEntries && !clientLoaded) ? ( 
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
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
                        <Button variant="destructive" size="icon" onClick={() => handleDeleteEntry(entry.id)} disabled title="Buchung löschen (Demnächst)">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        Keine Buchungssätze gefunden. Erstellen Sie einen, um loszulegen!
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

