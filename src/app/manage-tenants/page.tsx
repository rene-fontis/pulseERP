"use client";

import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit, Trash2, Building2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { TenantForm } from '@/components/tenants/TenantForm';
import { useGetTenants, useAddTenant, useUpdateTenant, useDeleteTenant } from '@/hooks/useTenants';
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
  const { data: tenants, isLoading, error } = useGetTenants();
  const addTenantMutation = useAddTenant();
  const updateTenantMutation = useUpdateTenant();
  const deleteTenantMutation = useDeleteTenant();
  const { toast } = useToast();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [formattedDates, setFormattedDates] = useState<Record<string, string>>({});


  import { getDocs, collection } from 'firebase/firestore';

  async function testFirestore() {
    const tenantsRef = collection(db, 'tenants');
    const snapshot = await getDocs(tenantsRef);
    
    snapshot.forEach(doc => {
      console.log('Mandant:', doc.id, doc.data());
    });
  }
  
  testFirestore();


  useEffect(() => {
    if (tenants) {
      const newFormattedDates: Record<string, string> = {};
      tenants.forEach(tenant => {
        try {
          newFormattedDates[tenant.id] = format(new Date(tenant.createdAt), "PPP p", { locale: de });
        } catch (e) {
          console.error("Error formatting date for tenant:", tenant.id, e);
          newFormattedDates[tenant.id] = "Ungültiges Datum";
        }
      });
      setFormattedDates(newFormattedDates);
    }
  }, [tenants]);


  const handleCreateTenant = async (values: { name: string }) => {
    try {
      await addTenantMutation.mutateAsync(values.name);
      toast({ title: "Erfolg", description: "Mandant erfolgreich erstellt.", variant: "default" });
      setIsCreateModalOpen(false);
    } catch (e) {
      toast({ title: "Fehler", description: "Mandant konnte nicht erstellt werden.", variant: "destructive" });
    }
  };

  const handleEditTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsEditModalOpen(true);
  };

  const handleUpdateTenant = async (values: { name: string }) => {
    if (!selectedTenant) return;
    try {
      await updateTenantMutation.mutateAsync({ id: selectedTenant.id, name: values.name });
      toast({ title: "Erfolg", description: "Mandant erfolgreich aktualisiert.", variant: "default" });
      setIsEditModalOpen(false);
      setSelectedTenant(null);
    } catch (e) {
      toast({ title: "Fehler", description: "Mandant konnte nicht aktualisiert werden.", variant: "destructive" });
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    try {
      await deleteTenantMutation.mutateAsync(tenantId);
      toast({ title: "Erfolg", description: "Mandant erfolgreich gelöscht.", variant: "default" });
    } catch (e) {
      toast({ title: "Fehler", description: "Mandant konnte nicht gelöscht werden.", variant: "destructive" });
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Mandanten</h2>
        <p>{error.message}</p>
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
                  Geben Sie den Namen für den neuen Mandanten ein.
                </DialogDescription>
              </DialogHeader>
              <TenantForm onSubmit={handleCreateTenant} isSubmitting={addTenantMutation.isPending} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-md">
                  <Skeleton className="h-10 w-10 rounded-full" />
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
                    <TableHead className="w-[200px]">Name</TableHead>
                    <TableHead>Erstellt am</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants && tenants.length > 0 ? tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">{tenant.name}</TableCell>
                      <TableCell>{formattedDates[tenant.id] || 'Lädt...'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleEditTenant(tenant)}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Mandant bearbeiten</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon">
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Mandant löschen</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Diese Aktion kann nicht rückgängig gemacht werden. Dadurch wird der Mandant "{tenant.name}" dauerhaft gelöscht.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteTenant(tenant.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                disabled={deleteTenantMutation.isPending}
                              >
                                {deleteTenantMutation.isPending && deleteTenantMutation.variables === tenant.id ? 'Löschen...' : 'Löschen'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
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
