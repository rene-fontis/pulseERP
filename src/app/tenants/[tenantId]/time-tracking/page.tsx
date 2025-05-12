"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Clock, PlusCircle, Edit, Trash2, AlertCircle, Loader2, PlayCircle, PauseCircle, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDescriptionComponent, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { TimeEntryForm } from "@/components/time-tracking/TimeEntryForm";
import { useGetTimeEntries, useAddTimeEntry, useUpdateTimeEntry, useDeleteTimeEntry } from "@/hooks/useTimeEntries";
import { useGetContacts } from "@/hooks/useContacts";
import { useGetProjects } from "@/hooks/useProjects";
import type { TimeEntry, NewTimeEntryPayload, Contact, Project, ProjectTask } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';

export default function TenantTimeTrackingPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [clientLoaded, setClientLoaded] = useState(false);

  useEffect(() => {
    setClientLoaded(true);
  }, []);

  const { data: timeEntries, isLoading: isLoadingEntries, error: entriesError } = useGetTimeEntries(tenantId);
  const { data: contacts, isLoading: isLoadingContacts } = useGetContacts(tenantId);
  const { data: projects, isLoading: isLoadingProjects } = useGetProjects(tenantId, ['Active', 'OnHold']);
  
  const addEntryMutation = useAddTimeEntry(tenantId);
  const updateEntryMutation = useUpdateTimeEntry(tenantId);
  const deleteEntryMutation = useDeleteTimeEntry(tenantId);

  const handleAddOrUpdateEntry = async (values: NewTimeEntryPayload) => {
    try {
      if (selectedEntry) {
        await updateEntryMutation.mutateAsync({ entryId: selectedEntry.id, data: values });
        toast({ title: "Erfolg", description: "Zeiteintrag erfolgreich aktualisiert." });
      } else {
        await addEntryMutation.mutateAsync(values);
        toast({ title: "Erfolg", description: "Zeiteintrag erfolgreich erstellt." });
      }
      setIsModalOpen(false);
      setSelectedEntry(null);
    } catch (e) {
      const error = e as Error;
      toast({ title: "Fehler", description: `Zeiteintrag konnte nicht ${selectedEntry ? 'aktualisiert' : 'erstellt'} werden: ${error.message}`, variant: "destructive" });
    }
  };

  const handleEditEntry = (entry: TimeEntry) => {
    setSelectedEntry(entry);
    setIsModalOpen(true);
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await deleteEntryMutation.mutateAsync(entryId);
      toast({ title: "Erfolg", description: "Zeiteintrag erfolgreich gelöscht." });
    } catch (e) {
      const error = e as Error;
      toast({ title: "Fehler", description: `Zeiteintrag konnte nicht gelöscht werden: ${error.message}`, variant: "destructive" });
    }
  };

  const formatDateForDisplay = (dateString?: string) => {
    if (!clientLoaded || !dateString) return "-";
    try {
      return format(parseISO(dateString), "dd.MM.yyyy", { locale: de });
    } catch (e) {
      return "Ungültiges Datum";
    }
  };

  const getRelatedName = (entry: TimeEntry): string => {
    if (entry.taskId && projects) {
        const project = projects.find(p => p.id === entry.projectId);
        const task = project?.tasks.find(t => t.id === entry.taskId);
        if (task) return `Aufgabe: ${task.name} (Projekt: ${project?.name || 'Unbekannt'})`;
    }
    if (entry.projectId && projects) {
      const project = projects.find(p => p.id === entry.projectId);
      if (project) return `Projekt: ${project.name}`;
    }
    if (entry.contactId && contacts) {
      const contact = contacts.find(c => c.id === entry.contactId);
      if (contact) return `Kontakt: ${contact.companyName || `${contact.firstName || ''} ${contact.name}`.trim()}`;
    }
    return "-";
  };


  const isLoading = (isLoadingEntries || isLoadingContacts || isLoadingProjects) && !clientLoaded;

  if (entriesError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Zeiteinträge</h2>
        <p>{entriesError.message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Clock className="h-8 w-8 mr-3 text-primary" />
          <h1 className="text-3xl font-bold">Zeiterfassung</h1>
        </div>
         <Dialog
            open={isModalOpen}
            onOpenChange={(isOpen) => {
              setIsModalOpen(isOpen);
              if (!isOpen) setSelectedEntry(null);
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                <PlusCircle className="mr-2 h-4 w-4" /> Zeiteintrag erstellen
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedEntry ? "Zeiteintrag bearbeiten" : "Neuen Zeiteintrag erstellen"}</DialogTitle>
              </DialogHeader>
              <TimeEntryForm
                tenantId={tenantId}
                onSubmit={handleAddOrUpdateEntry}
                initialData={selectedEntry}
                isSubmitting={addEntryMutation.isPending || updateEntryMutation.isPending}
              />
            </DialogContent>
          </Dialog>
      </div>
      
      {/* Placeholder for Timer Functionality */}
      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="text-xl">Live Zeiterfassung (Timer)</CardTitle>
            <CardDescription>Starten und stoppen Sie einen Timer für die automatische Zeiterfassung.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center sm:flex-row sm:justify-around gap-4 p-6">
            <div className="text-center">
                <p className="text-4xl font-bold text-primary">00:00:00</p>
                <p className="text-sm text-muted-foreground">Aktuelle Zeit</p>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" size="lg" className="bg-green-500 hover:bg-green-600 text-white" disabled>
                    <PlayCircle className="mr-2 h-5 w-5" /> Starten
                </Button>
                <Button variant="outline" size="lg" className="bg-yellow-500 hover:bg-yellow-600 text-white" disabled>
                    <PauseCircle className="mr-2 h-5 w-5" /> Pausieren
                </Button>
                 <Button variant="destructive" size="lg" disabled>
                    <StopCircle className="mr-2 h-5 w-5" /> Stoppen & Speichern
                </Button>
            </div>
             <p className="text-xs text-muted-foreground text-center sm:text-left w-full sm:w-auto mt-4 sm:mt-0">Timer-Funktionalität ist demnächst verfügbar.</p>
        </CardContent>
      </Card>


      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Erfasste Zeiten</CardTitle>
          <CardDescription>Liste aller manuell erfassten Zeiteinträge.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Stunden</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead>Bezug zu</TableHead>
                    <TableHead className="text-right">Satz (CHF)</TableHead>
                    <TableHead>Verrechenbar</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeEntries && timeEntries.length > 0 ? (
                    timeEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{formatDateForDisplay(entry.date)}</TableCell>
                        <TableCell>{entry.hours.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="max-w-xs truncate" title={entry.description}>{entry.description || "-"}</TableCell>
                        <TableCell>{getRelatedName(entry)}</TableCell>
                        <TableCell className="text-right">{entry.rate ? formatCurrency(entry.rate) : "-"}</TableCell>
                        <TableCell>{entry.isBillable ? "Ja" : "Nein"}</TableCell>
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
                              <AlertDialogHeader><AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Diese Aktion kann nicht rückgängig gemacht werden. Der Zeiteintrag wird dauerhaft gelöscht.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteEntry(entry.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteEntryMutation.isPending && deleteEntryMutation.variables === entry.id}>
                                  {(deleteEntryMutation.isPending && deleteEntryMutation.variables === entry.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Löschen'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        Keine Zeiteinträge gefunden. Erstellen Sie einen, um loszulegen!
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