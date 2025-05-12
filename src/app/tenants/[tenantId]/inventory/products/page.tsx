"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Boxes, PlusCircle, Edit, Trash2, Tag, AlertCircle, Loader2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDesc, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
// ProductCategoryForm related imports are removed as category management is moved to settings
import { ProductForm, type ProductFormValues as ProductFormVals } from '@/components/inventory/ProductForm';
import { useGetProductCategories } from '@/hooks/useProductCategories'; // Still needed for category selection in ProductForm
import { useGetProducts, useAddProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/useProducts';
import type { Product, NewProductPayload, ProductCategory } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

export default function ProductManagementPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { toast } = useToast();

  // Category States - only for reading categories for ProductForm
  const { data: categories, isLoading: isLoadingCategories, error: categoriesError } = useGetProductCategories(tenantId);

  // Product States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { data: products, isLoading: isLoadingProducts, error: productsError, refetch: refetchProducts } = useGetProducts(tenantId);
  const addProductMutation = useAddProduct(tenantId);
  const updateProductMutation = useUpdateProduct(tenantId);
  const deleteProductMutation = useDeleteProduct(tenantId);

  const [clientLoaded, setClientLoaded] = useState(false);
  useEffect(() => { setClientLoaded(true); }, []);

  // Product Handlers
  const handleAddProduct = async (values: ProductFormVals) => {
    const payload: NewProductPayload = { ...values, tenantId };
    try {
      await addProductMutation.mutateAsync(payload);
      toast({ title: "Erfolg", description: "Produkt erfolgreich erstellt." });
      setIsProductModalOpen(false);
      refetchProducts();
    } catch (e) {
      toast({ title: "Fehler", description: `Produkt konnte nicht erstellt werden: ${(e as Error).message}`, variant: "destructive" });
    }
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  const handleUpdateProduct = async (values: ProductFormVals) => {
    if (!selectedProduct) return;
    const payload: Partial<NewProductPayload> = { ...values };
    try {
      await updateProductMutation.mutateAsync({ productId: selectedProduct.id, data: payload });
      toast({ title: "Erfolg", description: "Produkt erfolgreich aktualisiert." });
      setIsProductModalOpen(false);
      setSelectedProduct(null);
      refetchProducts();
    } catch (e) {
      toast({ title: "Fehler", description: `Produkt konnte nicht aktualisiert werden: ${(e as Error).message}`, variant: "destructive" });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteProductMutation.mutateAsync(productId);
      toast({ title: "Erfolg", description: "Produkt erfolgreich gelöscht." });
      refetchProducts();
    } catch (e) {
      toast({ title: "Fehler", description: `Produkt konnte nicht gelöscht werden: ${(e as Error).message}`, variant: "destructive" });
    }
  };
  
  const getCategoryName = (categoryId: string | null | undefined) => {
    if (!categoryId || !categories) return '-';
    return categories.find(c => c.id === categoryId)?.name || 'Unbekannt';
  };


  const isLoading = (isLoadingCategories || isLoadingProducts) && !clientLoaded;
  const combinedError = categoriesError || productsError;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        <Skeleton className="h-10 w-2/5 mb-2" />
        <Skeleton className="h-6 w-3/5 mb-6" />
        <Card><CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader><CardContent><Skeleton className="h-32 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (combinedError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Produktdaten</h2>
        <p>{(combinedError as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Boxes className="h-8 w-8 mr-3 text-primary" />
          <h1 className="text-3xl font-bold">Produktverwaltung</h1>
        </div>
         <Button variant="outline" asChild>
            <Link href={`/tenants/${tenantId}/settings/inventory`}>
                <Settings className="mr-2 h-4 w-4" /> Benutzerdefinierte Felder
            </Link>
        </Button>
      </div>

      {/* Products Section */}
      <Card className="shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center"><Boxes className="mr-2 h-5 w-5 text-primary" />Produkte</CardTitle>
          <Dialog open={isProductModalOpen} onOpenChange={(isOpen) => { setIsProductModalOpen(isOpen); if(!isOpen) setSelectedProduct(null); }}>
            <DialogTrigger asChild><Button className="bg-accent text-accent-foreground hover:bg-accent/90"><PlusCircle className="mr-2 h-4 w-4" />Produkt hinzufügen</Button></DialogTrigger>
            <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{selectedProduct ? 'Produkt bearbeiten' : 'Neues Produkt'}</DialogTitle></DialogHeader>
              <ProductForm tenantId={tenantId} onSubmit={selectedProduct ? handleUpdateProduct : handleAddProduct} initialData={selectedProduct} isSubmitting={addProductMutation.isPending || updateProductMutation.isPending}/>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoadingProducts ? <Skeleton className="h-40 w-full" /> : products && products.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Art.Nr.</TableHead><TableHead>Name</TableHead><TableHead>Preis</TableHead><TableHead>Kategorien</TableHead><TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map(prod => (
                    <TableRow key={prod.id}>
                      <TableCell>{prod.itemNumber}</TableCell>
                      <TableCell className="font-medium">{prod.name}</TableCell>
                      <TableCell>{formatCurrency(prod.unitPrice)}</TableCell>
                      <TableCell>{(prod.categoryIds || []).map(id => getCategoryName(id)).join(', ') || '-'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleEditProduct(prod)} title="Produkt bearbeiten"><Edit className="h-4 w-4"/></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="destructive" size="icon" title="Produkt löschen"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Produkt "{prod.name}" löschen?</AlertDialogTitle><AlertDialogDescription>Sind Sie sicher? Diese Aktion kann nicht rückgängig gemacht werden.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Abbrechen</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteProduct(prod.id)} className="bg-destructive hover:bg-destructive/90">Löschen</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : <p className="text-muted-foreground text-center py-6">Noch keine Produkte erfasst.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
