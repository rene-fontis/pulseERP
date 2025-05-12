"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PlusCircle, Edit, Trash2, Archive, ArchiveRestore, Briefcase, AlertCircle, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDescriptionComponent, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ProjectForm, type ProjectFormValues } from "@/components/projects/ProjectForm";
import { useGetProjects, useAddProject, useUpdateProject, useDeleteProject } from "@/hooks/useProjects";
import type { Project, NewProjectPayload, ProjectStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TenantProjectsPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const { toast } = useToast();

  const [currentTab, setCurrentTab] = useState<ProjectStatus>("Active");
  const { data: projects, isLoading: isLoadingProjects, error: projectsError } = useGetProjects(tenantId, [currentTab]);

  const addProjectMutation = useAddProject(tenantId);
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [clientLoaded, setClientLoaded] = useState(false);

  useEffect(() => {
    setClientLoaded(true);
  }, []);

  const handleAddProject = async (values: ProjectFormValues) => {
    const payload: NewProjectPayload = { 
      ...values, 
      status: 'Active', // Default status for new projects
      startDate: values.startDate ? values.startDate.toISOString() : null,
      endDate: values.endDate ? values.endDate.toISOString() : null,
    };
    try {
      await addProjectMutation.mutateAsync(payload);
      toast({ title: "Erfolg", description: "Projekt erfolgreich erstellt." });
      setIsProjectModalOpen(false);
    } catch (e) {
      const error = e as Error;
      toast({ title: "Fehler", description: `Projekt konnte nicht erstellt werden: ${error.message}`, variant: "destructive" });
    }
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setIsProjectModalOpen(true);
  };

  const handleUpdateProject = async (values: ProjectFormValues) => {
    if (!selectedProject) return;
    const payload: Partial<Project> = { 
        ...values,
        startDate: values.startDate ? values.startDate.toISOString() : null,
        endDate: values.endDate ? values.endDate.toISOString() : null,
    };
    try {
      await updateProjectMutation.mutateAsync({ projectId: selectedProject.id, data: payload });
      toast({ title: "Erfolg", description: "Projekt erfolgreich aktualisiert." });
      setIsProjectModalOpen(false);
      setSelectedProject(null);
    } catch (e) {
      const error = e as Error;
      toast({ title: "Fehler", description: `Projekt konnte nicht aktualisiert werden: ${error.message}`, variant: "destructive" });
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProjectMutation.mutateAsync(projectId);
      toast({ title: "Erfolg", description: "Projekt erfolgreich gelöscht." });
    } catch (e) {
      const error = e as Error;
      toast({ title: "Fehler", description: `Projekt konnte nicht gelöscht werden: ${error.message}`, variant: "destructive" });
    }
  };
  
  const handleArchiveProject = async (project: Project) => {
    try {
      await updateProjectMutation.mutateAsync({ projectId: project.id, data: { status: 'Archived' } });
      toast({ title: "Erfolg", description: `Projekt "${project.name}" archiviert.` });
    } catch (e) {
      const error = e as Error;
      toast({ title: "Fehler", description: `Projekt konnte nicht archiviert werden: ${error.message}`, variant: "destructive" });
    }
  };

  const handleRestoreProject = async (project: Project) => {
    try {
      await updateProjectMutation.mutateAsync({ projectId: project.id, data: { status: 'Active' } });
      toast({ title: "Erfolg", description: `Projekt "${project.name}" wiederhergestellt.` });
    } catch (e) {
      const error = e as Error;
      toast({ title: "Fehler", description: `Projekt konnte nicht wiederhergestellt werden: ${error.message}`, variant: "destructive" });
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!clientLoaded || !dateString) return "-";
    try {
      return format(parseISO(dateString), "dd.MM.yyyy", { locale: de });
    } catch (e) {
      return "Ungültiges Datum";
    }
  };

  const isLoading = isLoadingProjects && !clientLoaded;

  if (projectsError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Projekte</h2>
        <p>{projectsError.message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Briefcase className="h-8 w-8 mr-3 text-primary" />
          <h1 className="text-3xl font-bold">Projektverwaltung</h1>
        </div>
        <Dialog
          open={isProjectModalOpen}
          onOpenChange={(isOpen) => {
            setIsProjectModalOpen(isOpen);
            if (!isOpen) setSelectedProject(null);
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
              <PlusCircle className="mr-2 h-4 w-4" /> Projekt erstellen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedProject ? "Projekt bearbeiten" : "Neues Projekt erstellen"}</DialogTitle>
            </DialogHeader>
            <ProjectForm
              tenantId={tenantId}
              onSubmit={selectedProject ? handleUpdateProject : handleAddProject}
              initialData={selectedProject}
              isSubmitting={addProjectMutation.isPending || updateProjectMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
      
      <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as ProjectStatus)}>
        <TabsList className="mb-4">
          <TabsTrigger value="Active">Aktive Projekte</TabsTrigger>
          <TabsTrigger value="Archived">Archivierte Projekte</TabsTrigger>
          <TabsTrigger value="Completed">Abgeschlossene Projekte</TabsTrigger>
        </TabsList>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Projektliste</CardTitle>
            <CardDescription>Liste aller Projekte im Status "{currentTab}".</CardDescription>
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
                      <TableHead>Name</TableHead>
                      <TableHead>Kunde</TableHead>
                      <TableHead>Startdatum</TableHead>
                      <TableHead>Enddatum</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects && projects.length > 0 ? (
                      projects.map((project) => (
                        <TableRow key={project.id}>
                          <TableCell className="font-medium">
                            <Link href={`/tenants/${tenantId}/projects/${project.id}`} className="hover:underline text-primary">
                              {project.name}
                            </Link>
                          </TableCell>
                          <TableCell>{project.contactName || "-"}</TableCell>
                          <TableCell>{formatDate(project.startDate)}</TableCell>
                          <TableCell>{formatDate(project.endDate)}</TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button variant="ghost" size="icon" asChild title="Details anzeigen">
                               <Link href={`/tenants/${tenantId}/projects/${project.id}`}><Eye className="h-4 w-4"/></Link>
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => handleEditProject(project)} title="Projekt bearbeiten">
                              <Edit className="h-4 w-4" />
                            </Button>
                            {currentTab === "Active" && (
                                <Button variant="outline" size="icon" onClick={() => handleArchiveProject(project)} title="Projekt archivieren">
                                    <Archive className="h-4 w-4" />
                                </Button>
                            )}
                            {currentTab === "Archived" && (
                                <Button variant="outline" size="icon" onClick={() => handleRestoreProject(project)} title="Projekt wiederherstellen">
                                    <ArchiveRestore className="h-4 w-4" />
                                </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon" title="Projekt löschen" disabled={deleteProjectMutation.isPending && deleteProjectMutation.variables === project.id}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Diese Aktion kann nicht rückgängig gemacht werden. Das Projekt "{project.name}" und alle zugehörigen Daten (Meilensteine, Aufgaben etc.) werden dauerhaft gelöscht.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteProject(project.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteProjectMutation.isPending && deleteProjectMutation.variables === project.id}>
                                    {(deleteProjectMutation.isPending && deleteProjectMutation.variables === project.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Löschen'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                          Keine Projekte in dieser Ansicht gefunden.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}