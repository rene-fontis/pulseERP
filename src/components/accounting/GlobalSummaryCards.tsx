
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Scale, Landmark, DollarSign, Minus, Plus, ArrowRightLeft } from 'lucide-react';
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
  
  const netProfitLossTitle = summary.netProfitLoss >= 0 ? "Gewinn (Periode)" : "Verlust (Periode)";
  const netProfitLossIcon = summary.netProfitLoss >= 0 ? TrendingUp : TrendingDown;
  const netProfitLossColor = summary.netProfitLoss > 0 ? 'text-green-600' : summary.netProfitLoss < 0 ? 'text-red-600' : '';

  const equityChangeIcon = summary.equityPeriodChange >= 0 ? Plus : Minus;
  const equityChangeColor = summary.equityPeriodChange > 0 ? 'text-green-600' : summary.equityPeriodChange < 0 ? 'text-red-600' : '';


  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 px-4 md:px-0">
      <StatCard
        title="Veränderung Aktiven (Periode)"
        value={formatCurrency(summary.totalAssetsPeriodChange)}
        icon={summary.totalAssetsPeriodChange >= 0 ? Plus : Minus}
        description="Zunahme/Abnahme der Vermögenswerte in der Periode"
        valueColorClass={summary.totalAssetsPeriodChange > 0 ? 'text-green-600' : summary.totalAssetsPeriodChange < 0 ? 'text-red-600' : ''}
      />
      <StatCard
        title="Veränderung Passiven (Periode)"
        value={formatCurrency(summary.totalLiabilitiesPeriodChange)}
        icon={summary.totalLiabilitiesPeriodChange >= 0 ? Plus : Minus} // Increase in liability value (less negative) is an increase in liabilities
        description="Zunahme/Abnahme der Verbindlichkeiten in der Periode"
        valueColorClass={summary.totalLiabilitiesPeriodChange > 0 ? 'text-red-600' : summary.totalLiabilitiesPeriodChange < 0 ? 'text-green-600' : ''}
      />
       <StatCard
        title="Veränderung Eigenkapital (Periode)"
        value={formatCurrency(summary.equityPeriodChange)}
        icon={equityChangeIcon}
        description="Zunahme/Abnahme des Eigenkapitals in der Periode"
        valueColorClass={equityChangeColor}
      />
       <StatCard
        title={netProfitLossTitle}
        value={formatCurrency(summary.netProfitLoss)}
        icon={netProfitLossIcon}
        description="Ergebnis aus Erträgen und Aufwänden der Periode"
        valueColorClass={netProfitLossColor}
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
        valueColorClass={summary.totalExpenses > 0 ? 'text-red-600' : summary.totalExpenses < 0 ? 'text-green-600' : ''}
      />
    </div>
  );
}
