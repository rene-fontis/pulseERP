"use client";

import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit, Trash2, FileText as FileTextIcon, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { ChartOfAccountsTemplateForm, type ChartOfAccountsTemplateFormValues } from '@/components/templates/ChartOfAccountsTemplateForm';
import { useGetChartOfAccountsTemplates, useAddChartOfAccountsTemplate, useUpdateChartOfAccountsTemplate, useDeleteChartOfAccountsTemplate } from '@/hooks/useChartOfAccountsTemplates';
import type { ChartOfAccountsTemplate } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export default function ManageTemplatesPage() {
  const { data: templates, isLoading, error } = useGetChartOfAccountsTemplates();
  const addTemplateMutation = useAddChartOfAccountsTemplate();
  const updateTemplateMutation = useUpdateChartOfAccountsTemplate();
  const deleteTemplateMutation = useDeleteChartOfAccountsTemplate();
  const { toast } = useToast();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ChartOfAccountsTemplate | null>(null);
  const [clientLoaded, setClientLoaded] = useState(false);

  useEffect(() => {
    setClientLoaded(true);
  }, []);

  const handleCreateTemplate = async (values: ChartOfAccountsTemplateFormValues) => {
    try {
      await addTemplateMutation.mutateAsync(values);
      toast({ title: "Erfolg", description: "Vorlage erfolgreich erstellt." });
      setIsCreateModalOpen(false);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast({ title: "Fehler", description: `Vorlage konnte nicht erstellt werden: ${errorMessage}`, variant: "destructive" });
    }
  };

  const handleEditTemplate = (template: ChartOfAccountsTemplate) => {
    setSelectedTemplate(template);
    setIsEditModalOpen(true);
  };

  const handleUpdateTemplate = async (values: ChartOfAccountsTemplateFormValues) => {
    if (!selectedTemplate) return;
    try {
      await updateTemplateMutation.mutateAsync({ id: selectedTemplate.id, ...values });
      toast({ title: "Erfolg", description: "Vorlage erfolgreich aktualisiert." });
      setIsEditModalOpen(false);
      setSelectedTemplate(null);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast({ title: "Fehler", description: `Vorlage konnte nicht aktualisiert werden: ${errorMessage}`, variant: "destructive" });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await deleteTemplateMutation.mutateAsync(templateId);
      toast({ title: "Erfolg", description: "Vorlage erfolgreich gelöscht." });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast({ title: "Fehler", description: `Vorlage konnte nicht gelöscht werden: ${errorMessage}`, variant: "destructive" });
    }
  };
  
  const formatDate = (dateString: string) => {
    if (!clientLoaded || !dateString) return "Lädt...";
    try {
      return format(new Date(dateString), "PPP p", { locale: de });
    } catch (e) {
      return "Ungültiges Datum";
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Vorlagen</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Card className="shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center">
            <FileTextIcon className="h-6 w-6 mr-3 text-primary" />
            <CardTitle className="text-2xl font-bold">Kontenplan Vorlagen</CardTitle>
          </div>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                <PlusCircle className="mr-2 h-4 w-4" /> Vorlage erstellen
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Neue Kontenplan Vorlage erstellen</DialogTitle>
                <DialogDescription>
                  Definieren Sie eine neue Vorlage für Kontenpläne.
                </DialogDescription>
              </DialogHeader>
              <ChartOfAccountsTemplateForm 
                onSubmit={handleCreateTemplate} 
                isSubmitting={addTemplateMutation.isPending} 
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading || !clientLoaded ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-md">
                  <Skeleton className="h-10 w-10" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead>Erstellt am</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates && templates.length > 0 ? templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>{template.description || '-'}</TableCell>
                      <TableCell>{formatDate(template.createdAt)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleEditTemplate(template)}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Vorlage bearbeiten</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon">
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Vorlage löschen</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Diese Aktion kann nicht rückgängig gemacht werden. Die Vorlage "{template.name}" wird dauerhaft gelöscht.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteTemplate(template.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                disabled={deleteTemplateMutation.isPending && deleteTemplateMutation.variables === template.id}
                              >
                                {(deleteTemplateMutation.isPending && deleteTemplateMutation.variables === template.id) ? 'Löschen...' : 'Löschen'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                        Keine Vorlagen gefunden. Erstellen Sie eine, um loszulegen!
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTemplate && (
        <Dialog open={isEditModalOpen} onOpenChange={(isOpen) => {
          setIsEditModalOpen(isOpen);
          if (!isOpen) setSelectedTemplate(null);
        }}>
          <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Vorlage bearbeiten: {selectedTemplate.name}</DialogTitle>
              <DialogDescription>
                Aktualisieren Sie die Details der Kontenplan Vorlage.
              </DialogDescription>
            </DialogHeader>
            <ChartOfAccountsTemplateForm 
              onSubmit={handleUpdateTemplate} 
              initialData={selectedTemplate} 
              isSubmitting={updateTemplateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
