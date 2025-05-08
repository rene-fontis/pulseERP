"use client";

import React, { useState } from 'react';
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

export default function ManageTenantsPage() {
  const { data: tenants, isLoading, error } = useGetTenants();
  const addTenantMutation = useAddTenant();
  const updateTenantMutation = useUpdateTenant();
  const deleteTenantMutation = useDeleteTenant();
  const { toast } = useToast();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  const handleCreateTenant = async (values: { name: string }) => {
    try {
      await addTenantMutation.mutateAsync(values.name);
      toast({ title: "Success", description: "Tenant created successfully.", variant: "default" });
      setIsCreateModalOpen(false);
    } catch (e) {
      toast({ title: "Error", description: "Failed to create tenant.", variant: "destructive" });
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
      toast({ title: "Success", description: "Tenant updated successfully.", variant: "default" });
      setIsEditModalOpen(false);
      setSelectedTenant(null);
    } catch (e) {
      toast({ title: "Error", description: "Failed to update tenant.", variant: "destructive" });
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    try {
      await deleteTenantMutation.mutateAsync(tenantId);
      toast({ title: "Success", description: "Tenant deleted successfully.", variant: "default" });
    } catch (e) {
      toast({ title: "Error", description: "Failed to delete tenant.", variant: "destructive" });
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Error Loading Tenants</h2>
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
            <CardTitle className="text-2xl font-bold">Tenant Management</CardTitle>
          </div>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                <PlusCircle className="mr-2 h-4 w-4" /> Create Tenant
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Tenant</DialogTitle>
                <DialogDescription>
                  Enter the name for the new tenant.
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
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants && tenants.length > 0 ? tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">{tenant.name}</TableCell>
                      <TableCell>{format(new Date(tenant.createdAt), "PPP p")}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleEditTenant(tenant)}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit Tenant</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon">
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete Tenant</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the tenant "{tenant.name}".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteTenant(tenant.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                disabled={deleteTenantMutation.isPending}
                              >
                                {deleteTenantMutation.isPending && deleteTenantMutation.variables === tenant.id ? 'Deleting...' : 'Delete'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                        No tenants found. Get started by creating one!
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
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>
              Update the name for tenant: {selectedTenant?.name}.
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
