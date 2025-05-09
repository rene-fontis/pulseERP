
"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PlusCircle, Edit, Trash2, CalendarDays, AlertCircle, CheckCircle, Upload } from 'lucide-react'; // Upload icon added
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDescriptionComponent, DialogTrigger } from '@/components/ui/dialog';
import { FiscalYearForm, type FiscalYearFormValuesClient } from '@/components/settings/FiscalYearForm';
import { useGetTenantById, useUpdateTenant } from '@/hooks/useTenants';
import { useGetFiscalYears, useAddFiscalYear, useUpdateFiscalYear, useDeleteFiscalYear } from '@/hooks/useFiscalYears';
import type { FiscalYear } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CarryForwardBalancesDialog } from '@/components/settings/CarryForwardBalancesDialog'; // Import the new dialog
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export default function TenantFiscalYearsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  
  const { data: tenant, isLoading: isLoadingTenant, error: tenantError } = useGetTenantById(tenantId);
  const { data: fiscalYears, isLoading: isLoadingFiscalYears, error: fiscalYearsError, refetch: refetchFiscalYears } = useGetFiscalYears(tenantId);
  
  const addFiscalYearMutation = useAddFiscalYear(tenantId);
  const updateFiscalYearMutation = useUpdateFiscalYear(tenantId);
  const deleteFiscalYearMutation = useDeleteFiscalYear(tenantId);
  const updateTenantMutation = useUpdateTenant();

  const { toast } = useToast();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCarryForwardModalOpen, setIsCarryForwardModalOpen] = useState(false); // State for new dialog
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<FiscalYear | null>(null);
  const [clientLoaded, setClientLoaded] = useState(false);

  useEffect(() => {
    setClientLoaded(true);
  }, []);

  const handleCreateFiscalYear = async (values: FiscalYearFormValuesClient) => {
    try {
      const newFiscalYearData = {
        name: values.name,
        startDate: values.startDate.toISOString(),
        endDate: values.endDate.toISOString(),
      };
      await addFiscalYearMutation.mutateAsync(newFiscalYearData);
      toast({ title: "Erfolg", description: "Geschäftsjahr erfolgreich erstellt." });
      setIsCreateModalOpen(false);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast({ title: "Fehler", description: `Geschäftsjahr konnte nicht erstellt werden: ${errorMessage}`, variant: "destructive" });
    }
  };

  const handleEditFiscalYear = (fiscalYear: FiscalYear) => {
    setSelectedFiscalYear(fiscalYear);
    setIsEditModalOpen(true);
  };

  const handleUpdateFiscalYear = async (values: FiscalYearFormValuesClient) => {
    if (!selectedFiscalYear) return;
    try {
      const updatedFiscalYearData = {
        name: values.name,
        startDate: values.startDate.toISOString(),
        endDate: values.endDate.toISOString(),
        // isClosed might be part of future updates
      };
      await updateFiscalYearMutation.mutateAsync({ fiscalYearId: selectedFiscalYear.id, data: updatedFiscalYearData });
      toast({ title: "Erfolg", description: "Geschäftsjahr erfolgreich aktualisiert." });
      setIsEditModalOpen(false);
      setSelectedFiscalYear(null);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast({ title: "Fehler", description: `Geschäftsjahr konnte nicht aktualisiert werden: ${errorMessage}`, variant: "destructive" });
    }
  };

  const handleDeleteFiscalYear = async (fiscalYearId: string) => {
    if (tenant?.activeFiscalYearId === fiscalYearId) {
        toast({ title: "Achtung", description: "Das aktive Geschäftsjahr kann nicht gelöscht werden. Bitte wählen Sie zuerst ein anderes aktives Jahr.", variant: "destructive" });
        return;
    }
    try {
      await deleteFiscalYearMutation.mutateAsync(fiscalYearId);
      toast({ title: "Erfolg", description: "Geschäftsjahr erfolgreich gelöscht." });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast({ title: "Fehler", description: `Geschäftsjahr konnte nicht gelöscht werden: ${errorMessage}`, variant: "destructive" });
    }
  };

  const handleSetActiveFiscalYear = async (fiscalYearId: string) => {
    if (!tenant) return;
    try {
      await updateTenantMutation.mutateAsync({ id: tenant.id, data: { activeFiscalYearId: fiscalYearId } });
      toast({ title: "Erfolg", description: "Aktives Geschäftsjahr erfolgreich gesetzt." });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast({ title: "Fehler", description: `Aktives Geschäftsjahr konnte nicht gesetzt werden: ${errorMessage}`, variant: "destructive" });
    }
  };
  
  const formatDate = (dateString: string | Date) => {
    if (!clientLoaded || !dateString) return "Lädt...";
    try {
      return format(new Date(dateString), "dd.MM.yyyy", { locale: de });
    } catch (e) {
      return "Ungültiges Datum";
    }
  };

  const isLoading = isLoadingTenant || isLoadingFiscalYears || !clientLoaded;
  const combinedError = tenantError || fiscalYearsError;

  if (isLoading && !clientLoaded) {
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

  if (combinedError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Daten</h2>
        <p>{(combinedError as Error).message}</p>
      </div>
    );
  }

  if (!tenant && !isLoadingTenant) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Mandant nicht gefunden</h2>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <div className="flex items-center mb-1">
          <CalendarDays className="h-8 w-8 mr-3 text-primary" />
          <h1 className="text-3xl font-bold">Geschäftsjahre: {tenant?.name}</h1>
        </div>
        <p className="text-muted-foreground">
          Verwalten Sie die Geschäftsjahre für den Mandanten {tenant?.name}. Legen Sie hier das aktive Geschäftsjahr fest.
        </p>
      </div>

      <Card className="shadow-xl">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Definierte Geschäftsjahre</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {fiscalYears && fiscalYears.length > 0 && tenant?.chartOfAccountsId && (
                <Button 
                    variant="outline" 
                    onClick={() => setIsCarryForwardModalOpen(true)}
                    className="w-full sm:w-auto"
                >
                    <Upload className="mr-2 h-4 w-4" /> Salden vortragen
                </Button>
            )}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90 w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" /> Geschäftsjahr erstellen
                </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Neues Geschäftsjahr erstellen</DialogTitle>
                    <DialogDescriptionComponent>
                    Definieren Sie ein neues Geschäftsjahr.
                    </DialogDescriptionComponent>
                </DialogHeader>
                <FiscalYearForm 
                    onSubmit={handleCreateFiscalYear} 
                    isSubmitting={addFiscalYearMutation.isPending} 
                />
                </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingFiscalYears && clientLoaded ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Startdatum</TableHead>
                    <TableHead>Enddatum</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vortrag von</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fiscalYears && fiscalYears.length > 0 ? fiscalYears.map((fy) => (
                    <TableRow key={fy.id} className={tenant?.activeFiscalYearId === fy.id ? 'bg-primary/10' : ''}>
                      <TableCell className="font-medium">{fy.name}</TableCell>
                      <TableCell>{formatDate(fy.startDate)}</TableCell>
                      <TableCell>{formatDate(fy.endDate)}</TableCell>
                      <TableCell>
                        {tenant?.activeFiscalYearId === fy.id && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="mr-1.5 h-4 w-4" /> Aktiv
                          </span>
                        )}
                         {fy.isClosed && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                             Geschlossen
                          </span>
                        )}
                        {!fy.isClosed && tenant?.activeFiscalYearId !== fy.id && (
                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                             Offen
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {fy.carryForwardSourceFiscalYearId 
                            ? fiscalYears.find(f => f.id === fy.carryForwardSourceFiscalYearId)?.name || 'Unbekannt' 
                            : '-'}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {tenant?.activeFiscalYearId !== fy.id && !fy.isClosed && (
                           <Button 
                             variant="outline" 
                             size="sm" 
                             onClick={() => handleSetActiveFiscalYear(fy.id)}
                             disabled={updateTenantMutation.isPending}
                           >
                             Als Aktiv setzen
                           </Button>
                        )}
                        <Button variant="outline" size="icon" onClick={() => handleEditFiscalYear(fy)} disabled={fy.isClosed}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Geschäftsjahr bearbeiten</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" disabled={deleteFiscalYearMutation.isPending && deleteFiscalYearMutation.variables === fy.id || fy.isClosed || tenant?.activeFiscalYearId === fy.id}>
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Geschäftsjahr löschen</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Diese Aktion kann nicht rückgängig gemacht werden. Das Geschäftsjahr "{fy.name}" wird dauerhaft gelöscht. Buchungsdaten werden NICHT gelöscht, sind aber ggf. nicht mehr zugänglich.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteFiscalYear(fy.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                disabled={deleteFiscalYearMutation.isPending && deleteFiscalYearMutation.variables === fy.id}
                              >
                                {(deleteFiscalYearMutation.isPending && deleteFiscalYearMutation.variables === fy.id) ? 'Löschen...' : 'Löschen'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        Keine Geschäftsjahre gefunden. Erstellen Sie eines, um loszulegen!
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedFiscalYear && (
        <Dialog open={isEditModalOpen} onOpenChange={(isOpen) => {
          setIsEditModalOpen(isOpen);
          if (!isOpen) setSelectedFiscalYear(null);
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Geschäftsjahr bearbeiten: {selectedFiscalYear.name}</DialogTitle>
              <DialogDescriptionComponent>
                Aktualisieren Sie die Details des Geschäftsjahres.
              </DialogDescriptionComponent>
            </DialogHeader>
            <FiscalYearForm 
              onSubmit={handleUpdateFiscalYear} 
              initialData={{
                name: selectedFiscalYear.name,
                startDate: new Date(selectedFiscalYear.startDate),
                endDate: new Date(selectedFiscalYear.endDate),
              }}
              isSubmitting={updateFiscalYearMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
      {tenant && fiscalYears && (
         <CarryForwardBalancesDialog
            tenantId={tenant.id}
            open={isCarryForwardModalOpen}
            onOpenChange={setIsCarryForwardModalOpen}
            fiscalYears={fiscalYears}
            currentChartOfAccountsId={tenant.chartOfAccountsId}
        />
      )}
    </div>
  );
}
