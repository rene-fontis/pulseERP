"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import type { TimeEntry, NewTimeEntryPayload, Project as ProjectType, ProjectTask, TimeEntryFormValues } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO, intervalToDuration, formatDuration } from 'date-fns';
import { de } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const TIMER_STORAGE_KEY = 'pulseERPTimerState';

export default function TenantTimeTrackingPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Partial<TimeEntry> | null>(null);
  const [clientLoaded, setClientLoaded] = useState(false);

  // Timer State
  const [timerActive, setTimerActive] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [startTimeEpoch, setStartTimeEpoch] = useState<number | null>(null);
  const [accumulatedElapsedTime, setAccumulatedElapsedTime] = useState(0); // in seconds
  const [displayTime, setDisplayTime] = useState("00:00:00");

  // Timer Context State
  const [timerContactId, setTimerContactId] = useState<string | null>(null);
  const [timerProjectId, setTimerProjectId] = useState<string | null>(null);
  const [timerTaskId, setTimerTaskId] = useState<string | null>(null);
  const [timerDescription, setTimerDescription] = useState("");

  const { data: timeEntries, isLoading: isLoadingEntries, error: entriesError } = useGetTimeEntries(tenantId);
  const { data: contacts, isLoading: isLoadingContacts } = useGetContacts(tenantId);
  const { data: projects, isLoading: isLoadingProjects } = useGetProjects(tenantId, ['Active', 'OnHold']);
  
  const addEntryMutation = useAddTimeEntry(tenantId);
  const updateEntryMutation = useUpdateTimeEntry(tenantId);
  const deleteEntryMutation = useDeleteTimeEntry(tenantId);

  const formatTimerDisplay = useCallback((totalSeconds: number) => {
    const duration = intervalToDuration({ start: 0, end: Math.max(0, totalSeconds) * 1000 });
    const hours = (duration.hours || 0).toString().padStart(2, '0');
    const minutes = (duration.minutes || 0).toString().padStart(2, '0');
    const seconds = (duration.seconds || 0).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }, []);

  useEffect(() => {
    setClientLoaded(true);
  }, []);


  // Save to localStorage whenever relevant state changes
  useEffect(() => {
    if (!clientLoaded) return;

    const timerState = {
      startTimeEpoch,
      accumulatedElapsedTime,
      timerActive,
      timerPaused,
      timerContactId,
      timerProjectId,
      timerTaskId,
      timerDescription,
    };
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timerState));
  }, [
    clientLoaded,
    startTimeEpoch,
    accumulatedElapsedTime,
    timerActive,
    timerPaused,
    timerContactId,
    timerProjectId,
    timerTaskId,
    timerDescription,
  ]);

  // Load from localStorage on mount
  useEffect(() => {
    if (!clientLoaded) return;

    const savedTimerStateJSON = localStorage.getItem(TIMER_STORAGE_KEY);
    if (savedTimerStateJSON) {
      try {
        const savedState = JSON.parse(savedTimerStateJSON);

        setTimerContactId(savedState.timerContactId || null);
        setTimerProjectId(savedState.timerProjectId || null);
        setTimerTaskId(savedState.timerTaskId || null);
        setTimerDescription(savedState.timerDescription || "");

        if (savedState.timerActive) {
          let newAccumulatedTime = savedState.accumulatedElapsedTime || 0;
          if (!savedState.timerPaused && savedState.startTimeEpoch) {
            const elapsedSinceLastSave = (Date.now() - savedState.startTimeEpoch) / 1000;
            newAccumulatedTime += elapsedSinceLastSave;
          }
          setAccumulatedElapsedTime(newAccumulatedTime);
          setTimerActive(true);
          setTimerPaused(savedState.timerPaused || false);

          if (!savedState.timerPaused) {
            setStartTimeEpoch(Date.now()); 
          } else {
            setStartTimeEpoch(null); // Ensure epoch is null if paused
            setDisplayTime(formatTimerDisplay(newAccumulatedTime));
          }
        } else {
          setAccumulatedElapsedTime(savedState.accumulatedElapsedTime || 0);
          setTimerActive(false);
          setTimerPaused(false);
          setStartTimeEpoch(null);
          setDisplayTime(formatTimerDisplay(savedState.accumulatedElapsedTime || 0));
        }
      } catch (error) {
        console.error("Error parsing saved timer state from localStorage:", error);
        localStorage.removeItem(TIMER_STORAGE_KEY);
      }
    }
  }, [clientLoaded, formatTimerDisplay]);


  // Simplified timer interval useEffect
  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined = undefined;

    if (timerActive && !timerPaused && startTimeEpoch) {
      intervalId = setInterval(() => {
        const currentElapsed = (Date.now() - startTimeEpoch!) / 1000;
        setDisplayTime(formatTimerDisplay(accumulatedElapsedTime + currentElapsed));
      }, 1000);
    } else {
      // Timer is not running or paused, update display with accumulated time
      setDisplayTime(formatTimerDisplay(accumulatedElapsedTime));
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [timerActive, timerPaused, startTimeEpoch, accumulatedElapsedTime, formatTimerDisplay]);


  const handleStartTimer = () => {
    if (!timerActive) { 
      setStartTimeEpoch(Date.now());
      setTimerActive(true);
      setTimerPaused(false);
    } else if (timerPaused) { 
      setStartTimeEpoch(Date.now()); 
      setTimerPaused(false);
    }
  };

  const handlePauseTimer = () => {
    if (timerActive && !timerPaused && startTimeEpoch) {
      const currentSegmentElapsed = (Date.now() - startTimeEpoch) / 1000;
      setAccumulatedElapsedTime(prev => prev + currentSegmentElapsed);
      setTimerPaused(true);
      setStartTimeEpoch(null); 
    }
  };

  const handleStopAndSaveTimer = () => {
    let finalElapsedTime = accumulatedElapsedTime;
    if (timerActive && !timerPaused && startTimeEpoch) { 
      finalElapsedTime += (Date.now() - startTimeEpoch) / 1000;
    }

    if (finalElapsedTime > 0) {
      const hoursToSave = finalElapsedTime / 3600;
      const initialFormData: Partial<TimeEntryFormValues> = {
        date: new Date(),
        hours: parseFloat(hoursToSave.toFixed(2)),
        description: timerDescription,
        contactId: timerContactId,
        projectId: timerProjectId,
        taskId: timerTaskId,
        isBillable: true,
      };
      if (timerContactId && contacts) {
        const contact = contacts.find(c => c.id === timerContactId);
        if (contact?.hourlyRate) {
          initialFormData.rate = contact.hourlyRate;
        }
      }
      setSelectedEntry(initialFormData as Partial<TimeEntry>);
      setIsModalOpen(true);
    } else {
        toast({title: "Info", description: "Keine Zeit erfasst zum Speichern.", variant: "default"});
    }

    setTimerActive(false);
    setTimerPaused(false);
    setStartTimeEpoch(null);
    setAccumulatedElapsedTime(0); 
    setDisplayTime("00:00:00");
    localStorage.removeItem(TIMER_STORAGE_KEY); 
  };

  const handleAddOrUpdateEntry = async (values: NewTimeEntryPayload) => {
    try {
      if (selectedEntry && selectedEntry.id) {
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
      toast({ title: "Fehler", description: `Zeiteintrag konnte nicht ${selectedEntry?.id ? 'aktualisiert' : 'erstellt'} werden: ${error.message}`, variant: "destructive" });
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

  const projectOptionsForTimer: { value: string; label: string; tasks: ProjectTask[] }[] = useMemo(() =>
    projects?.map(p => ({ value: p.id, label: p.name, tasks: p.tasks || [] })) || [],
  [projects]);

  const taskOptionsForTimer: { value: string; label: string }[] = useMemo(() => {
    if (!timerProjectId || !projectOptionsForTimer) return [];
    const selectedProject = projectOptionsForTimer.find(p => p.value === timerProjectId);
    return selectedProject?.tasks.filter(t => t.status !== 'Completed').map(t => ({ value: t.id, label: t.name })) || [];
  }, [timerProjectId, projectOptionsForTimer]);

  const isLoading = (isLoadingEntries || isLoadingContacts || isLoadingProjects) && !clientLoaded;

  if (entriesError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Zeiteinträge</h2>
        <p>{(entriesError as Error).message}</p>
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
                <DialogTitle>{selectedEntry?.id ? "Zeiteintrag bearbeiten" : "Neuen Zeiteintrag erstellen"}</DialogTitle>
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
      
      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="text-xl">Live Zeiterfassung (Timer)</CardTitle>
            <CardDescription>Starten und stoppen Sie einen Timer für die automatische Zeiterfassung.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-1">
                    <label htmlFor="timer-contact" className="text-sm font-medium">Kontakt (optional)</label>
                    <Select value={timerContactId || undefined} onValueChange={(value) => setTimerContactId(value === "none" ? null : value)} disabled={timerActive}>
                        <SelectTrigger id="timer-contact"><SelectValue placeholder="Kontakt wählen..." /></SelectTrigger>
                        <SelectContent>
                             <SelectItem value="none">(Kein Kontakt)</SelectItem>
                            {contacts?.map(c => <SelectItem key={c.id} value={c.id}>{c.companyName || `${c.firstName} ${c.name}`}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1">
                    <label htmlFor="timer-project" className="text-sm font-medium">Projekt (optional)</label>
                     <Select value={timerProjectId || undefined} onValueChange={(value) => { setTimerProjectId(value === "none" ? null : value); setTimerTaskId(null);}} disabled={timerActive}>
                        <SelectTrigger id="timer-project"><SelectValue placeholder="Projekt wählen..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">(Kein Projekt)</SelectItem>
                            {projectOptionsForTimer.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-1">
                    <label htmlFor="timer-task" className="text-sm font-medium">Aufgabe (optional)</label>
                     <Select value={timerTaskId || undefined} onValueChange={(value) => setTimerTaskId(value === "none" ? null : value)} disabled={timerActive || !timerProjectId}>
                        <SelectTrigger id="timer-task"><SelectValue placeholder="Aufgabe wählen..." /></SelectTrigger>
                        <SelectContent>
                             <SelectItem value="none">(Keine Aufgabe)</SelectItem>
                            {taskOptionsForTimer.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
             <div className="space-y-1">
                <label htmlFor="timer-description" className="text-sm font-medium">Notiz für Timer (optional)</label>
                <Input id="timer-description" value={timerDescription} onChange={(e) => setTimerDescription(e.target.value)} placeholder="Kurze Notiz..." disabled={timerActive} />
            </div>

            <div className="flex flex-col items-center sm:flex-row sm:justify-around gap-4 pt-4 border-t">
                <div className="text-center">
                    <p className="text-4xl font-bold text-primary">{displayTime}</p>
                </div>
                <div className="flex gap-2">
                    {!timerActive || timerPaused ? (
                        <Button variant="outline" size="lg" className="bg-green-500 hover:bg-green-600 text-white" onClick={handleStartTimer} disabled={timerActive && !timerPaused && !!startTimeEpoch}>
                            <PlayCircle className="mr-2 h-5 w-5" /> Starten
                        </Button>
                    ) : (
                        <Button variant="outline" size="lg" className="bg-yellow-500 hover:bg-yellow-600 text-white" onClick={handlePauseTimer} disabled={!timerActive || timerPaused}>
                            <PauseCircle className="mr-2 h-5 w-5" /> Pausieren
                        </Button>
                    )}
                    <Button variant="destructive" size="lg" onClick={handleStopAndSaveTimer} disabled={!timerActive && accumulatedElapsedTime === 0}>
                        <StopCircle className="mr-2 h-5 w-5" /> Stoppen & Speichern
                    </Button>
                </div>
            </div>
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