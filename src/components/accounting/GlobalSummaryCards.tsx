
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Scale, Landmark, DollarSign, Minus, Plus } from 'lucide-react';
import type { FinancialSummary } from '@/lib/accounting';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  description?: string;
  valueColorClass?: string; // More flexible color control
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, description, valueColorClass }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className={`h-4 w-4 text-muted-foreground ${valueColorClass ? '' : ''}`} />
    </CardHeader>
    <CardContent>
      <div className={`text-2xl font-bold ${valueColorClass || ''}`}>{value}</div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </CardContent>
  </Card>
);

interface GlobalSummaryCardsProps {
  summary: FinancialSummary | null;
  isLoading: boolean;
}

export function GlobalSummaryCards({ summary, isLoading }: GlobalSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 px-4 md:px-0">
        {[...Array(6)].map((_, i) => (
          <Card key={`global-summary-skeleton-${i}`}>
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
      <div className="px-4 md:px-0 text-center py-4 text-muted-foreground">
        Keine Zusammenfassungsdaten verfügbar.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 px-4 md:px-0">
      <StatCard
        title="Veränderung Aktiven (Periode)"
        value={formatCurrency(summary.totalAssets)}
        icon={summary.totalAssets >= 0 ? Plus : Minus}
        description="Zunahme/Abnahme der Vermögenswerte in der Periode"
        valueColorClass={summary.totalAssets > 0 ? 'text-green-600' : summary.totalAssets < 0 ? 'text-red-600' : ''}
      />
      <StatCard
        title="Veränderung Passiven (Periode)"
        value={formatCurrency(summary.totalLiabilities)}
        icon={summary.totalLiabilities >= 0 ? Plus : Minus}
        description="Zunahme/Abnahme der Verbindlichkeiten in der Periode"
        valueColorClass={summary.totalLiabilities > 0 ? 'text-red-600' : summary.totalLiabilities < 0 ? 'text-green-600' : ''} // Increase in liability is usually "bad" for net worth view
      />
      <StatCard
        title="Eigenkapital (Ende Periode)"
        value={formatCurrency(summary.equity)}
        icon={DollarSign}
        description="Reinvermögen (Aktiven - Passiven) am Periodenende"
      />
       <StatCard
        title={summary.netProfitLoss >= 0 ? "Gewinn (Periode)" : "Verlust (Periode)"}
        value={formatCurrency(summary.netProfitLoss)}
        icon={summary.netProfitLoss >= 0 ? TrendingUp : TrendingDown}
        description="Ergebnis aus Erträgen und Aufwänden der Periode"
        valueColorClass={summary.netProfitLoss > 0 ? 'text-green-600' : summary.netProfitLoss < 0 ? 'text-red-600' : ''}
      />
      <StatCard
        title="Gesamtertrag (Periode)"
        value={formatCurrency(summary.totalRevenue)}
        icon={TrendingUp}
        description="Summe aller Erträge in der Periode"
        valueColorClass={summary.totalRevenue > 0 ? 'text-green-600' : summary.totalRevenue < 0 ? 'text-red-600' : ''}
      />
      <StatCard
        title="Gesamtaufwand (Periode)"
        value={formatCurrency(summary.totalExpenses)}
        icon={TrendingDown}
        description="Summe aller Aufwände in der Periode"
        valueColorClass={summary.totalExpenses > 0 ? 'text-red-600' : summary.totalExpenses < 0 ? 'text-green-600' : ''} // Higher expense is "bad"
      />
    </div>
  );
}
