
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChartBig, AlertCircle, Loader2, CalendarIcon as CalendarDateIcon, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Legend as RechartsLegend, LabelList, ReferenceLine
} from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";
import { useGetTenantById } from '@/hooks/useTenants';
import { useGetTenantChartOfAccountsById } from '@/hooks/useTenantChartOfAccounts';
import { useGetBudgets } from '@/hooks/useBudgets';
import { useGetAllBudgetEntriesForTenant } from '@/hooks/useBudgetEntries'; // Ensure this hook is created
import { calculateBudgetReportData, type BudgetReportData } from '@/lib/budgetReporting'; // Ensure this lib is created
import type { AccountGroup } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

const budgetReportChartConfig = {
  actualProfitLoss: { label: "Standard P/L", color: "hsl(var(--chart-1))" },
  bestCaseProfitLoss: { label: "Best-Case P/L", color: "hsl(var(--chart-2))" },
  worstCaseProfitLoss: { label: "Worst-Case P/L", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

export default function BudgetReportsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [clientLoaded, setClientLoaded] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));

  const { data: tenant, isLoading: isLoadingTenant, error: tenantError } = useGetTenantById(tenantId);
  const { data: chartOfAccounts, isLoading: isLoadingCoA, error: coaError } = useGetTenantChartOfAccountsById(tenant?.chartOfAccountsId);
  const { data: budgets, isLoading: isLoadingBudgets, error: budgetsError } = useGetBudgets(tenantId);
  const { data: allBudgetEntries, isLoading: isLoadingEntries, error: entriesError } = useGetAllBudgetEntriesForTenant(tenantId);

  useEffect(() => {
    setClientLoaded(true);
  }, []);

  const budgetReportData: BudgetReportData | null = useMemo(() => {
    if (!clientLoaded || !chartOfAccounts || !budgets || !allBudgetEntries || !startDate || !endDate) {
      return null;
    }
    return calculateBudgetReportData(chartOfAccounts, budgets, allBudgetEntries, startDate, endDate, 'monthly');
  }, [clientLoaded, chartOfAccounts, budgets, allBudgetEntries, startDate, endDate]);

  const isLoading = isLoadingTenant || isLoadingCoA || isLoadingBudgets || isLoadingEntries || !clientLoaded;
  const combinedError = tenantError || coaError || budgetsError || entriesError;

  const pnlAccounts = useMemo(() => {
    if (!budgetReportData) return [];
    return budgetReportData.tableData.filter(
      (item) => item.mainType === 'Revenue' || item.mainType === 'Expense'
    ).sort((a,b) => {
        const typeOrder = { 'Revenue': 1, 'Expense': 2 };
        if (typeOrder[a.mainType] !== typeOrder[b.mainType]) {
            return typeOrder[a.mainType] - typeOrder[b.mainType];
        }
        return a.accountNumber.localeCompare(b.accountNumber);
    });
  }, [budgetReportData]);
  
  const calculateTotals = (mainType?: AccountGroup['mainType']) => {
    const relevantAccounts = mainType ? pnlAccounts.filter(acc => acc.mainType === mainType) : pnlAccounts;
    return {
      actual: relevantAccounts.reduce((sum, acc) => sum + (acc.mainType === 'Revenue' ? acc.actualAmount : -acc.actualAmount), 0),
      bestCase: relevantAccounts.reduce((sum, acc) => sum + (acc.mainType === 'Revenue' ? acc.bestCaseAmount : -acc.bestCaseAmount), 0),
      worstCase: relevantAccounts.reduce((sum, acc) => sum + (acc.mainType === 'Revenue' ? acc.worstCaseAmount : -acc.worstCaseAmount), 0),
    };
  };

  const revenueTotals = calculateTotals('Revenue');
  const expenseTotals = calculateTotals('Expense'); // Expenses are positive numbers in data, so sum them up directly.
  const profitLossTotals = {
      actual: revenueTotals.actual - expenseTotals.actual,
      bestCase: revenueTotals.bestCase - expenseTotals.bestCase,
      worstCase: revenueTotals.worstCase - expenseTotals.worstCase,
  };


  if (isLoading && !clientLoaded) {
    return (
      <div className="space-y-6 p-4 md:p-8">
        <Skeleton className="h-10 w-1/3 mb-2" /> <Skeleton className="h-6 w-2/3 mb-6" />
        <div className="flex gap-4 mb-4"> <Skeleton className="h-10 w-48" /> <Skeleton className="h-10 w-48" /> </div>
        <Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent><Skeleton className="h-[300px] w-full" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent><Skeleton className="h-[200px] w-full" /></CardContent></Card>
      </div>
    );
  }

  if (combinedError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Budgetberichte</h2>
        <p>{(combinedError as Error).message}</p>
      </div>
    );
  }
  
  if (!tenant && !isLoadingTenant && clientLoaded) {
     return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Mandant nicht gefunden</h2>
      </div>
    );
  }

  if (tenant && !tenant.chartOfAccountsId && !isLoadingCoA && clientLoaded) {
     return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Kein Kontenplan zugewiesen</h2>
        <p>Für diesen Mandanten wurde kein Kontenplan zugewiesen. Budgetberichte können nicht erstellt werden.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="px-4 md:px-0">
        <div className="flex items-center mb-1">
          <BarChartBig className="h-8 w-8 mr-3 text-primary" />
          <h1 className="text-3xl font-bold">Budgetberichte: {tenant?.name}</h1>
        </div>
        <p className="text-muted-foreground">Vergleichen Sie Budgetszenarien über ausgewählte Zeiträume.</p>
      </div>

      <Card className="shadow-lg mx-4 md:mx-0">
        <CardHeader>
          <CardTitle>Zeitraumauswahl</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[280px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                <CalendarDateIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP", { locale: de }) : <span>Startdatum wählen</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus locale={de} />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[280px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                <CalendarDateIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP", { locale: de }) : <span>Enddatum wählen</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus locale={de} disabled={(date) => startDate ? date < startDate : false} />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>
      
      {isLoading && clientLoaded && <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />}

      {!isLoading && clientLoaded && budgetReportData && (
        <>
          <Card className="shadow-lg mx-4 md:mx-0">
            <CardHeader>
              <CardTitle>Erfolgsentwicklung nach Szenario</CardTitle>
              <CardDescription>
                Monatlicher Gewinn/Verlust für Standard, Best-Case und Worst-Case Szenarien.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {budgetReportData.chartData.length > 0 ? (
                <ChartContainer config={budgetReportChartConfig} className="h-[350px] w-full">
                  <ComposedChart data={budgetReportData.chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="periodLabel" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickFormatter={(value) => `${(value / 1000)}k`} tickLine={false} axisLine={false} tickMargin={8}/>
                    <RechartsTooltip content={<ChartTooltipContent />} />
                    <RechartsLegend content={<ChartLegendContent />} verticalAlign="top" wrapperStyle={{paddingBottom: '20px'}} />
                    <ReferenceLine y={0} stroke="hsl(var(--foreground))" strokeDasharray="3 3" strokeWidth={1} />
                    <Line type="monotone" dataKey="actualProfitLoss" stroke="var(--color-actualProfitLoss)" strokeWidth={2.5} dot={{r:4}} name="Standard P/L" />
                    <Line type="monotone" dataKey="bestCaseProfitLoss" stroke="var(--color-bestCaseProfitLoss)" strokeWidth={2} dot={{r:3}} name="Best-Case P/L" />
                    <Line type="monotone" dataKey="worstCaseProfitLoss" stroke="var(--color-worstCaseProfitLoss)" strokeWidth={2} dot={{r:3}} name="Worst-Case P/L" />
                  </ComposedChart>
                </ChartContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">Keine Daten für das Diagramm im ausgewählten Zeitraum.</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg mx-4 md:mx-0">
            <CardHeader>
              <CardTitle>Budgetübersicht nach Konten</CardTitle>
              <CardDescription>
                Budgetierte Beträge pro Konto und Szenario für den Zeitraum {startDate ? format(startDate, "dd.MM.yy", { locale: de }) : ''} - {endDate ? format(endDate, "dd.MM.yy", { locale: de }) : ''}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Nr.</TableHead>
                      <TableHead>Konto</TableHead>
                      <TableHead className="text-right">Standard</TableHead>
                      <TableHead className="text-right">Best-Case</TableHead>
                      <TableHead className="text-right">Worst-Case</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pnlAccounts.length > 0 ? (
                        <>
                        <TableRow className="bg-muted/50 font-semibold">
                            <TableCell colSpan={2}>Erträge</TableCell>
                            <TableCell className="text-right">{formatCurrency(revenueTotals.actual)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(revenueTotals.bestCase)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(revenueTotals.worstCase)}</TableCell>
                        </TableRow>
                        {pnlAccounts.filter(acc => acc.mainType === 'Revenue').map(item => (
                            <TableRow key={item.accountId}>
                                <TableCell>{item.accountNumber}</TableCell>
                                <TableCell>{item.accountName}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.actualAmount)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.bestCaseAmount)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.worstCaseAmount)}</TableCell>
                            </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-semibold">
                            <TableCell colSpan={2}>Aufwände</TableCell>
                            <TableCell className="text-right">{formatCurrency(expenseTotals.actual)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(expenseTotals.bestCase)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(expenseTotals.worstCase)}</TableCell>
                        </TableRow>
                        {pnlAccounts.filter(acc => acc.mainType === 'Expense').map(item => (
                            <TableRow key={item.accountId}>
                                <TableCell>{item.accountNumber}</TableCell>
                                <TableCell>{item.accountName}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.actualAmount)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.bestCaseAmount)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.worstCaseAmount)}</TableCell>
                            </TableRow>
                        ))}
                        <TableRow className="bg-primary/10 font-bold border-t-2 border-primary">
                            <TableCell colSpan={2}>Gewinn / Verlust</TableCell>
                            <TableCell className="text-right">{formatCurrency(profitLossTotals.actual)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(profitLossTotals.bestCase)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(profitLossTotals.worstCase)}</TableCell>
                        </TableRow>
                        </>
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                          Keine Budgetdaten für die Tabelle im ausgewählten Zeitraum.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
       {!isLoading && clientLoaded && !budgetReportData && (
         <p className="text-muted-foreground text-center py-8">Bitte wählen Sie einen Zeitraum aus, um den Bericht zu generieren.</p>
      )}
    </div>
  );
}

