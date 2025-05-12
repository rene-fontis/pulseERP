
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Trash2, PlusCircle, CheckSquare, Square, CalendarDays, Briefcase, AlertCircle, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDescriptionComponent, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useGetProjectById, useUpdateProject } from "@/hooks/useProjects";
import type { Project, Milestone, MilestoneFormValues, NewMilestonePayload } from "@/types";
import { projectStatusLabels } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { MilestoneForm } from "@/components/projects/MilestoneForm";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const projectId = params.projectId as string;
  const { data: project, isLoading: isLoadingProject, error: projectError, refetch: refetchProject } = useGetProjectById(projectId);
  const updateProjectMutation = useUpdateProject();
  const { toast } = useToast();

  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [clientLoaded, setClientLoaded] = useState(false);

  useEffect(() => {
    setClientLoaded(true);
  }, []);

  const handleAddOrUpdateMilestone = async (values: MilestoneFormValues) => {
    if (!project) return;

    let updatedMilestones: Milestone[];
    const nowISO = new Date().toISOString();

    if (selectedMilestone) { // Update existing milestone
      updatedMilestones = project.milestones.map(ms =>
        ms.id === selectedMilestone.id
          ? { 
              ...selectedMilestone, // keep original id and createdAt
              ...values, // apply form values (name, description, completed)
              dueDate: values.dueDate?.toISOString() || null, 
              updatedAt: nowISO // Set new updatedAt
            }
          : ms
      );
    } else { // Add new milestone
      const newMilestone: Milestone = {
        id: crypto.randomUUID(),
        ...values, // name, description, completed from form
        dueDate: values.dueDate?.toISOString() || null,
        createdAt: nowISO, // Set new createdAt
        updatedAt: nowISO, // Set new updatedAt
      };
      updatedMilestones = [...project.milestones, newMilestone];
    }

    try {
      await updateProjectMutation.mutateAsync({ projectId: project.id, data: { milestones: updatedMilestones } });
      toast({ title: "Erfolg", description: `Meilenstein ${selectedMilestone ? 'aktualisiert' : 'erstellt'}.` });
      setIsMilestoneModalOpen(false);
      setSelectedMilestone(null);
      refetchProject();
    } catch (e) {
      const error = e as Error;
      toast({ title: "Fehler", description: `Meilenstein konnte nicht ${selectedMilestone ? 'aktualisiert' : 'erstellt'} werden: ${error.message}`, variant: "destructive" });
    }
  };
  
  const handleEditMilestone = (milestone: Milestone) => {
    setSelectedMilestone(milestone);
    setIsMilestoneModalOpen(true);
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!project) return;
    const updatedMilestones = project.milestones.filter(ms => ms.id !== milestoneId);
    try {
      await updateProjectMutation.mutateAsync({ projectId: project.id, data: { milestones: updatedMilestones } });
      toast({ title: "Erfolg", description: "Meilenstein gelöscht." });
      refetchProject();
    } catch (e) {
      const error = e as Error;
      toast({ title: "Fehler", description: `Meilenstein konnte nicht gelöscht werden: ${error.message}`, variant: "destructive" });
    }
  };
  
  const toggleMilestoneCompletion = async (milestoneId: string) => {
    if (!project) return;
    const updatedMilestones = project.milestones.map(ms =>
      ms.id === milestoneId ? { ...ms, completed: !ms.completed, updatedAt: new Date().toISOString() } : ms
    );
     try {
      await updateProjectMutation.mutateAsync({ projectId: project.id, data: { milestones: updatedMilestones } });
      toast({ title: "Erfolg", description: "Meilensteinstatus aktualisiert." });
      refetchProject();
    } catch (e) {
      const error = e as Error;
      toast({ title: "Fehler", description: `Meilensteinstatus konnte nicht aktualisiert werden: ${error.message}`, variant: "destructive" });
    }
  }

  const formatDate = (dateString?: string | null) => {
    if (!clientLoaded || !dateString) return "-";
    try {
      return format(parseISO(dateString), "dd.MM.yyyy", { locale: de });
    } catch (e) {
      return "Ungültiges Datum";
    }
  };

  const isLoading = isLoadingProject && !clientLoaded;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        <Skeleton className="h-8 w-1/4 mb-2" />
        <Skeleton className="h-6 w-1/2 mb-6" />
        <Card><CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader><CardContent><Skeleton className="h-20 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (projectError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden des Projekts</h2>
        <p>{projectError.message}</p>
        <Button variant="outline" onClick={() => router.push(`/tenants/${tenantId}/projects`)} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Zurück zur Projektübersicht
        </Button>
      </div>
    );
  }

  if (!project && !isLoadingProject && clientLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Projekt nicht gefunden</h2>
        <Button variant="outline" onClick={() => router.push(`/tenants/${tenantId}/projects`)} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Zurück zur Projektübersicht
        </Button>
      </div>
    );
  }

  const sortedMilestones = project ? [...project.milestones].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  }) : [];

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <div>
        <Button variant="outline" size="sm" onClick={() => router.push(`/tenants/${tenantId}/projects`)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Zurück zur Projektübersicht
        </Button>
        <div className="flex items-center justify-between">
            <div className="flex items-center">
            <Briefcase className="h-8 w-8 mr-3 text-primary" />
            <div>
                <h1 className="text-3xl font-bold">{project?.name}</h1>
                {project?.contactName && <p className="text-sm text-muted-foreground">Kunde: {project.contactName}</p>}
            </div>
            </div>
            <Badge variant={project?.status === 'Archived' ? 'secondary' : project?.status === 'Completed' ? 'default' : 'outline'}>
                {projectStatusLabels[project?.status || 'Active']}
            </Badge>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Projektdetails</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div><span className="font-semibold">Beschreibung:</span> {project?.description || "-"}</div>
          <div><span className="font-semibold">Startdatum:</span> {formatDate(project?.startDate)}</div>
          <div><span className="font-semibold">Enddatum:</span> {formatDate(project?.endDate)}</div>
          <div><span className="font-semibold">Erstellt am:</span> {formatDate(project?.createdAt)}</div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Meilensteine ({sortedMilestones.length})</CardTitle>
          <Dialog
            open={isMilestoneModalOpen}
            onOpenChange={(isOpen) => {
              setIsMilestoneModalOpen(isOpen);
              if (!isOpen) setSelectedMilestone(null);
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <PlusCircle className="mr-2 h-4 w-4" /> Meilenstein hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{selectedMilestone ? "Meilenstein bearbeiten" : "Neuer Meilenstein"}</DialogTitle>
              </DialogHeader>
              <MilestoneForm
                onSubmit={handleAddOrUpdateMilestone}
                initialData={selectedMilestone}
                isSubmitting={updateProjectMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {sortedMilestones.length > 0 ? (
            <div className="space-y-4">
              {sortedMilestones.map(ms => (
                <Card key={ms.id} className="flex items-center justify-between p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center">
                    <Button variant="ghost" size="icon" onClick={() => toggleMilestoneCompletion(ms.id)} className="mr-3">
                      {ms.completed ? <CheckSquare className="h-5 w-5 text-green-500" /> : <Square className="h-5 w-5 text-muted-foreground" />}
                    </Button>
                    <div>
                      <h4 className={cn("font-medium", ms.completed && "line-through text-muted-foreground")}>{ms.name}</h4>
                      {ms.description && <p className={cn("text-sm text-muted-foreground", ms.completed && "line-through")}>{ms.description}</p>}
                      {ms.dueDate && (
                        <p className={cn("text-xs text-muted-foreground flex items-center", ms.completed && "line-through")}>
                          <CalendarDays className="mr-1.5 h-3.5 w-3.5" /> Fällig am: {formatDate(ms.dueDate)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="icon" onClick={() => handleEditMilestone(ms)} title="Meilenstein bearbeiten">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" title="Meilenstein löschen">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Meilenstein "{ms.name}" wirklich löschen?
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteMilestone(ms.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Löschen
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-6">
              <Info className="inline-block h-5 w-5 mr-2" />Keine Meilensteine für dieses Projekt definiert.
            </p>
          )}
        </CardContent>
      </Card>

       <Card className="shadow-lg">
        <CardHeader>
            <CardTitle>Projekt-Timeline (Einfache Liste)</CardTitle>
            <CardDescription>Eine chronologische Auflistung der Meilensteine.</CardDescription>
        </CardHeader>
        <CardContent>
            {sortedMilestones.length > 0 ? (
                <ul className="space-y-3">
                    {sortedMilestones.map(ms => (
                        <li key={`timeline-${ms.id}`} className="flex items-center">
                            <span className={`mr-3 h-2.5 w-2.5 rounded-full ${ms.completed ? 'bg-green-500' : 'bg-primary'}`}></span>
                            <span className="text-sm font-medium w-32 shrink-0">{ms.dueDate ? formatDate(ms.dueDate) : "Ohne Datum"}</span>
                            <span className={cn("text-sm", ms.completed && "line-through text-muted-foreground")}>{ms.name}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                 <p className="text-muted-foreground text-center py-6">
                    <Info className="inline-block h-5 w-5 mr-2" />Keine Meilensteine für die Timeline vorhanden.
                </p>
            )}
        </CardContent>
       </Card>
    </div>
  );
}

