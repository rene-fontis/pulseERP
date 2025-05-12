"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, AlertCircle, Percent, PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import { useGetTenantById, useUpdateTenant } from '@/hooks/useTenants';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// import { Switch } from '@/components/ui/switch'; // Keep for other settings
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import type { Tenant, TaxRate } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDescRadix, AlertDialogFooter, AlertDialogHeader as AlertDialogHeaderRadix, AlertDialogTitle as AlertDialogTitleRadix } from "@/components/ui/alert-dialog"; // AlertDialogTriggerRadix removed as it's just AlertDialogTrigger
import { AlertDialogTrigger as AlertDialogTriggerRadix } from "@/components/ui/alert-dialog";
import { TaxRateForm, type TaxRateFormValues } from '@/components/settings/TaxRateForm';

const basicSettingsSchema = z.object({
  name: z.string().min(2, "Mandantenname muss mindestens 2 Zeichen lang sein."),
  vatNumber: z.string().optional(),
  // timezone: z.string().optional(), // Not used for now
  // notificationsEnabled: z.boolean().optional(), // Not used for now
});

type BasicSettingsFormValues = z.infer<typeof basicSettingsSchema>;

export default function TenantBasicSettingsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { data: tenant, isLoading, error, refetch } = useGetTenantById(tenantId);
  const updateTenantMutation = useUpdateTenant();
  const { toast } = useToast();

  const [isTaxRateModalOpen, setIsTaxRateModalOpen] = useState(false);
  const [selectedTaxRate, setSelectedTaxRate] = useState<TaxRate | null>(null);
  const [editingTaxRateId, setEditingTaxRateId] = useState<string | null>(null);


  const form = useForm<BasicSettingsFormValues>({
    resolver: zodResolver(basicSettingsSchema),
    defaultValues: {
      name: '',
      vatNumber: '',
    }
  });

  useEffect(() => {
    if (tenant) {
      form.reset({
        name: tenant.name,
        vatNumber: tenant.vatNumber || '',
      });
    }
  }, [tenant, form]);

  const onSubmitBasicSettings = async (values: BasicSettingsFormValues) => {
    if (!tenant) {
        toast({ title: "Fehler", description: "Mandant nicht geladen.", variant: "destructive" });
        return;
    }
    try {
      const dataToUpdate: Partial<Tenant> = {
        name: values.name,
        vatNumber: values.vatNumber || null,
      };
      
      await updateTenantMutation.mutateAsync({
        id: tenant.id,
        data: dataToUpdate
      });
      toast({ title: "Erfolg", description: "Basiseinstellungen erfolgreich aktualisiert." });
      refetch();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast({ title: "Fehler", description: `Einstellungen konnten nicht gespeichert werden: ${errorMessage}`, variant: "destructive" });
    }
  };

  const handleTaxRateSubmit = async (values: TaxRateFormValues) => {
    if (!tenant) return;

    let updatedTaxRates = [...(tenant.taxRates || [])];

    if (values.isDefault) {
        updatedTaxRates = updatedTaxRates.map(tr => ({ ...tr, isDefault: false }));
    }

    if (editingTaxRateId) { 
      updatedTaxRates = updatedTaxRates.map(tr => 
        tr.id === editingTaxRateId ? { id: editingTaxRateId, ...values } : tr // Ensure ID is preserved
      );
    } else { 
      const newTaxRate: TaxRate = {
        id: crypto.randomUUID(),
        ...values,
      };
      updatedTaxRates.push(newTaxRate);
    }
    
    const defaultTaxRate = updatedTaxRates.find(tr => tr.isDefault);
    if (!defaultTaxRate && updatedTaxRates.length > 0) {
      // If no default exists after potential changes, or if adding the first one, make the first one default
      const targetIndex = editingTaxRateId ? updatedTaxRates.findIndex(tr => tr.id === editingTaxRateId) : updatedTaxRates.length -1;
      if (values.isDefault || updatedTaxRates.length === 1 || !updatedTaxRates.some(tr => tr.isDefault)) {
         updatedTaxRates = updatedTaxRates.map((tr, index) => ({...tr, isDefault: index === (targetIndex !== -1 ? targetIndex : 0)}));
      }
    }


    try {
      await updateTenantMutation.mutateAsync({ id: tenant.id, data: { taxRates: updatedTaxRates } });
      toast({ title: "Erfolg", description: `Steuersatz ${editingTaxRateId ? 'aktualisiert' : 'hinzugefügt'}.` });
      setIsTaxRateModalOpen(false);
      setEditingTaxRateId(null);
      setSelectedTaxRate(null);
      refetch();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast({ title: "Fehler", description: `Steuersatz konnte nicht ${editingTaxRateId ? 'aktualisiert' : 'gespeichert'} werden: ${errorMessage}`, variant: "destructive" });
    }
  };
  
  const handleEditTaxRate = (taxRate: TaxRate) => {
    setSelectedTaxRate(taxRate);
    setEditingTaxRateId(taxRate.id);
    setIsTaxRateModalOpen(true);
  };

  const handleDeleteTaxRate = async (taxRateId: string) => {
    if (!tenant) return;
    let updatedTaxRates = (tenant.taxRates || []).filter(tr => tr.id !== taxRateId);
    
    const wasDefault = tenant.taxRates?.find(tr => tr.id === taxRateId)?.isDefault;

    if (wasDefault && updatedTaxRates.length > 0 && !updatedTaxRates.some(tr => tr.isDefault)) {
        updatedTaxRates[0].isDefault = true;
    }

    try {
      await updateTenantMutation.mutateAsync({ id: tenant.id, data: { taxRates: updatedTaxRates } });
      toast({ title: "Erfolg", description: "Steuersatz gelöscht." });
      refetch();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast({ title: "Fehler", description: `Steuersatz konnte nicht gelöscht werden: ${errorMessage}`, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
       <div className="space-y-6 p-4 md:p-8">
        <Skeleton className="h-10 w-1/3 mb-2" />
        <Skeleton className="h-6 w-2/3 mb-6" />
        <Card><CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader><CardContent className="space-y-6"><Skeleton className="h-20 w-full" /><Skeleton className="h-10 w-1/4" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-1/5" /></CardContent></Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4 md:p-8">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Einstellungen</h2>
        <p>{(error as Error).message}</p>
      </div>
    );
  }
  
  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 md:p-8">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Mandant nicht gefunden</h2>
        <p>Der angeforderte Mandant konnte nicht gefunden werden.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 px-4 md:px-0">
        <div className="flex items-center mb-2">
            <Settings className="h-8 w-8 mr-3 text-primary" />
            <h1 className="text-2xl font-bold">Basiseinstellungen: {tenant.name}</h1>
        </div>
        <p className="text-muted-foreground">
          Allgemeine Einstellungen und Präferenzen für den Mandanten {tenant.name}.
        </p>
      </div>
      
      <Card className="shadow-lg mx-4 md:mx-0">
        <CardHeader>
          <CardTitle className="text-xl">Mandanten Details</CardTitle>
           <CardDescription>
            Passen Sie hier die grundlegenden Informationen Ihres Mandanten an.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitBasicSettings)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mandantenname</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vatNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MWST-Nummer (UID)</FormLabel>
                    <FormControl><Input placeholder="CHE-XXX.XXX.XXX MWST" {...field} value={field.value || ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="border-t pt-6">
                <Button type="submit" disabled={updateTenantMutation.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  {updateTenantMutation.isPending && updateTenantMutation.variables?.data?.name ? "Speichern..." : "Mandanten Details speichern"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="shadow-lg mx-4 md:mx-0 mt-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center"><Percent className="mr-2 h-5 w-5 text-primary"/>Steuersätze</CardTitle>
            <CardDescription>Verwalten Sie die Mehrwertsteuersätze für diesen Mandanten.</CardDescription>
          </div>
            <Button onClick={() => { setSelectedTaxRate(null); setEditingTaxRateId(null); setIsTaxRateModalOpen(true); }} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <PlusCircle className="mr-2 h-4 w-4" /> Steuersatz hinzufügen
            </Button>
        </CardHeader>
        <CardContent>
            {(tenant.taxRates || []).length > 0 ? (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead className="text-right">Satz (%)</TableHead>
                                <TableHead>Standard</TableHead>
                                <TableHead className="text-right">Aktionen</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(tenant.taxRates || []).map(rate => (
                                <TableRow key={rate.id}>
                                    <TableCell className="font-medium">{rate.name}</TableCell>
                                    <TableCell className="text-right">{rate.rate.toLocaleString('de-CH')}%</TableCell>
                                    <TableCell>{rate.isDefault ? 'Ja' : 'Nein'}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="outline" size="icon" onClick={() => handleEditTaxRate(rate)} title="Steuersatz bearbeiten">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTriggerRadix asChild>
                                                <Button variant="destructive" size="icon" title="Steuersatz löschen" disabled={updateTenantMutation.isPending && updateTenantMutation.variables?.id === tenant.id && !!updateTenantMutation.variables.data?.taxRates?.find(tr => tr.id === rate.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTriggerRadix>
                                            <AlertDialogContent>
                                                <AlertDialogHeaderRadix><AlertDialogTitleRadix>Sind Sie sicher?</AlertDialogTitleRadix>
                                                    <AlertDialogDescRadix>
                                                    Steuersatz "{rate.name}" wirklich löschen?
                                                    </AlertDialogDescRadix>
                                                </AlertDialogHeaderRadix>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteTaxRate(rate.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                                                        disabled={updateTenantMutation.isPending && updateTenantMutation.variables?.id === tenant.id && !!updateTenantMutation.variables.data?.taxRates?.find(tr => tr.id === rate.id && tr.name === rate.name) }
                                                    >
                                                    {(updateTenantMutation.isPending && updateTenantMutation.variables?.id === tenant.id && !!updateTenantMutation.variables.data?.taxRates?.find(tr => tr.id === rate.id && tr.name === rate.name)) ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Löschen'}
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
                <p className="text-muted-foreground text-center py-4">Keine Steuersätze definiert.</p>
            )}
        </CardContent>
      </Card>

      <Dialog open={isTaxRateModalOpen} onOpenChange={(isOpen) => {
        setIsTaxRateModalOpen(isOpen);
        if (!isOpen) {
            setSelectedTaxRate(null);
            setEditingTaxRateId(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTaxRateId ? "Steuersatz bearbeiten" : "Neuer Steuersatz"}</DialogTitle>
            <DialogDescription>
                {editingTaxRateId ? "Aktualisieren Sie die Details des Steuersatzes." : "Definieren Sie einen neuen Steuersatz."}
            </DialogDescription>
          </DialogHeader>
          <TaxRateForm
            onSubmit={handleTaxRateSubmit}
            initialData={selectedTaxRate}
            isSubmitting={updateTenantMutation.isPending && updateTenantMutation.variables?.id === tenant.id && !!updateTenantMutation.variables.data?.taxRates}
          />
        </DialogContent>
      </Dialog>

    </div>
  );
}
