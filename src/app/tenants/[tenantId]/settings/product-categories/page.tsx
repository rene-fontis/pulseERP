
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Tag, PlusCircle, Edit, Trash2, AlertCircle, Loader2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDesc, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ProductCategoryForm, type ProductCategoryFormValues } from '@/components/inventory/ProductCategoryForm';
import { useGetProductCategories, useAddProductCategory, useUpdateProductCategory, useDeleteProductCategory } from '@/hooks/useProductCategories';
import type { ProductCategory, NewProductCategoryPayload } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ProductCategoriesSettingsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { toast } = useToast();

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const { data: categories, isLoading: isLoadingCategories, error: categoriesError, refetch: refetchCategories } = useGetProductCategories(tenantId);
  const addCategoryMutation = useAddProductCategory(tenantId);
  const updateCategoryMutation = useUpdateProductCategory(tenantId);
  const deleteCategoryMutation = useDeleteProductCategory(tenantId);

  const [clientLoaded, setClientLoaded] = useState(false);
  useEffect(() => { setClientLoaded(true); }, []);

  const handleAddCategory = async (values: ProductCategoryFormValues) => {
    try {
      await addCategoryMutation.mutateAsync(values);
      toast({ title: "Erfolg", description: "Kategorie erfolgreich erstellt." });
      setIsCategoryModalOpen(false);
      refetchCategories();
    } catch (e) {
      toast({ title: "Fehler", description: `Kategorie konnte nicht erstellt werden: ${(e as Error).message}`, variant: "destructive" });
    }
  };

  const handleEditCategory = (category: ProductCategory) => {
    setSelectedCategory(category);
    setIsCategoryModalOpen(true);
  };

  const handleUpdateCategory = async (values: ProductCategoryFormValues) => {
    if (!selectedCategory) return;
    try {
      await updateCategoryMutation.mutateAsync({ categoryId: selectedCategory.id, data: values });
      toast({ title: "Erfolg", description: "Kategorie erfolgreich aktualisiert." });
      setIsCategoryModalOpen(false);
      setSelectedCategory(null);
      refetchCategories();
    } catch (e) {
      toast({ title: "Fehler", description: `Kategorie konnte nicht aktualisiert werden: ${(e as Error).message}`, variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteCategoryMutation.mutateAsync(categoryId);
      toast({ title: "Erfolg", description: "Kategorie erfolgreich gelöscht." });
      refetchCategories();
    } catch (e) {
      toast({ title: "Fehler", description: `Kategorie konnte nicht gelöscht werden: ${(e as Error).message}`, variant: "destructive" });
    }
  };

  const getCategoryName = (categoryId: string | null | undefined) => {
    if (!categoryId || !categories) return '-';
    return categories.find(c => c.id === categoryId)?.name || 'Unbekannt';
  };

  const isLoading = isLoadingCategories && !clientLoaded;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        <Skeleton className="h-10 w-2/5 mb-2" />
        <Skeleton className="h-6 w-3/5 mb-6" />
        <Card><CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader><CardContent><Skeleton className="h-32 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (categoriesError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Kategoriedaten</h2>
        <p>{(categoriesError as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Tag className="h-8 w-8 mr-3 text-primary" />
          <h1 className="text-3xl font-bold">Produktkategorien</h1>
        </div>
      </div>

      <Card className="shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center"><Tag className="mr-2 h-5 w-5 text-primary" />Kategorien verwalten</CardTitle>
          <Dialog open={isCategoryModalOpen} onOpenChange={(isOpen) => { setIsCategoryModalOpen(isOpen); if(!isOpen) setSelectedCategory(null); }}>
            <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" />Kategorie hinzufügen</Button></DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>{selectedCategory ? 'Kategorie bearbeiten' : 'Neue Kategorie'}</DialogTitle></DialogHeader>
              <ProductCategoryForm 
                tenantId={tenantId} 
                onSubmit={selectedCategory ? handleUpdateCategory : handleAddCategory} 
                initialData={selectedCategory} 
                isSubmitting={addCategoryMutation.isPending || updateCategoryMutation.isPending} 
                currentCategoryId={selectedCategory?.id}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoadingCategories ? <Skeleton className="h-20 w-full" /> : categories && categories.length > 0 ? (
            <div className="space-y-3"> {/* Changed from grid to space-y for full-width list */}
              {categories.filter(cat => !cat.parentId).map(cat => ( // Display top-level categories
                 <RenderCategoryCard key={cat.id} category={cat} allCategories={categories} onEdit={handleEditCategory} onDelete={handleDeleteCategory} getCategoryName={getCategoryName}/>
              ))}
            </div>
          ) : <p className="text-muted-foreground text-center py-4">Keine Kategorien definiert.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

interface RenderCategoryCardProps {
    category: ProductCategory;
    allCategories: ProductCategory[];
    onEdit: (category: ProductCategory) => void;
    onDelete: (categoryId: string) => void;
    getCategoryName: (categoryId: string | null | undefined) => string;
    level?: number;
}

const RenderCategoryCard: React.FC<RenderCategoryCardProps> = ({ category, allCategories, onEdit, onDelete, getCategoryName, level = 0 }) => {
    const subCategories = allCategories.filter(sc => sc.parentId === category.id);
    return (
        <Card className={cn("p-3 text-sm", level > 0 ? 'ml-4 mt-2 border-l-2 pl-3 border-muted' : 'border')}>
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-semibold">{category.name}</h4>
                    {category.parentId && <p className="text-xs text-muted-foreground">Übergeordnet: {getCategoryName(category.parentId)}</p>}
                    <p className="text-xs text-muted-foreground mt-1" title={category.description}>{category.description || "Keine Beschreibung"}</p>
                </div>
                <div className="flex items-center space-x-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(category)}><Edit className="h-3.5 w-3.5"/></Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5"/></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Kategorie "{category.name}" löschen?</AlertDialogTitle><AlertDialogDescription>Sind Sie sicher? Diese Aktion kann nicht rückgängig gemacht werden. Unterkategorien werden ebenfalls entfernt (oder deren parentId wird null).</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Abbrechen</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(category.id)} className="bg-destructive hover:bg-destructive/90">Löschen</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
            {subCategories.length > 0 && (
                <div className="mt-2 space-y-2"> {/* Added space-y for sub-categories */}
                    {subCategories.map(subCat => (
                        <RenderCategoryCard key={subCat.id} category={subCat} allCategories={allCategories} onEdit={onEdit} onDelete={onDelete} getCategoryName={getCategoryName} level={level + 1} />
                    ))}
                </div>
            )}
        </Card>
    );
};
