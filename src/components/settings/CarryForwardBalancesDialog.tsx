
"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { FiscalYear } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useCarryForwardBalances } from '@/hooks/useTenantChartOfAccounts';
import { Loader2 } from 'lucide-react';

interface CarryForwardBalancesDialogProps {
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fiscalYears: FiscalYear[];
  currentChartOfAccountsId?: string | null;
}

export function CarryForwardBalancesDialog({
  tenantId,
  open,
  onOpenChange,
  fiscalYears,
  currentChartOfAccountsId
}: CarryForwardBalancesDialogProps) {
  const [sourceFiscalYearId, setSourceFiscalYearId] = useState<string | undefined>(undefined);
  const [targetFiscalYearId, setTargetFiscalYearId] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  const carryForwardMutation = useCarryForwardBalances();

  const handleCarryForward = async () => {
    if (!sourceFiscalYearId || !targetFiscalYearId) {
      toast({ title: "Fehler", description: "Bitte Quell- und Ziel-Geschäftsjahr auswählen.", variant: "destructive" });
      return;
    }
    if (sourceFiscalYearId === targetFiscalYearId) {
        toast({ title: "Fehler", description: "Quell- und Ziel-Geschäftsjahr dürfen nicht identisch sein.", variant: "destructive" });
        return;
    }
    if (!currentChartOfAccountsId) {
        toast({ title: "Fehler", description: "Kein aktiver Kontenplan für den Mandanten gefunden.", variant: "destructive" });
        return;
    }

    try {
      await carryForwardMutation.mutateAsync({
        tenantId,
        sourceFiscalYearId,
        targetFiscalYearId,
      });
      toast({ title: "Erfolg", description: "Salden erfolgreich vorgetragen." });
      onOpenChange(false);
      setSourceFiscalYearId(undefined);
      setTargetFiscalYearId(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast({ title: "Fehler beim Saldovortrag", description: errorMessage, variant: "destructive" });
    }
  };
  
  const openFiscalYears = fiscalYears.filter(fy => !fy.isClosed);

  const sourceOptions = openFiscalYears
    .filter(fy => fy.id !== targetFiscalYearId) // Cannot be the same as target
    .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()); // Newest first

  const targetOptions = openFiscalYears
    .filter(fy => fy.id !== sourceFiscalYearId) // Cannot be the same as source
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()); // Oldest first


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Salden vortragen</DialogTitle>
          <DialogDescription>
            Übertragen Sie die Endsalden der Bilanzkonten eines abgeschlossenen Geschäftsjahres als Anfangssalden in ein neues Geschäftsjahr.
            Erfolgsrechnungskonten werden für das neue Jahr auf Null gesetzt. Der Gewinn/Verlust wird auf das Konto &quot;Gewinnvortrag / Verlustvortrag&quot; gebucht.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="source-fy" className="text-right col-span-1">
              Von Jahr
            </Label>
            <Select value={sourceFiscalYearId} onValueChange={setSourceFiscalYearId}>
              <SelectTrigger id="source-fy" className="col-span-3">
                <SelectValue placeholder="Quell-Geschäftsjahr wählen..." />
              </SelectTrigger>
              <SelectContent>
                {sourceOptions.map(fy => (
                  <SelectItem key={fy.id} value={fy.id}>
                    {fy.name} ({new Date(fy.startDate).toLocaleDateString('de-CH')} - {new Date(fy.endDate).toLocaleDateString('de-CH')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="target-fy" className="text-right col-span-1">
              Nach Jahr
            </Label>
             <Select value={targetFiscalYearId} onValueChange={setTargetFiscalYearId}>
                <SelectTrigger id="target-fy" className="col-span-3">
                    <SelectValue placeholder="Ziel-Geschäftsjahr wählen..." />
                </SelectTrigger>
                <SelectContent>
                    {targetOptions.map(fy => (
                    <SelectItem key={fy.id} value={fy.id}>
                        {fy.name} ({new Date(fy.startDate).toLocaleDateString('de-CH')} - {new Date(fy.endDate).toLocaleDateString('de-CH')})
                        {fy.carryForwardSourceFiscalYearId && <span className="text-xs text-muted-foreground ml-2">(Vortrag von {fiscalYears.find(s => s.id === fy.carryForwardSourceFiscalYearId)?.name || 'Unbekannt'})</span>}
                    </SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button 
            onClick={handleCarryForward} 
            disabled={!sourceFiscalYearId || !targetFiscalYearId || carryForwardMutation.isPending}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {carryForwardMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salden jetzt vortragen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
