
"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PlusCircle, Edit, Trash2, PackagePlus, AlertCircle, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDesc, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CustomProductFieldForm, type CustomProductFieldFormValues } from '@/components/settings/CustomProductFieldForm';
import { useGetTenantById, useUpdateTenant } from '@/hooks/useTenants';
import type { CustomProductFieldDefinition } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function TenantInventorySettingsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  
  const { data: tenant, isLoading: isLoadingTenant, error: tenantError, refetch: refetchTenant } = useGetTenantById(tenantId);
  const updateTenantMutation = useUpdateTenant();
  const { toast } = useToast();

  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<CustomProductFieldDefinition | null>(null);
  const [clientLoaded, setClientLoaded] = useState(false);

  useEffect(() => {
    setClientLoaded(true);
  }, []);

  const handleAddFieldDefinition = async (values: CustomProductFieldFormValues) => {
    if (!tenant) return;

    const newFieldDefinition: CustomProductFieldDefinition = {
      ...values,
      id: crypto.randomUUID(),
      order: (tenant.productCustomFieldDefinitions?.length || 0) + 1,
    };

    const updatedDefinitions = [...(tenant.productCustomFieldDefinitions || []), newFieldDefinition];

    try {
      await updateTenantMutation.mutateAsync({ id: tenant.id, data: { productCustomFieldDefinitions: updatedDefinitions } });
      toast({ title: "Erfolg", description: "Benutzerdefiniertes Feld erfolgreich hinzugefügt." });
      setIsFieldModalOpen(false);
      refetchTenant();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast({ title: "Fehler", description: `Feld konnte nicht hinzugefügt werden: ${errorMessage}`, variant: "destructive" });
    }
  };

  const handleEditFieldDefinition = (field: CustomProductFieldDefinition) => {
    setSelectedField(field);
    setIsFieldModalOpen(true);
  };

  const handleUpdateFieldDefinition = async (values: CustomProductFieldFormValues) => {
    if (!tenant || !selectedField) return;

    const updatedDefinitions = (tenant.productCustomFieldDefinitions || []).map(def =>
      def.id === selectedField.id ? { ...selectedField, ...values } : def
    );

    try {
      await updateTenantMutation.mutateAsync({ id: tenant.id, data: { productCustomFieldDefinitions: updatedDefinitions } });
      toast({ title: "Erfolg", description: "Benutzerdefiniertes Feld erfolgreich aktualisiert." });
      setIsFieldModalOpen(false);
      setSelectedField(null);
      refetchTenant();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast({ title: "Fehler", description: `Feld konnte nicht aktualisiert werden: ${errorMessage}`, variant: "destructive" });
    }
  };

  const handleDeleteFieldDefinition = async (fieldId: string) => {
    if (!tenant) return;

    // TODO: Consider implications - what happens to product data using this field?
    // For now, just remove the definition. A more robust solution might archive it or warn about data loss.

    const updatedDefinitions = (tenant.productCustomFieldDefinitions || []).filter(def => def.id !== fieldId);

    try {
      await updateTenantMutation.mutateAsync({ id: tenant.id, data: { productCustomFieldDefinitions: updatedDefinitions } });
      toast({ title: "Erfolg", description: "Benutzerdefiniertes Feld erfolgreich gelöscht." });
      refetchTenant();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast({ title: "Fehler", description: `Feld konnte nicht gelöscht werden: ${errorMessage}`, variant: "destructive" });
    }
  };
  
  const isLoading = isLoadingTenant || !clientLoaded;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-10 w-2/5 mb-2" />
        <Skeleton className="h-6 w-3/5 mb-6" />
        <Card className="shadow-xl">
          <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
          <CardContent><Skeleton className="h-32 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  if (tenantError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Mandantendaten</h2>
        <p>{(tenantError as Error).message}</p>
      </div>
    );
  }
  
  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Mandant nicht gefunden</h2>
      </div>
    );
  }

  const customFields = tenant.productCustomFieldDefinitions || [];

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <div className="flex items-center mb-1">
          <PackagePlus className="h-8 w-8 mr-3 text-primary" />
          <h1 className="text-3xl font-bold">Benutzerdefinierte Produktfelder: {tenant.name}</h1>
        </div>
        <p className="text-muted-foreground">
          Definieren Sie zusätzliche Felder, die für Produkte dieses Mandanten erfasst werden können.
        </p>
      </div>

      <Card className="shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Definierte Felder</CardTitle>
          <Dialog 
            open={isFieldModalOpen} 
            onOpenChange={(isOpen) => { 
              setIsFieldModalOpen(isOpen); 
              if (!isOpen) setSelectedField(null); 
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                <PlusCircle className="mr-2 h-4 w-4" /> Feld hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{selectedField ? "Feld bearbeiten" : "Neues benutzerdefiniertes Feld"}</DialogTitle>
                <DialogDesc>
                  {selectedField ? "Aktualisieren Sie die Details des Feldes." : "Definieren Sie ein neues Feld für Ihre Produkte."}
                </DialogDesc>
              </DialogHeader>
              <CustomProductFieldForm 
                onSubmit={selectedField ? handleUpdateFieldDefinition : handleAddFieldDefinition}
                initialData={selectedField}
                isSubmitting={updateTenantMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {customFields.length > 0 ? (
            <div className="space-y-3">
              {customFields.map((field) => (
                <Card key={field.id} className="p-4 flex justify-between items-center hover:shadow-md transition-shadow">
                  <div>
                    <h3 className="font-semibold">{field.label} <span className="text-xs text-muted-foreground">({field.name} - {field.type})</span></h3>
                    {field.isRequired && <Badge variant="outline" className="mt-1 text-xs">Pflichtfeld</Badge>}
                  </div>
                  <div className="space-x-2">
                    <Button variant="outline" size="icon" onClick={() => handleEditFieldDefinition(field)} title="Feld bearbeiten">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon" title="Feld löschen" disabled={updateTenantMutation.isPending}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Diese Aktion kann nicht rückgängig gemacht werden. Das Feld "{field.label}" wird gelöscht.
                            Bereits erfasste Daten in Produkten für dieses Feld bleiben bestehen, werden aber nicht mehr im Formular angezeigt.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteFieldDefinition(field.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={updateTenantMutation.isPending}
                          >
                            {updateTenantMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Löschen'}
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
              <Info className="inline-block h-5 w-5 mr-2" />Noch keine benutzerdefinierten Felder definiert.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    