
"use client";

import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit, Trash2, Building2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { TenantForm, type TenantFormValues } from '@/components/tenants/TenantForm';
import { useGetTenants, useAddTenant, useUpdateTenant, useDeleteTenant } from '@/hooks/useTenants';
import { useGetChartOfAccountsTemplates } from '@/hooks/useChartOfAccountsTemplates';
import type { Tenant } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export default function ManageTenantsPage() {
  const { data: tenants, isLoading: isLoadingTenants, error: tenantsError } = useGetTenants();
  const { data: templates, isLoading: isLoadingTemplates } = useGetChartOfAccountsTemplates();
  const addTenantMutation = useAddTenant();
  const updateTenantMutation = useUpdateTenant();
  const deleteTenantMutation = useDeleteTenant();
  const { toast } = useToast();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [formattedDates, setFormattedDates] = useState<Record<string, string>>({});
  const [clientLoaded, setClientLoaded] = useState(false);

  useEffect(() => {
    setClientLoaded(true);
  }, []);


  useEffect(() => {
    if (tenants && clientLoaded) {
      const newFormattedDates: Record<string, string> = {};
      tenants.forEach(tenant => {
        try {
          const dateToFormat = new Date(tenant.createdAt);
          if (isNaN(dateToFormat.getTime())) {
            let parsedDate;
            // Check if createdAt is a Firestore Timestamp-like object
            if (typeof tenant.createdAt === 'object' && tenant.createdAt && 'seconds' in tenant.createdAt && 'nanoseconds' in tenant.createdAt) {
                // Convert Firestore Timestamp-like object to Date
                parsedDate = new Date((tenant.createdAt as any).seconds * 1000 + (tenant.createdAt as any).nanoseconds / 1000000);
            } else {
                 // Fallback or error for unexpected date formats
                 throw new Error(`Invalid date value for tenant.createdAt: ${tenant.createdAt}`);
            }
             if (isNaN(parsedDate.getTime())) {
                throw new Error(`Invalid date value for tenant.createdAt after attempting to parse Timestamp object: ${tenant.createdAt}`);
            }
            newFormattedDates[tenant.id] = format(parsedDate, "PPP p", { locale: de });

          } else {
            newFormattedDates[tenant.id] = format(dateToFormat, "PPP p", { locale: de });
          }
        } catch (e) {
          console.error("Error formatting date for tenant:", tenant.id, tenant.createdAt, e);
          newFormattedDates[tenant.id] = "Ungültiges Datum";
        }
      });
      setFormattedDates(newFormattedDates);
    }
  }, [tenants, clientLoaded]);

  const handleCreateTenant = async (values: TenantFormValues) => {
    try {
      await addTenantMutation.mutateAsync({ 
        name: values.name, 
        chartOfAccountsTemplateId: values.chartOfAccountsTemplateId || undefined 
      });
      toast({ title: "Erfolg", description: "Mandant erfolgreich erstellt.", variant: "default" });
      setIsCreateModalOpen(false);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast({ title: "Fehler", description: `Mandant konnte nicht erstellt werden: ${errorMessage}`, variant: "destructive" });
    }
  };

  const handleEditTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsEditModalOpen(true);
  };

  const handleUpdateTenant = async (values: TenantFormValues) => { 
    if (!selectedTenant) return;
    try {
      // For now, only name is updatable in the form, CoA template is fixed after creation
      await updateTenantMutation.mutateAsync({ id: selectedTenant.id, data: { name: values.name } });
      toast({ title: "Erfolg", description: "Mandant erfolgreich aktualisiert.", variant: "default" });
      setIsEditModalOpen(false);
      setSelectedTenant(null);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast({ title: "Fehler", description: `Mandant konnte nicht aktualisiert werden: ${errorMessage}`, variant: "destructive" });
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    try {
      await deleteTenantMutation.mutateAsync(tenantId);
      toast({ title: "Erfolg", description: "Mandant erfolgreich gelöscht.", variant: "default" });
    } catch (e) // Explicitly type e if possible, or use instanceof Error
       {
      const errorMessage = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast({ title: "Fehler", description: `Mandant konnte nicht gelöscht werden: ${errorMessage}`, variant: "destructive" });
    }
  };

  const getTemplateName = (templateId?: string) => {
    if (!templates || !templateId) return 'Nicht zugewiesen';
    const template = templates.find(t => t.id === templateId);
    return template ? template.name : 'Unbekannte Vorlage';
  };
  
  const isLoading = isLoadingTenants || isLoadingTemplates || !clientLoaded;


  if (tenantsError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Mandanten</h2>
        <p>{tenantsError.message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Card className="shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center">
            <Building2 className="h-6 w-6 mr-3 text-primary" />
            <CardTitle className="text-2xl font-bold">Mandantenverwaltung</CardTitle>
          </div>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                <PlusCircle className="mr-2 h-4 w-4" /> Mandant erstellen
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Neuen Mandant erstellen</DialogTitle>
                <DialogDescription>
                  Geben Sie die Details für den neuen Mandanten ein.
                </DialogDescription>
              </DialogHeader>
              <TenantForm onSubmit={handleCreateTenant} isSubmitting={addTenantMutation.isPending} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]"><Skeleton className="h-5 w-1/2" /></TableHead>
                    <TableHead><Skeleton className="h-5 w-1/2" /></TableHead>
                    <TableHead><Skeleton className="h-5 w-1/2" /></TableHead>
                    <TableHead><Skeleton className="h-5 w-1/2" /></TableHead>
                    <TableHead className="text-right"><Skeleton className="h-5 w-1/4 ml-auto" /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(3)].map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-1/2" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-2/3" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-1/4" /></TableCell>
                      <TableCell className="text-right space-x-2">
                        <Skeleton className="h-8 w-8 inline-block" />
                        <Skeleton className="h-8 w-8 inline-block" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Name</TableHead>
                    <TableHead>Erstellt am</TableHead>
                    <TableHead>Kontenplan Vorlage</TableHead>
                    <TableHead>Aktiver Kontenplan</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants && tenants.length > 0 ? tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">{tenant.name}</TableCell>
                      <TableCell>{formattedDates[tenant.id] || 'Lädt...'}</TableCell>
                      <TableCell>{getTemplateName(tenant.chartOfAccountsTemplateId)}</TableCell>
                      <TableCell>{tenant.chartOfAccountsId ? `Ja (ID: ...${tenant.chartOfAccountsId.slice(-4)})` : 'Nein'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleEditTenant(tenant)} title="Mandant bearbeiten">
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Mandant bearbeiten</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" title="Mandant löschen">
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Mandant löschen</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Diese Aktion kann nicht rückgängig gemacht werden. Dadurch wird der Mandant "{tenant.name}" dauerhaft gelöscht. Zugehörige Daten wie der Kontenplan dieses Mandanten werden NICHT automatisch gelöscht.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteTenant(tenant.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                disabled={deleteTenantMutation.isPending && deleteTenantMutation.variables === tenant.id}
                              >
                                {(deleteTenantMutation.isPending && deleteTenantMutation.variables === tenant.id) ? 'Löschen...' : 'Löschen'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        Keine Mandanten gefunden. Erstellen Sie einen, um loszulegen!
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditModalOpen} onOpenChange={(isOpen) => {
        setIsEditModalOpen(isOpen);
        if (!isOpen) setSelectedTenant(null);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Mandant bearbeiten</DialogTitle>
            <DialogDescription>
              Aktualisieren Sie den Namen für den Mandanten: {selectedTenant?.name}.
              Die Kontenplan-Vorlage kann nach der Erstellung nicht mehr geändert werden.
            </DialogDescription>
          </DialogHeader>
          <TenantForm 
            onSubmit={handleUpdateTenant} 
            initialData={selectedTenant} 
            isSubmitting={updateTenantMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
