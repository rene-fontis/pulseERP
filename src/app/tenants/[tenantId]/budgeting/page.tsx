"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PlusCircle, Edit, Trash2, BarChartBig, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDescriptionComponent, DialogTrigger } from '@/components/ui/dialog';
import { BudgetForm, type BudgetFormValues } from '@/components/budget/BudgetForm';
import { useGetTenantById } from '@/hooks/useTenants';
import { useGetBudgets, useAddBudget, useUpdateBudget, useDeleteBudget } from '@/hooks/useBudgets';
import type { Budget } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export default function ManageBudgetsPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;

  const { data: tenant, isLoading: isLoadingTenant } = useGetTenantById(tenantId);
  const { data: budgets, isLoading: isLoadingBudgets, error: budgetsError } = useGetBudgets(tenantId);
  
  const addBudgetMutation = useAddBudget(tenantId);
  const updateBudgetMutation = useUpdateBudget();
  const deleteBudgetMutation = useDeleteBudget();
  const { toast } = useToast();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [clientLoaded, setClientLoaded] = useState(false);

  useEffect(() => {
    setClientLoaded(true);
  }, []);

  const handleCreateBudget = async (values: BudgetFormValues) => {
    try {
      await addBudgetMutation.mutateAsync(values);
      toast({ title: "Erfolg", description: "Budget erfolgreich erstellt." });
      setIsCreateModalOpen(false);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast({ title: "Fehler", description: `Budget konnte nicht erstellt werden: ${errorMessage}`, variant: "destructive" });
    }
  };

  const handleEditBudget = (budget: Budget) => {
    setSelectedBudget(budget);
    setIsEditModalOpen(true);
  };

  const handleUpdateBudget = async (values: BudgetFormValues) => {
    if (!selectedBudget) return;
    try {
      await updateBudgetMutation.mutateAsync({ budgetId: selectedBudget.id, data: values });
      toast({ title: "Erfolg", description: "Budget erfolgreich aktualisiert." });
      setIsEditModalOpen(false);
      setSelectedBudget(null);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast({ title: "Fehler", description: `Budget konnte nicht aktualisiert werden: ${errorMessage}`, variant: "destructive" });
    }
  };

  const handleDeleteBudget = async (budgetId: string) => {
    try {
      await deleteBudgetMutation.mutateAsync(budgetId);
      toast({ title: "Erfolg", description: "Budget erfolgreich gelöscht." });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast({ title: "Fehler", description: `Budget konnte nicht gelöscht werden: ${errorMessage}`, variant: "destructive" });
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

  const isLoading = isLoadingTenant || isLoadingBudgets || !clientLoaded;

  if (budgetsError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Budgets</h2>
        <p>{(budgetsError as Error).message}</p>
      </div>
    );
  }
   if (!tenant && !isLoadingTenant && clientLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Mandant nicht gefunden</h2>
        <p>Der Mandant für die Budgetverwaltung konnte nicht gefunden werden.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <div className="flex items-center mb-1">
          <BarChartBig className="h-8 w-8 mr-3 text-primary" />
          <h1 className="text-3xl font-bold">Budgetverwaltung: {tenant?.name || (isLoadingTenant && 'Laden...')}</h1>
        </div>
        <p className="text-muted-foreground">
          Erstellen und verwalten Sie Budgets für den Mandanten {tenant?.name || (isLoadingTenant && 'Laden...')}.
        </p>
      </div>

      <Card className="shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Definierte Budgets</CardTitle>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                <PlusCircle className="mr-2 h-4 w-4" /> Budget erstellen
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Neues Budget erstellen</DialogTitle>
                <DialogDescriptionComponent>
                  Definieren Sie ein neues Budget und wählen Sie ein Szenario.
                </DialogDescriptionComponent>
              </DialogHeader>
              <BudgetForm 
                onSubmit={handleCreateBudget} 
                isSubmitting={addBudgetMutation.isPending} 
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Szenario</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead>Erstellt am</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgets && budgets.length > 0 ? budgets.map((budget) => (
                    <TableRow key={budget.id} className="group">
                      <TableCell className="font-medium">
                        <Link href={`/tenants/${tenantId}/budgeting/${budget.id}/entries`} className="hover:underline">
                          {budget.name}
                        </Link>
                        <p className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">Klicken, um Einträge zu verwalten</p>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            budget.scenario === 'Actual' ? 'bg-blue-100 text-blue-700' :
                            budget.scenario === 'Best Case' ? 'bg-green-100 text-green-700' :
                            budget.scenario === 'Worst Case' ? 'bg-red-100 text-red-700' : ''
                          }`}>
                          {budget.scenario === "Actual" ? "Standard" : budget.scenario}
                        </span>
                      </TableCell>
                      <TableCell>{budget.description || '-'}</TableCell>
                      <TableCell>{formatDate(budget.createdAt)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleEditBudget(budget)} title="Budget bearbeiten">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" title="Budget löschen" disabled={deleteBudgetMutation.isPending && deleteBudgetMutation.variables === budget.id}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Diese Aktion kann nicht rückgängig gemacht werden. Das Budget "{budget.name}" und alle zugehörigen Einträge werden dauerhaft gelöscht.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteBudget(budget.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                disabled={deleteBudgetMutation.isPending && deleteBudgetMutation.variables === budget.id}
                              >
                                {(deleteBudgetMutation.isPending && deleteBudgetMutation.variables === budget.id) ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Löschen'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        Keine Budgets gefunden. Erstellen Sie eines, um loszulegen!
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedBudget && (
        <Dialog open={isEditModalOpen} onOpenChange={(isOpen) => {
          setIsEditModalOpen(isOpen);
          if (!isOpen) setSelectedBudget(null);
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Budget bearbeiten: {selectedBudget.name}</DialogTitle>
              <DialogDescriptionComponent>
                Aktualisieren Sie die Details des Budgets.
              </DialogDescriptionComponent>
            </DialogHeader>
            <BudgetForm 
              onSubmit={handleUpdateBudget} 
              initialData={selectedBudget}
              isSubmitting={updateBudgetMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

