src/components/accounting/AccountingOverview.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Scale, Landmark, DollarSign } from 'lucide-react';
import type { FinancialSummary } from '@/lib/accounting';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface AccountingOverviewProps {
  summary: FinancialSummary | null;
  isLoading: boolean;
}

const StatCard: React.FC<{ title: string; value: string; icon: React.ElementType; description?: string; positive?: boolean; negative?: boolean }> = ({ title, value, icon: Icon, description, positive, negative }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className={`h-4 w-4 ${positive ? 'text-green-500' : negative ? 'text-red-500' : 'text-muted-foreground'}`} />
    </CardHeader>
    <CardContent>
      <div className={`text-2xl font-bold ${positive ? 'text-green-600' : negative ? 'text-red-600' : ''}`}>{value}</div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </CardContent>
  </Card>
);

export function AccountingOverview({ summary, isLoading }: AccountingOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-3/4 mb-1" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Finanzübersicht</CardTitle>
          <CardDescription>Keine Daten für die Zusammenfassung verfügbar.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Bitte überprüfen Sie, ob ein Kontenplan zugewiesen und Buchungen vorhanden sind.</p>
        </CardContent>
      </Card>
    );
  }
  
  const profitLossIsPositive = summary.netProfitLoss >= 0;

  return (
    <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-4">Finanzübersicht</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
            <StatCard 
                title="Aktiven (Assets)" 
                value={formatCurrency(summary.totalAssets)} 
                icon={Landmark} 
                description="Gesamtwert aller Vermögenswerte"
            />
            <StatCard 
                title="Passiven (Liabilities)" 
                value={formatCurrency(summary.totalLiabilities)} 
                icon={Scale} 
                description="Gesamtwert aller Verbindlichkeiten"
            />
             <StatCard 
                title="Eigenkapital" 
                value={formatCurrency(summary.equity)} 
                icon={DollarSign} 
                description="Reinvermögen (Aktiven - Passiven)"
            />
            <StatCard 
                title={summary.netProfitLoss >= 0 ? "Gewinn" : "Verlust"}
                value={formatCurrency(summary.netProfitLoss)} 
                icon={summary.netProfitLoss >= 0 ? TrendingUp : TrendingDown}
                description="Ergebnis aus Erträgen und Aufwänden"
                positive={summary.netProfitLoss > 0}
                negative={summary.netProfitLoss < 0}
            />
        </div>
        <div className="grid gap-4 md:grid-cols-2 mt-4">
             <StatCard 
                title="Gesamtertrag (Revenue)" 
                value={formatCurrency(summary.totalRevenue)} 
                icon={TrendingUp} 
                description="Summe aller Erträge"
                positive
            />
            <StatCard 
                title="Gesamtaufwand (Expenses)" 
                value={formatCurrency(summary.totalExpenses)} 
                icon={TrendingDown} 
                description="Summe aller Aufwände"
                negative
            />
        </div>
    </div>
  );
}
