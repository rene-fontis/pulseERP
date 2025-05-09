
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PlusCircle, Edit, Trash2, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDescriptionComponent, DialogTrigger } from '@/components/ui/dialog';
import { BudgetEntryForm } from '@/components/budget/BudgetEntryForm';
import { useGetBudgetById } from '@/hooks/useBudgets';
import { useGetBudgetEntries, useAddBudgetEntry, useUpdateBudgetEntry, useDeleteBudgetEntry } from '@/hooks/useBudgetEntries';
import type { BudgetEntry, NewBudgetEntryPayload } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

export default function BudgetEntriesPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const budgetId = params.budgetId as string;

  const { data: budget, isLoading: isLoadingBudget, error: budgetError } = useGetBudgetById(budgetId);
  const { data: budgetEntries, isLoading: isLoadingEntries, error: entriesError } = useGetBudgetEntries(budgetId);
  
  const addEntryMutation = useAddBudgetEntry(budgetId);
  const updateEntryMutation = useUpdateBudgetEntry(budgetId);
  const deleteEntryMutation = useDeleteBudgetEntry(budgetId);
  const { toast } = useToast();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<BudgetEntry | null>(null);
  const [clientLoaded, setClientLoaded] = useState(false);

  useEffect(() => {
    setClientLoaded(true);
  }, []);

  const handleCreateEntry = async (values: NewBudgetEntryPayload) => {
    try {
      await addEntryMutation.mutateAsync(values);
      toast({ title: "Erfolg", description: "Budgeteintrag erfolgreich erstellt." });
      setIsCreateModalOpen(false);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast({ title: "Fehler", description: `Eintrag konnte nicht erstellt werden: ${errorMessage}`, variant: "destructive" });
    }
  };

  const handleEditEntry = (entry: BudgetEntry) => {
    setSelectedEntry(entry);
    setIsEditModalOpen(true);
  };

  const handleUpdateEntry = async (values: NewBudgetEntryPayload) => { // This should be Partial<BudgetEntryFormValues> but payload for mutation matches New
    if (!selectedEntry) return;
    try {
      // Map form values to a partial of BudgetEntry if necessary, or ensure form output matches service update input
      await updateEntryMutation.mutateAsync({ entryId: selectedEntry.id, data: values as any });
      toast({ title: "Erfolg", description: "Budgeteintrag erfolgreich aktualisiert." });
      setIsEditModalOpen(false);
      setSelectedEntry(null);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast({ title: "Fehler", description: `Eintrag konnte nicht aktualisiert werden: ${errorMessage}`, variant: "destructive" });
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await deleteEntryMutation.mutateAsync(entryId);
      toast({ title: "Erfolg", description: "Budgeteintrag erfolgreich gelöscht." });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast({ title: "Fehler", description: `Eintrag konnte nicht gelöscht werden: ${errorMessage}`, variant: "destructive" });
    }
  };
  
  const formatDateRange = (startDate?: string, endDate?: string) => {
    if (!clientLoaded) return "Lädt...";
    if (!startDate) return "-";
    const start = format(parseISO(startDate), "dd.MM.yy", { locale: de });
    if (!endDate) return start;
    const end = format(parseISO(endDate), "dd.MM.yy", { locale: de });
    return `${start} - ${end}`;
  };

  const isLoading = isLoadingBudget || isLoadingEntries || !clientLoaded;
  const combinedError = budgetError || entriesError;

  if (isLoading && !clientLoaded) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-1/4 mb-2" />
        <Skeleton className="h-6 w-1/2 mb-6" />
        <Card>
            <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
            <CardContent><Skeleton className="h-40 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  if (combinedError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Budgetdaten</h2>
        <p>{(combinedError as Error).message}</p>
      </div>
    );
  }

  if (!budget && !isLoadingBudget && clientLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Budget nicht gefunden</h2>
         <Button variant="link" asChild><Link href={`/tenants/${tenantId}/budgeting`}>Zurück zur Budgetübersicht</Link></Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Button variant="outline" size="sm" onClick={() => router.push(`/tenants/${tenantId}/budgeting`)} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Zurück zur Budgetübersicht
        </Button>
      <div className="mb-6">
        <div className="flex items-center mb-1">
            {/* Icon for budget entries, e.g., ListChecks or similar */}
          <h1 className="text-3xl font-bold">Budgeteinträge: {budget?.name || ''}</h1>
        </div>
        <p className="text-muted-foreground">
          Verwalten Sie die einzelnen Einträge für das Budget "{budget?.name}" (Szenario: {budget?.scenario}).
        </p>
      </div>

      <Card className="shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Einträge</CardTitle>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                <PlusCircle className="mr-2 h-4 w-4" /> Eintrag hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Neuen Budgeteintrag erstellen</DialogTitle>
                <DialogDescriptionComponent>
                  Definieren Sie einen neuen Eintrag für das Budget.
                </DialogDescriptionComponent>
              </DialogHeader>
              <BudgetEntryForm 
                budgetId={budgetId}
                tenantId={tenantId}
                onSubmit={handleCreateEntry} 
                isSubmitting={addEntryMutation.isPending} 
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoadingEntries && clientLoaded ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead>Konto</TableHead>
                    <TableHead>Gegenkonto</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Wiederholung</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgetEntries && budgetEntries.length > 0 ? budgetEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium max-w-xs truncate" title={entry.description}>{entry.description}</TableCell>
                      <TableCell>{entry.accountName || entry.accountNumber || entry.accountId.slice(0,6)}</TableCell>
                      <TableCell>{entry.counterAccountName || entry.counterAccountNumber || '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.amount)}</TableCell>
                      <TableCell>
                         <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${entry.type === 'Income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {entry.type === 'Income' ? 'Einnahme' : 'Ausgabe'}
                        </span>
                      </TableCell>
                      <TableCell>{entry.isRecurring ? formatDateRange(entry.startDate, entry.endDate) : (entry.startDate ? formatDateRange(entry.startDate) : '-')}</TableCell>
                      <TableCell>{entry.isRecurring ? entry.recurrence === "Monthly" ? "Monatlich" : entry.recurrence === "Quarterly" ? "Quartalsweise" : entry.recurrence === "Yearly" ? "Jährlich" : "Keine"  : '-'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleEditEntry(entry)} title="Eintrag bearbeiten">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" title="Eintrag löschen" disabled={deleteEntryMutation.isPending && deleteEntryMutation.variables === entry.id}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Diese Aktion kann nicht rückgängig gemacht werden. Der Eintrag "{entry.description}" wird dauerhaft gelöscht.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                disabled={deleteEntryMutation.isPending && deleteEntryMutation.variables === entry.id}
                              >
                                {(deleteEntryMutation.isPending && deleteEntryMutation.variables === entry.id) ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Löschen'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                        Keine Einträge für dieses Budget gefunden.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedEntry && (
        <Dialog open={isEditModalOpen} onOpenChange={(isOpen) => {
          setIsEditModalOpen(isOpen);
          if (!isOpen) setSelectedEntry(null);
        }}>
          <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Budgeteintrag bearbeiten: {selectedEntry.description}</DialogTitle>
              <DialogDescriptionComponent>
                Aktualisieren Sie die Details des Eintrags.
              </DialogDescriptionComponent>
            </DialogHeader>
            <BudgetEntryForm 
              budgetId={budgetId}
              tenantId={tenantId}
              onSubmit={handleUpdateEntry as any} // Cast as NewBudgetEntryPayload might be slightly off from update payload type
              initialData={selectedEntry}
              isSubmitting={updateEntryMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
```