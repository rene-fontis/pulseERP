"use client";

import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, AlertCircle, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useGetTenantById } from '@/hooks/useTenants';
// import { useGetJournalEntries, useDeleteJournalEntry } from '@/hooks/useJournalEntries'; 
import type { JournalEntry } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import React, { useState, useEffect } from 'react';

// Placeholder hooks
const useGetJournalEntries = (tenantId: string | null) => {
    return { data: [] as JournalEntry[], isLoading: tenantId ? true : false, error: null };
}
const useDeleteJournalEntry = () => {
    return { mutateAsync: async (id: string) => { console.log("Delete", id); return Promise.resolve(); }, isPending: false };
}


export default function TenantJournalPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { data: tenant, isLoading: isLoadingTenant, error: tenantError } = useGetTenantById(tenantId);
  const { toast } = useToast();
  const [clientLoaded, setClientLoaded] = useState(false);

  useEffect(() => {
    setClientLoaded(true);
  }, []);

  const { data: journalEntries, isLoading: isLoadingEntries, error: entriesError } = useGetJournalEntries(tenantId);
  // const deleteEntryMutation = useDeleteJournalEntry();


  const handleDeleteEntry = async (entryId: string) => {
    // try {
    //   await deleteEntryMutation.mutateAsync(entryId);
    //   toast({ title: "Erfolg", description: "Buchungssatz gelöscht." });
    // } catch (e) {
    //   toast({ title: "Fehler", description: "Buchungssatz konnte nicht gelöscht werden.", variant: "destructive" });
    // }
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


  if (isLoadingTenant || (tenantId && isLoadingEntries && !clientLoaded)) {
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

  if (tenantError || entriesError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4 md:p-8">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden des Journals</h2>
        <p>{(tenantError as Error)?.message || (entriesError as Error)?.message}</p>
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

  return (
    <div className="container mx-auto py-8">
       <Card className="shadow-xl mx-4 md:mx-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center">
            <BookOpen className="h-6 w-6 mr-3 text-primary" />
            <CardTitle className="text-2xl font-bold">Journal: {tenant.name}</CardTitle>
          </div>
           <Button className="bg-accent text-accent-foreground hover:bg-accent/90" disabled>
            <PlusCircle className="mr-2 h-4 w-4" /> Neue Buchung (Demnächst)
          </Button>
        </CardHeader>
        <CardContent>
            <CardDescription className="mb-4">
                Erfassen und verwalten Sie hier alle Buchungssätze für {tenant.name}.
            </CardDescription>
          {(isLoadingEntries && !clientLoaded) ? ( // Show skeleton only if entries are loading and client hasn't finished initial load
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
                  {journalEntries && journalEntries.length > 0 ? journalEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{formatDate(entry.date)}</TableCell>
                      <TableCell>{entry.entryNumber}</TableCell>
                      <TableCell className="font-medium max-w-xs truncate" title={entry.description}>{entry.description}</TableCell>
                      {/* Assuming simple single debit/credit for placeholder */}
                      <TableCell>{entry.lines[0]?.debit ? `${entry.lines[0].accountNumber} ${entry.lines[0].accountName}` : '-'}</TableCell>
                      <TableCell>{entry.lines[0]?.credit ? `${entry.lines[0].accountNumber} ${entry.lines[0].accountName}` : '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.lines[0]?.debit || entry.lines[0]?.credit)}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="outline" size="icon" disabled title="Buchung bearbeiten (Demnächst)">
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDeleteEntry(entry.id)} disabled title="Buchung löschen (Demnächst)">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
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

      {/* Dialog for new/edit journal entry will go here */}
      {/* <JournalEntryForm tenantId={tenantId} /> */}
    </div>
  );
}
