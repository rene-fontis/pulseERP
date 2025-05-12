
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Clock, Play, Pause, Square as StopIcon, AlertCircle, Save, Loader2, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useGetContacts } from "@/hooks/useContacts";
import { useGetProjects } from "@/hooks/useProjects";
import { useAddTimeEntry, useGetTimeEntries, useDeleteTimeEntry, useUpdateTimeEntry } from "@/hooks/useTimeEntries";
import type { Contact, Project as ProjectType, ProjectTask, NewTimeEntryPayload, TimeEntry } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/timeUtils"; 
import { TimeEntryForm } from "@/components/time-tracking/TimeEntryForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";


const TIMER_STORAGE_KEY = "pulseERPTimerState";
const NO_SELECTION_PLACEHOLDER = "___NO_SELECTION___";


export default function TenantTimeTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const { toast } = useToast();

  const [clientLoaded, setClientLoaded] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [startTimeEpoch, setStartTimeEpoch] = useState<number | null>(null);
  const [accumulatedElapsedTime, setAccumulatedElapsedTime] = useState(0); // in seconds
  const [displayTime, setDisplayTime] = useState("00:00:00");

  // Context for the running timer
  const [timerContactId, setTimerContactId] = useState<string | null>(null);
  const [timerProjectId, setTimerProjectId] = useState<string | null>(null);
  const [timerTaskId, setTimerTaskId] = useState<string | null>(null);
  const [timerDescription, setTimerDescription] = useState("");

  const { data: contacts, isLoading: isLoadingContacts } = useGetContacts(tenantId);
  const { data: projects, isLoading: isLoadingProjects } = useGetProjects(tenantId, ['Active', 'OnHold']);

  const { data: timeEntries, isLoading: isLoadingTimeEntries, refetch: refetchTimeEntries } = useGetTimeEntries(tenantId);
  const addTimeEntryMutation = useAddTimeEntry(tenantId);
  const updateTimeEntryMutation = useUpdateTimeEntry(tenantId);
  const deleteTimeEntryMutation = useDeleteTimeEntry(tenantId);

  const [isManualEntryModalOpen, setIsManualEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);


  // Load timer state from localStorage
  useEffect(() => {
    setClientLoaded(true); 
  }, []);

  useEffect(() => {
    if (!clientLoaded) return; 

    const savedTimerStateJSON = localStorage.getItem(TIMER_STORAGE_KEY);
    if (savedTimerStateJSON) {
      try {
        const savedState = JSON.parse(savedTimerStateJSON);
        let newAccumulatedTime = savedState.accumulatedElapsedTime || 0;

        if (savedState.timerActive) {
          setTimerActive(true);
          setTimerPaused(savedState.timerPaused || false);

          if (!savedState.timerPaused && savedState.startTimeEpoch) {
            const elapsedSinceLastSave = (Date.now() - savedState.startTimeEpoch) / 1000;
            newAccumulatedTime += elapsedSinceLastSave;
          }
          setAccumulatedElapsedTime(newAccumulatedTime);
          
          setTimerContactId(savedState.timerContactId || null);
          setTimerProjectId(savedState.timerProjectId || null);
          setTimerTaskId(savedState.timerTaskId || null);
          setTimerDescription(savedState.timerDescription || "");

          if (!savedState.timerPaused) {
            setStartTimeEpoch(Date.now()); 
          } else if (savedState.startTimeEpoch) {
            setStartTimeEpoch(savedState.startTimeEpoch); 
          }
        } else {
           setAccumulatedElapsedTime(savedState.accumulatedElapsedTime || 0);
           setTimerContactId(savedState.timerContactId || null);
           setTimerProjectId(savedState.timerProjectId || null);
           setTimerTaskId(savedState.timerTaskId || null);
           setTimerDescription(savedState.timerDescription || "");
        }
      } catch (error) {
        console.error("Error parsing saved timer state from localStorage:", error);
        localStorage.removeItem(TIMER_STORAGE_KEY); 
      }
    }
  }, [clientLoaded]); 

  // Save timer state to localStorage
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
    startTimeEpoch,
    accumulatedElapsedTime,
    timerActive,
    timerPaused,
    timerContactId,
    timerProjectId,
    timerTaskId,
    timerDescription,
    clientLoaded, 
  ]);


  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    if (timerActive && !timerPaused && startTimeEpoch !== null) {
      intervalId = setInterval(() => {
        const currentTime = Date.now();
        const elapsedSinceStart = (currentTime - startTimeEpoch) / 1000;
        setDisplayTime(formatDuration(accumulatedElapsedTime + elapsedSinceStart));
      }, 1000);
    } else {
      setDisplayTime(formatDuration(accumulatedElapsedTime));
    }

    return () => clearInterval(intervalId);
  }, [timerActive, timerPaused, startTimeEpoch, accumulatedElapsedTime]);


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
      const currentTime = Date.now();
      const elapsed = (currentTime - startTimeEpoch) / 1000;
      setAccumulatedElapsedTime(prev => prev + elapsed);
      setTimerPaused(true);
      setStartTimeEpoch(null); 
    }
  };

  const handleStopTimerAndSave = async () => {
    if (!timerActive && accumulatedElapsedTime === 0) { 
        toast({ title: "Info", description: "Keine Zeit erfasst zum Speichern."});
        return;
    }

    let finalElapsedTime = accumulatedElapsedTime;
    if (timerActive && !timerPaused && startTimeEpoch) { 
      const currentTime = Date.now();
      finalElapsedTime += (currentTime - startTimeEpoch) / 1000;
    }
    
    if (finalElapsedTime <= 1) { 
      toast({ title: "Info", description: "Zu wenig Zeit erfasst zum Speichern (min. 1 Sekunde)."});
      handleDiscardTimer(false); 
      return;
    }

    const hoursToSave = finalElapsedTime / 3600;

    const payload: NewTimeEntryPayload = {
      tenantId,
      date: new Date().toISOString(),
      hours: parseFloat(hoursToSave.toFixed(4)), 
      description: timerDescription || "Automatisch erfasste Zeit",
      contactId: timerContactId,
      projectId: timerProjectId,
      taskId: timerTaskId,
      rate: null, 
      isBillable: true, 
    };

    try {
      await addTimeEntryMutation.mutateAsync(payload);
      toast({ title: "Erfolg", description: "Zeiteintrag gespeichert." });
      handleDiscardTimer(false); 
      refetchTimeEntries();
    } catch (e) {
      const error = e as Error;
      toast({ title: "Fehler", description: `Zeiteintrag konnte nicht gespeichert werden: ${error.message}`, variant: "destructive" });
    }
  };
  
  const handleDiscardTimer = (showToast = true) => {
    setTimerActive(false);
    setTimerPaused(false);
    setStartTimeEpoch(null);
    setAccumulatedElapsedTime(0);
    setTimerContactId(null);
    setTimerProjectId(null);
    setTimerTaskId(null);
    setTimerDescription("");
    if (showToast) {
     toast({ title: "Timer verworfen", description: "Der aktuelle Timer wurde zurückgesetzt." });
    }
  };


  const projectOptions = useMemo(() => 
    projects?.map(p => ({ value: p.id, label: p.name })) || [],
  [projects]);

  const taskOptions = useMemo(() => {
    if (!timerProjectId || !projects) return [];
    const selectedProject = projects.find(p => p.id === timerProjectId);
    return selectedProject?.tasks.filter(t => t.status !== 'Completed').map(t => ({ value: t.id, label: t.name })) || [];
  }, [timerProjectId, projects]);


  const handleManualSubmit = async (values: NewTimeEntryPayload) => {
    try {
        if (editingEntry) {
            await updateTimeEntryMutation.mutateAsync({ entryId: editingEntry.id, data: values });
            toast({ title: "Erfolg", description: "Zeiteintrag aktualisiert." });
        } else {
            await addTimeEntryMutation.mutateAsync(values);
            toast({ title: "Erfolg", description: "Zeiteintrag erstellt." });
        }
        setIsManualEntryModalOpen(false);
        setEditingEntry(null);
        refetchTimeEntries();
    } catch (e) {
        const error = e as Error;
        toast({ title: "Fehler", description: `Eintrag konnte nicht ${editingEntry ? 'aktualisiert' : 'erstellt'} werden: ${error.message}`, variant: "destructive" });
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
        await deleteTimeEntryMutation.mutateAsync(entryId);
        toast({ title: "Erfolg", description: "Zeiteintrag gelöscht."});
    } catch (e) {
        const error = e as Error;
        toast({ title: "Fehler", description: `Eintrag konnte nicht gelöscht werden: ${error.message}`, variant: "destructive" });
    }
  };
  
  const handleOpenEditModal = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setIsManualEntryModalOpen(true);
  };


  if (!clientLoaded || isLoadingContacts || isLoadingProjects) {
    return (
        <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
            <Skeleton className="h-10 w-1/3 mb-2" />
            <Skeleton className="h-6 w-2/3 mb-6" />
            <Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader><CardContent><Skeleton className="h-60 w-full" /></CardContent></Card>
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
         <Dialog open={isManualEntryModalOpen} onOpenChange={(isOpen) => { setIsManualEntryModalOpen(isOpen); if (!isOpen) setEditingEntry(null);}}>
            <DialogTrigger asChild>
                <Button onClick={() => { setEditingEntry(null); setIsManualEntryModalOpen(true); }} className="bg-accent text-accent-foreground hover:bg-accent/90">
                    Manueller Eintrag
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>{editingEntry ? "Zeiteintrag bearbeiten" : "Manueller Zeiteintrag"}</DialogTitle>
                <CardDescription>
                {editingEntry ? "Bearbeiten Sie den bestehenden Zeiteintrag." : "Erfassen Sie eine Zeit manuell."}
                </CardDescription>
            </DialogHeader>
            <TimeEntryForm 
                tenantId={tenantId}
                onSubmit={handleManualSubmit}
                initialData={editingEntry || { 
                    hours: 0,
                    date: new Date(), 
                    isBillable: true,
                }}
                isSubmitting={addTimeEntryMutation.isPending || updateTimeEntryMutation.isPending}
            />
            </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Live Zeiterfassung</CardTitle>
          <CardDescription>Starten, pausieren oder stoppen Sie die Zeiterfassung für Ihre Aufgaben.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-5xl font-mono text-center py-4 bg-muted rounded-md">
            {displayTime}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="timer-contact">Kontakt (optional)</Label>
              <Select value={timerContactId || NO_SELECTION_PLACEHOLDER} onValueChange={(value) => setTimerContactId(value === NO_SELECTION_PLACEHOLDER ? null : value)} disabled={timerActive && !timerPaused}>
                <SelectTrigger id="timer-contact"><SelectValue placeholder="Kontakt wählen..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SELECTION_PLACEHOLDER}>(Kein Kontakt)</SelectItem>
                  {contacts?.map(c => <SelectItem key={c.id} value={c.id}>{c.companyName || `${c.firstName} ${c.name}`}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="timer-project">Projekt (optional)</Label>
              <Select 
                value={timerProjectId || NO_SELECTION_PLACEHOLDER} 
                onValueChange={(value) => {
                  setTimerProjectId(value === NO_SELECTION_PLACEHOLDER ? null : value); 
                  setTimerTaskId(null);
                }} 
                disabled={timerActive && !timerPaused}
              >
                <SelectTrigger id="timer-project"><SelectValue placeholder="Projekt wählen..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SELECTION_PLACEHOLDER}>(Kein Projekt)</SelectItem>
                  {projectOptions.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="timer-task">Aufgabe (optional)</Label>
              <Select 
                value={timerTaskId || NO_SELECTION_PLACEHOLDER} 
                onValueChange={(value) => setTimerTaskId(value === NO_SELECTION_PLACEHOLDER ? null : value)} 
                disabled={!timerProjectId || (timerActive && !timerPaused) || taskOptions.length === 0}
              >
                <SelectTrigger id="timer-task"><SelectValue placeholder="Aufgabe wählen..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SELECTION_PLACEHOLDER}>(Keine Aufgabe)</SelectItem>
                  {taskOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="timer-description">Beschreibung</Label>
            <Textarea id="timer-description" placeholder="Was machen Sie gerade?" value={timerDescription} onChange={(e) => setTimerDescription(e.target.value)} disabled={timerActive && !timerPaused} />
          </div>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2">
            {!timerActive || timerPaused ? (
              <Button onClick={handleStartTimer} size="lg" className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto">
                <Play className="mr-2" /> Starten / Fortsetzen
              </Button>
            ) : (
              <Button onClick={handlePauseTimer} size="lg" variant="outline" className="w-full sm:w-auto">
                <Pause className="mr-2" /> Pausieren
              </Button>
            )}
            <Button onClick={handleStopTimerAndSave} size="lg" disabled={!timerActive && accumulatedElapsedTime === 0} className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">
              <Save className="mr-2" /> Stoppen & Speichern
            </Button>
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="lg" disabled={!timerActive && accumulatedElapsedTime === 0} className="w-full sm:w-auto">
                        <StopIcon className="mr-2"/> Verwerfen
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Timer verwerfen?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Möchten Sie die aktuelle Zeiterfassung wirklich verwerfen? Die erfasste Zeit geht verloren.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDiscardTimer(true)} className="bg-destructive hover:bg-destructive/90">Verwerfen</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
      

      <Card className="shadow-xl">
        <CardHeader>
            <CardTitle>Erfasste Zeiten</CardTitle>
            <CardDescription>Übersicht Ihrer bereits erfassten Zeiteinträge.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoadingTimeEntries ? (
                <div className="space-y-3">
                    {[...Array(3)].map((_,i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
            ) : timeEntries && timeEntries.length > 0 ? (
                 <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Datum</TableHead>
                                <TableHead>Std.</TableHead>
                                <TableHead>Beschreibung</TableHead>
                                <TableHead>Kontakt</TableHead>
                                <TableHead>Projekt</TableHead>
                                <TableHead>Aufgabe</TableHead>
                                <TableHead className="text-right">Satz</TableHead>
                                <TableHead>Verrechenbar</TableHead>
                                <TableHead className="text-right">Aktionen</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {timeEntries.map(entry => (
                                <TableRow key={entry.id}>
                                    <TableCell>{format(parseISO(entry.date), 'dd.MM.yyyy', {locale: de})}</TableCell>
                                    <TableCell>{entry.hours.toFixed(2)}</TableCell>
                                    <TableCell className="max-w-xs truncate" title={entry.description}>{entry.description || '-'}</TableCell>
                                    <TableCell>{contacts?.find(c=>c.id === entry.contactId)?.name || '-'}</TableCell>
                                    <TableCell>{projects?.find(p=>p.id === entry.projectId)?.name || '-'}</TableCell>
                                    <TableCell>{projects?.flatMap(p => p.tasks).find(t=>t.id === entry.taskId)?.name || '-'}</TableCell>
                                    <TableCell className="text-right">{entry.rate ? formatCurrency(entry.rate) : '-'}</TableCell>
                                    <TableCell>{entry.isBillable ? "Ja" : "Nein"}</TableCell>
                                    <TableCell className="text-right space-x-1">
                                        <Button variant="outline" size="icon" onClick={() => handleOpenEditModal(entry)} title="Eintrag bearbeiten">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="icon" title="Eintrag löschen" disabled={deleteTimeEntryMutation.isPending && deleteTimeEntryMutation.variables === entry.id}>
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                                                    <AlertDialogDescription>Zeiteintrag vom {format(parseISO(entry.date), 'dd.MM.yyyy')} ({entry.hours.toFixed(2)} Std.) wirklich löschen?</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteEntry(entry.id)} className="bg-destructive hover:bg-destructive/90">
                                                        {deleteTimeEntryMutation.isPending && deleteTimeEntryMutation.variables === entry.id ? <Loader2 className="animate-spin h-4 w-4"/> : "Löschen"}
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                 </div>
            ) : (
                <p className="text-muted-foreground text-center py-4">Noch keine Zeiten erfasst.</p>
            )}
        </CardContent>
      </Card>

    </div>
  );
}

    
