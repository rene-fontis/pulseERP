// src/components/dashboard/HomePageTenantCard.tsx
"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, BarChartBig, BookOpen } from 'lucide-react';
import type { Tenant, FinancialSummary, BudgetReportData, AccountGroup } from '@/types';
import { useGetFiscalYearById } from '@/hooks/useFiscalYears';
import { useGetTenantChartOfAccountsById } from '@/hooks/useTenantChartOfAccounts';
import { useGetAllJournalEntriesForTenant } from '@/hooks/useJournalEntries';
import { useGetBudgets } from '@/hooks/useBudgets';
import { useGetAllBudgetEntriesForTenant } from '@/hooks/useBudgetEntries';
import { calculateFinancialSummary } from '@/lib/accounting';
import { calculateBudgetReportData } from '@/lib/budgetReporting';
import { formatCurrency } from '@/lib/utils';
import { Button } from '../ui/button';

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

  const financialSummary: FinancialSummary | null = useMemo(() => {
    if (!clientLoaded || !chartOfAccounts || !allJournalEntries || !activeFiscalYear) return null;
    return calculateFinancialSummary(chartOfAccounts, allJournalEntries, activeFiscalYear);
  }, [clientLoaded, chartOfAccounts, allJournalEntries, activeFiscalYear]);

  const budgetReportData: BudgetReportData | null = useMemo(() => {
    if (!clientLoaded || !chartOfAccounts || !budgets || !allBudgetEntries || !activeFiscalYear) return null;
    return calculateBudgetReportData(chartOfAccounts, budgets, allBudgetEntries, new Date(activeFiscalYear.startDate), new Date(activeFiscalYear.endDate), 'monthly');
  }, [clientLoaded, chartOfAccounts, budgets, allBudgetEntries, activeFiscalYear]);

  const budgetStatus = useMemo(() => {
    if (!financialSummary || !budgetReportData || !activeFiscalYear) return { message: 'Budgetdaten nicht verfügbar.', type: 'info' as const };

    const budgetedRevenue = budgetReportData.tableData
      .filter(item => item.mainType === 'Revenue')
      .reduce((sum, item) => sum + item.actualAmount, 0);
    
    const budgetedExpenses = budgetReportData.tableData
      .filter(item => item.mainType === 'Expense')
      .reduce((sum, item) => sum + item.actualAmount, 0); // Expenses are positive here, P/L impact is negative

    const actualRevenue = financialSummary.totalRevenue;
    const actualExpenses = financialSummary.totalExpenses; // Expenses are positive here

    const warnings = [];

    // For revenue, underspending (actual < budget) is bad
    if (actualRevenue < budgetedRevenue * 0.9) { // Example: Warn if actual revenue is less than 90% of budget
      warnings.push(`Einnahmen (${formatCurrency(actualRevenue)}) liegen unter Budget (${formatCurrency(budgetedRevenue)}).`);
    }

    // For expenses, overspending (actual > budget) is bad
    if (actualExpenses > budgetedExpenses * 1.1) { // Example: Warn if actual expenses are more than 110% of budget
      warnings.push(`Ausgaben (${formatCurrency(actualExpenses)}) überschreiten Budget (${formatCurrency(budgetedExpenses)}).`);
    }
    
    if (warnings.length > 0) {
      return { message: warnings.join(' '), type: 'warning' as const };
    }
    return { message: 'Budget im Plan.', type: 'success' as const };

  }, [financialSummary, budgetReportData, activeFiscalYear]);


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


  const profitLoss = financialSummary?.netProfitLoss;
  const profitLossColor = profitLoss && profitLoss > 0 ? 'text-green-600' : profitLoss && profitLoss < 0 ? 'text-red-600' : 'text-foreground';
  const profitLossIcon = profitLoss && profitLoss >= 0 ? TrendingUp : TrendingDown;

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">{tenant.name}</CardTitle>
        <CardDescription>
          {activeFiscalYear ? `Geschäftsjahr: ${activeFiscalYear.name}` : 'Kein aktives Geschäftsjahr'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {financialSummary && profitLoss !== undefined ? (
          <div className="flex items-center">
            <profitLossIcon className={`mr-2 h-5 w-5 ${profitLossColor}`} />
            <p className={`text-lg font-medium ${profitLossColor}`}>
              {formatCurrency(profitLoss)} <span className="text-sm text-muted-foreground">G/V</span>
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