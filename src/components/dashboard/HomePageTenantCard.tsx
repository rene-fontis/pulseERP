// src/components/dashboard/HomePageTenantCard.tsx
"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, BarChartBig, BookOpen, LayoutDashboard } from 'lucide-react';
import type { Tenant, FinancialSummary, BudgetReportData, FiscalYear } from '@/types';
import { useGetFiscalYearById } from '@/hooks/useFiscalYears';
import { useGetTenantChartOfAccountsById } from '@/hooks/useTenantChartOfAccounts';
import { useGetAllJournalEntriesForTenant } from '@/hooks/useJournalEntries';
import { useGetBudgets } from '@/hooks/useBudgets';
import { useGetAllBudgetEntriesForTenant } from '@/hooks/useBudgetEntries';
import { calculateFinancialSummary } from '@/lib/accounting';
import { calculateBudgetReportData } from '@/lib/budgetReporting';
import { formatCurrency } from '@/lib/utils';
import { Button } from '../ui/button';
import { min, parseISO } from 'date-fns';

interface HomePageTenantCardProps {
  tenant: Tenant;
}

export function HomePageTenantCard({ tenant }: HomePageTenantCardProps) {
  const [clientLoaded, setClientLoaded] = useState(false);

  useEffect(() => {
    setClientLoaded(true);
  }, []);

  const { data: activeFiscalYear, isLoading: isLoadingFY, error: errorFY } = useGetFiscalYearById(tenant.id, tenant.activeFiscalYearId ?? null);
  const { data: chartOfAccounts, isLoading: isLoadingCoA, error: errorCoA } = useGetTenantChartOfAccountsById(tenant.chartOfAccountsId);
  const { data: allJournalEntries, isLoading: isLoadingJournal, error: errorJournal } = useGetAllJournalEntriesForTenant(tenant.id);
  const { data: budgets, isLoading: isLoadingBudgets, error: errorBudgets } = useGetBudgets(tenant.id);
  const { data: allBudgetEntries, isLoading: isLoadingBudgetEntries, error: errorBudgetEntries } = useGetAllBudgetEntriesForTenant(tenant.id);

  const isLoading = isLoadingFY || isLoadingCoA || isLoadingJournal || isLoadingBudgets || isLoadingBudgetEntries || !clientLoaded;
  const combinedError = errorFY || errorCoA || errorJournal || errorBudgets || errorBudgetEntries;

  const currentDate = useMemo(() => new Date(), []);

  const reportEndDateForComparison = useMemo(() => {
    if (!activeFiscalYear) return currentDate;
    const fyEndDate = parseISO(activeFiscalYear.endDate);
    return min([currentDate, fyEndDate]);
  }, [activeFiscalYear, currentDate]);

  const fiscalYearDetailsForComparison = useMemo<FiscalYear | undefined>(() => {
    if (!activeFiscalYear) return undefined;
    return {
      ...activeFiscalYear,
      endDate: reportEndDateForComparison.toISOString(), // Override endDate for "to-date" calculation
    };
  }, [activeFiscalYear, reportEndDateForComparison]);

  const financialSummaryForComparison: FinancialSummary | null = useMemo(() => {
    if (!clientLoaded || !chartOfAccounts || !allJournalEntries || !fiscalYearDetailsForComparison) return null;
    // Pass the fiscalYearDetailsForComparison which has the potentially modified endDate
    return calculateFinancialSummary(chartOfAccounts, allJournalEntries, fiscalYearDetailsForComparison);
  }, [clientLoaded, chartOfAccounts, allJournalEntries, fiscalYearDetailsForComparison]);

  const budgetReportDataForComparison: BudgetReportData | null = useMemo(() => {
    if (!clientLoaded || !chartOfAccounts || !budgets || !allBudgetEntries || !activeFiscalYear) return null;
    const fyStartDate = parseISO(activeFiscalYear.startDate);
    // Use reportEndDateForComparison as the end date for budget calculation
    return calculateBudgetReportData(chartOfAccounts, budgets, allBudgetEntries, fyStartDate, reportEndDateForComparison, 'monthly');
  }, [clientLoaded, chartOfAccounts, budgets, allBudgetEntries, activeFiscalYear, reportEndDateForComparison]);


  const budgetStatus = useMemo(() => {
    if (!financialSummaryForComparison || !budgetReportDataForComparison || !activeFiscalYear) return { message: 'Budgetdaten nicht verfügbar.', type: 'info' as const };

    const budgetedRevenue = budgetReportDataForComparison.tableData
      .filter(item => item.mainType === 'Revenue')
      .reduce((sum, item) => sum + item.actualAmount, 0);
    
    const budgetedExpenses = budgetReportDataForComparison.tableData
      .filter(item => item.mainType === 'Expense')
      .reduce((sum, item) => sum + item.actualAmount, 0); 

    const actualRevenue = financialSummaryForComparison.totalRevenue;
    const actualExpenses = financialSummaryForComparison.totalExpenses;

    const warnings = [];

    if (actualRevenue < budgetedRevenue * 0.9) { 
      warnings.push(`Einnahmen (${formatCurrency(actualRevenue)}) liegen unter Budget (${formatCurrency(budgetedRevenue)}).`);
    }

    if (actualExpenses > budgetedExpenses * 1.1) { 
      warnings.push(`Ausgaben (${formatCurrency(actualExpenses)}) überschreiten Budget (${formatCurrency(budgetedExpenses)}).`);
    }
    
    if (warnings.length > 0) {
      return { message: warnings.join(' '), type: 'warning' as const };
    }
    return { message: 'Budget im Plan.', type: 'success' as const };

  }, [financialSummaryForComparison, budgetReportDataForComparison, activeFiscalYear]);


  if (isLoading && clientLoaded) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4 mb-1" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-9 w-1/3 mt-2" />
        </CardContent>
      </Card>
    );
  }
  
  if (combinedError && clientLoaded) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center">
            <AlertCircle className="mr-2 h-5 w-5" />
            {tenant.name}
          </CardTitle>
          <CardDescription className="text-destructive">Daten konnten nicht geladen werden.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-destructive">{(combinedError as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!tenant.activeFiscalYearId && clientLoaded) {
    return (
       <Card>
        <CardHeader>
          <CardTitle>{tenant.name}</CardTitle>
          <CardDescription className="text-muted-foreground">Status: Konfiguration erforderlich</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center text-amber-600">
            <AlertTriangle className="mr-2 h-5 w-5" />
            <p>Kein aktives Geschäftsjahr festgelegt.</p>
          </div>
           <Button asChild variant="link" size="sm" className="mt-2 px-0">
            <Link href={`/tenants/${tenant.id}/settings/fiscal-years`}>Zu den Einstellungen</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  if (!tenant.chartOfAccountsId && clientLoaded) {
     return (
       <Card>
        <CardHeader>
          <CardTitle>{tenant.name}</CardTitle>
          <CardDescription className="text-muted-foreground">Status: Konfiguration erforderlich</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center text-amber-600">
            <AlertTriangle className="mr-2 h-5 w-5" />
            <p>Kein Kontenplan zugewiesen.</p>
          </div>
          <Button asChild variant="link" size="sm" className="mt-2 px-0">
            <Link href={`/tenants/${tenant.id}/settings/chart-of-accounts`}>Zu den Einstellungen</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }


  const profitLoss = financialSummaryForComparison?.netProfitLoss;
  const profitLossColor = profitLoss && profitLoss > 0 ? 'text-green-600' : profitLoss && profitLoss < 0 ? 'text-red-600' : 'text-foreground';
  const ProfitLossIcon = profitLoss && profitLoss >= 0 ? TrendingUp : TrendingDown;

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">{tenant.name}</CardTitle>
        <CardDescription>
          {activeFiscalYear ? `Aktuelles Geschäftsjahr: ${activeFiscalYear.name}` : 'Kein aktives Geschäftsjahr'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {financialSummaryForComparison && profitLoss !== undefined && ProfitLossIcon ? (
          <div className="flex items-center">
            <ProfitLossIcon className={`mr-2 h-5 w-5 ${profitLossColor}`} />
            <p className={`text-lg font-medium ${profitLossColor}`}>
              {formatCurrency(profitLoss)} <span className="text-sm text-muted-foreground">G/V (bis heute)</span>
            </p>
          </div>
        ) : (
           <div className="flex items-center text-muted-foreground">
             <AlertCircle className="mr-2 h-5 w-5" />
             <p>G/V nicht verfügbar.</p>
           </div>
        )}

        {budgetStatus ? (
          <div className={`flex items-center text-sm ${budgetStatus.type === 'warning' ? 'text-amber-600' : budgetStatus.type === 'success' ? 'text-green-600' : 'text-muted-foreground'}`}>
            {budgetStatus.type === 'warning' && <AlertTriangle className="mr-2 h-4 w-4 flex-shrink-0" />}
            {budgetStatus.type === 'success' && <CheckCircle className="mr-2 h-4 w-4 flex-shrink-0" />}
            <p>{budgetStatus.message}</p>
          </div>
        ) : (
          <div className="flex items-center text-muted-foreground text-sm">
             <p>Budgetstatus wird geladen...</p>
          </div>
        )}
        <div className="pt-2 space-x-2">
            <Button asChild variant="outline" size="sm">
                <Link href={`/tenants/${tenant.id}/dashboard`}>
                    <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" /> Dashboard
                </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
                <Link href={`/tenants/${tenant.id}/accounting`}>
                    <BookOpen className="mr-1.5 h-3.5 w-3.5" /> Buchhaltung
                </Link>
            </Button>
             <Button asChild variant="outline" size="sm" className="mt-2 sm:mt-0">
                <Link href={`/tenants/${tenant.id}/budgeting`}>
                    <BarChartBig className="mr-1.5 h-3.5 w-3.5" /> Budgeting
                </Link>
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
