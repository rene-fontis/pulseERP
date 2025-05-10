
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChartBig, AlertCircle, Loader2, CalendarIcon as CalendarDateIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList, ReferenceLine
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";
import { useGetTenantById } from '@/hooks/useTenants';
import { useGetTenantChartOfAccountsById } from '@/hooks/useTenantChartOfAccounts';
import { useGetBudgets } from '@/hooks/useBudgets';
import { useGetAllBudgetEntriesForTenant } from '@/hooks/useBudgetEntries';
import { useGetAllJournalEntriesForTenant, useGetJournalEntriesBeforeDate } from '@/hooks/useJournalEntries'; 
import { calculateBudgetReportData, type BudgetReportData } from '@/lib/budgetReporting';
import type { AccountGroup, AggregationPeriod, CombinedBudgetReportChartItem } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  parseISO, 
  startOfYear, 
  endOfYear, 
  subMonths,
  isWithinInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  isAfter,
  isBefore,
  getISOWeekYear,
  getISOWeek,
} from 'date-fns';
import { de } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const chartConfig = {
  actualJournalProfitLoss: { label: "Ist G/V", color: "hsl(var(--chart-0))" }, 
  actualProfitLoss: { label: "Budget G/V Standard", color: "hsl(var(--chart-1))" },
  bestCaseProfitLoss: { label: "Budget G/V Best-Case", color: "hsl(var(--chart-2))" },
  worstCaseProfitLoss: { label: "Budget G/V Worst-Case", color: "hsl(var(--chart-3))" },
  actualRevenue: { label: "Eff. Ertrag", color: "hsl(var(--chart-4))" }, 
  actualExpense: { label: "Eff. Aufwand", color: "hsl(var(--chart-5))" }, 
} satisfies ChartConfig;

export default function BudgetReportsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [clientLoaded, setClientLoaded] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(startOfYear(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfYear(new Date()));
  const [aggregationPeriod, setAggregationPeriod] = useState<AggregationPeriod>('monthly');
  const [initialPnl, setInitialPnl] = useState(0);


  const { data: tenant, isLoading: isLoadingTenant, error: tenantError } = useGetTenantById(tenantId);
  const { data: chartOfAccounts, isLoading: isLoadingCoA, error: coaError } = useGetTenantChartOfAccountsById(tenant?.chartOfAccountsId);
  const { data: budgets, isLoading: isLoadingBudgets, error: budgetsError } = useGetBudgets(tenantId);
  const { data: allBudgetEntries, isLoading: isLoadingBudgetEntries, error: budgetEntriesError } = useGetAllBudgetEntriesForTenant(tenantId);
  const { data: allJournalEntries, isLoading: isLoadingJournalEntries, error: journalEntriesError } = useGetAllJournalEntriesForTenant(tenantId); 
  
  const { data: historicalJournalEntries, isLoading: isLoadingHistoricalEntries } = useGetJournalEntriesBeforeDate(tenantId, startDate);


  const [seriesVisibility, setSeriesVisibility] = useState<Record<string, boolean>>({
    actualJournalProfitLoss: true,
    actualProfitLoss: true,
    bestCaseProfitLoss: true,
    worstCaseProfitLoss: true,
    actualRevenue: true,
    actualExpense: true,
  });

  useEffect(() => {
    setClientLoaded(true);
  }, []);

  useEffect(() => {
    const calculateInitialPnl = () => {
        if (!historicalJournalEntries || !chartOfAccounts || !clientLoaded) {
            setInitialPnl(0);
            return;
        }
        let pnl = 0;
        historicalJournalEntries.forEach(entry => {
            entry.lines.forEach(line => {
                const account = chartOfAccounts.groups.flatMap(g => g.accounts).find(a => a.id === line.accountId);
                if (account) {
                    const group = chartOfAccounts.groups.find(g => g.accounts.some(acc => acc.id === line.accountId));
                    const mainGroup = group?.isFixed ? group : chartOfAccounts.groups.find(g => g.id === group?.parentId);
                    if (mainGroup?.mainType === 'Revenue') {
                        pnl -= (line.debit || 0) - (line.credit || 0); 
                    } else if (mainGroup?.mainType === 'Expense') {
                        pnl += (line.debit || 0) - (line.credit || 0); 
                    }
                }
            });
        });
        setInitialPnl(pnl);
    };
    calculateInitialPnl();
  }, [historicalJournalEntries, chartOfAccounts, clientLoaded]);


  const budgetReportData: BudgetReportData | null = useMemo(() => {
    if (!clientLoaded || !chartOfAccounts || !budgets || !allBudgetEntries || !startDate || !endDate) {
      return null;
    }
    // Pass budgets, though it's not used for scenario filtering anymore in the new logic
    return calculateBudgetReportData(chartOfAccounts, budgets, allBudgetEntries, startDate, endDate, aggregationPeriod);
  }, [clientLoaded, chartOfAccounts, budgets, allBudgetEntries, startDate, endDate, aggregationPeriod]);
  
  const actualChartDataRaw = useMemo(() => {
    if (!clientLoaded || !allJournalEntries || !startDate || !endDate || !chartOfAccounts) {
      return [];
    }
    const filteredEntries = allJournalEntries.filter(entry => {
      const entryDate = parseISO(entry.date);
      return isWithinInterval(entryDate, { start: startOfDay(startDate), end: endOfDay(endDate) });
    });

    const actualsByPeriod: Map<string, { revenue: number; expenses: number, periodLabel: string, sortKey: string }> = new Map();
    
    let periodsForActuals: {periodStart: Date, periodEnd: Date, periodKey: string, periodLabel: string, sortKey: string}[] = [];

    switch (aggregationPeriod) {
      case 'monthly':
        periodsForActuals = eachMonthOfInterval({ start: startDate, end: endDate }).map(d => {
          const ps = startOfMonth(d); const pe = endOfMonth(d); const pk = format(d, "yyyy-MM");
          const pl = format(d, "MMM yy", { locale: de });
          return {periodStart: ps, periodEnd: pe, periodKey: pk, periodLabel: pl, sortKey: pk };
        });
        break;
      case 'weekly':
        periodsForActuals = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 }).map(d => {
          const ps = startOfWeek(d, { weekStartsOn: 1}); const pe = endOfWeek(d, { weekStartsOn: 1});
          const year = getISOWeekYear(d); const weekNum = getISOWeek(d);
          const pk = `${year}-W${String(weekNum).padStart(2, '0')}`; const pl = `KW${weekNum} '${String(year).slice(-2)}`;
          return { periodStart: ps, periodEnd: pe, periodKey: pk, periodLabel: pl, sortKey: pk };
        });
        break;
      case 'daily':
        periodsForActuals = eachDayOfInterval({ start: startDate, end: endDate }).map(d => {
          const ps = startOfDay(d); const pe = endOfDay(d); const pk = format(d, 'yyyy-MM-dd');
          const pl = format(d, "dd.MM.yy", { locale: de });
          return { periodStart: ps, periodEnd: pe, periodKey: pk, periodLabel: pl, sortKey: pk };
        });
        break;
    }
    
    periodsForActuals.forEach(({periodStart, periodEnd, periodKey, periodLabel, sortKey}) => {
       let currentPeriodStart = periodStart; let currentPeriodEnd = periodEnd;
       if (isAfter(currentPeriodEnd, endOfDay(endDate))) currentPeriodEnd = endOfDay(endDate);
       if (isBefore(currentPeriodStart, startOfDay(startDate))) currentPeriodStart = startOfDay(startDate);

       if (!actualsByPeriod.has(periodKey)) {
         actualsByPeriod.set(periodKey, { revenue: 0, expenses: 0, periodLabel, sortKey });
       }
       const currentPeriodActuals = actualsByPeriod.get(periodKey)!;

       filteredEntries.forEach(entry => {
         const entryDate = parseISO(entry.date);
         if (isWithinInterval(entryDate, { start: currentPeriodStart, end: currentPeriodEnd })) {
           entry.lines.forEach(line => {
             const account = chartOfAccounts.groups.flatMap(g => g.accounts).find(a => a.id === line.accountId);
             if (account) {
                let groupOfAccount = chartOfAccounts.groups.find(g => g.accounts.some(acc => acc.id === line.accountId));
                let mainTypeForAggregation: AccountGroup['mainType'] | undefined = undefined;
                if (groupOfAccount) {
                    if (groupOfAccount.isFixed) mainTypeForAggregation = groupOfAccount.mainType;
                    else if (groupOfAccount.parentId) {
                        const parentFixedGroup = chartOfAccounts.groups.find(pg => pg.id === groupOfAccount!.parentId && pg.isFixed);
                        if (parentFixedGroup) mainTypeForAggregation = parentFixedGroup.mainType;
                    }
                }
               const netChange = (line.debit || 0) - (line.credit || 0);
               if (mainTypeForAggregation === 'Revenue') currentPeriodActuals.revenue -= netChange; 
               else if (mainTypeForAggregation === 'Expense') currentPeriodActuals.expenses += netChange;
             }
           });
         }
       });
    });
    return Array.from(actualsByPeriod.values());
  }, [clientLoaded, allJournalEntries, startDate, endDate, chartOfAccounts, aggregationPeriod]);


  const combinedChartData: CombinedBudgetReportChartItem[] = useMemo(() => {
    if (!clientLoaded || (!budgetReportData?.chartData && actualChartDataRaw.length === 0)) return [];
  
    const budgetPeriodLabels = budgetReportData?.chartData.map(item => item.periodLabel) || [];
    const actualPeriodLabels = actualChartDataRaw.map(item => item.periodLabel);
    const allPeriodLabelsSet = new Set([...budgetPeriodLabels, ...actualPeriodLabels]);
    
    const sortedActualChartDataRawForSort = [...actualChartDataRaw].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    const sortedUniquePeriodLabels = Array.from(allPeriodLabelsSet).sort((a,b) => {
        const sortKeyA = sortedActualChartDataRawForSort.find(item => item.periodLabel === a)?.sortKey || a;
        const sortKeyB = sortedActualChartDataRawForSort.find(item => item.periodLabel === b)?.sortKey || b;
        return sortKeyA.localeCompare(sortKeyB);
    });

    let cumulativeActualJournalPnl = initialPnl;
    let cumulativeBudgetActualPnl = initialPnl;
    let cumulativeBudgetBestCasePnl = initialPnl;
    let cumulativeBudgetWorstCasePnl = initialPnl;

    return sortedUniquePeriodLabels.map(label => {
      const budgetItem = budgetReportData?.chartData.find(item => item.periodLabel === label);
      const actualItem = actualChartDataRaw.find(item => item.periodLabel === label);

      const periodActualJournalPnl = (actualItem?.revenue || 0) - (actualItem?.expenses || 0);
      cumulativeActualJournalPnl += periodActualJournalPnl;

      cumulativeBudgetActualPnl += budgetItem?.periodActualBudgetProfitLoss || 0;
      cumulativeBudgetBestCasePnl += budgetItem?.periodBestCaseBudgetProfitLoss || 0;
      cumulativeBudgetWorstCasePnl += budgetItem?.periodWorstCaseBudgetProfitLoss || 0;
      
      return {
        periodLabel: label,
        actualJournalRevenue: actualItem?.revenue || 0, 
        actualJournalExpense: -(actualItem?.expenses || 0), // Store as negative for downward bar
        
        cumulativeActualJournalProfitLoss: cumulativeActualJournalPnl,
        cumulativeActualBudgetProfitLoss: cumulativeBudgetActualPnl,
        cumulativeBestCaseBudgetProfitLoss: cumulativeBudgetBestCasePnl,
        cumulativeWorstCaseBudgetProfitLoss: cumulativeBudgetWorstCasePnl,
      };
    });
  }, [clientLoaded, budgetReportData, actualChartDataRaw, initialPnl]);


  const isLoading = isLoadingTenant || isLoadingCoA || isLoadingBudgets || isLoadingBudgetEntries || isLoadingJournalEntries || isLoadingHistoricalEntries || !clientLoaded;
  const combinedError = tenantError || coaError || budgetsError || budgetEntriesError || journalEntriesError;

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
      actual: relevantAccounts.reduce((sum, acc) => sum + acc.actualAmount, 0),
      bestCase: relevantAccounts.reduce((sum, acc) => sum + acc.bestCaseAmount, 0),
      worstCase: relevantAccounts.reduce((sum, acc) => sum + acc.worstCaseAmount, 0),
    };
  };

  const revenueTotals = calculateTotals('Revenue');
  const expenseTotals = calculateTotals('Expense'); 
  const profitLossTotals = {
      actual: revenueTotals.actual + expenseTotals.actual, 
      bestCase: revenueTotals.bestCase + expenseTotals.bestCase,
      worstCase: revenueTotals.worstCase + expenseTotals.worstCase,
  };


  const setDateRange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };
  
  const handleSetCurrentYear = () => {
    const now = new Date();
    setDateRange(startOfYear(now), endOfYear(now));
  };
  
  const handleSetLastMonth = () => {
    const now = new Date();
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    setDateRange(lastMonthStart, lastMonthEnd);
  };
  
  const handleSetLastYear = () => {
    const now = new Date();
    const lastYearStart = startOfYear(subMonths(now, 12));
    const lastYearEnd = endOfYear(subMonths(now, 12));
    setDateRange(lastYearStart, lastYearEnd);
  };

  const handleLegendClick = (data: any) => {
    const { dataKey } = data;
    if (dataKey && typeof dataKey === 'string' && chartConfig.hasOwnProperty(dataKey)) {
        setSeriesVisibility(prev => ({
            ...prev,
            [dataKey]: !prev[dataKey]
        }));
    }
  };

  if (isLoading && clientLoaded && <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />)

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
        <p className="text-muted-foreground">Vergleichen Sie Budgetszenarien und effektive Werte über ausgewählte Zeiträume.</p>
      </div>

      <Card className="shadow-lg mx-4 md:mx-0">
        <CardHeader>
          <CardTitle>Zeitraumauswahl</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Popover>
                <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full sm:w-[280px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
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
                <Button variant="outline" className={cn("w-full sm:w-[280px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                    <CalendarDateIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP", { locale: de }) : <span>Enddatum wählen</span>}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus locale={de} disabled={(date) => startDate ? date < startDate : false} />
                </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleSetCurrentYear}>Aktuelles Jahr</Button>
            <Button variant="outline" size="sm" onClick={handleSetLastMonth}>Letzter Monat</Button>
            <Button variant="outline" size="sm" onClick={handleSetLastYear}>Letztes Jahr</Button>
          </div>
        </CardContent>
      </Card>
      
      {isLoading && clientLoaded && <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />}

      {!isLoading && clientLoaded && (
        <>
          <Card className="shadow-lg mx-4 md:mx-0">
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle className="text-2xl font-bold">Erfolgsentwicklung</CardTitle>
                        <CardDescription>
                            Budgetierter G/V und effektiver Ertrag/Aufwand für den Zeitraum {startDate ? format(startDate, "dd.MM.yy", { locale: de }) : ''} - {endDate ? format(endDate, "dd.MM.yy", { locale: de }) : ''}.
                        </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                        <Label htmlFor="aggregation-period" className="shrink-0 text-sm">Ansicht:</Label>
                        <Select value={aggregationPeriod} onValueChange={(value) => setAggregationPeriod(value as AggregationPeriod)}>
                            <SelectTrigger id="aggregation-period" className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Zeitraum wählen" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="monthly">Monatlich</SelectItem>
                                <SelectItem value="weekly">Wöchentlich</SelectItem>
                                <SelectItem value="daily">Täglich</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
              {combinedChartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[400px] w-full">
                  <ComposedChart data={combinedChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="periodLabel" tickLine={false} axisLine={{ stroke: 'hsl(var(--foreground))', strokeWidth: 1, strokeDasharray: "3 3" }} tickMargin={8} />
                    <YAxis tickFormatter={(value) => `${(value / 1000)}k`} tickLine={false} axisLine={false} tickMargin={8}/>
                    <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => [formatCurrency(name === 'Eff. Aufwand' ? Math.abs(value as number) : value as number), String(name)]}/>} />
                    <ChartLegend content={<ChartLegendContent onClick={handleLegendClick} />} verticalAlign="top" wrapperStyle={{paddingBottom: '20px'}} />
                    <ReferenceLine y={0} stroke="hsl(var(--foreground))" strokeWidth={2} />
                    
                    <Bar dataKey="actualJournalRevenue" fill="var(--color-actualRevenue)" radius={[4, 4, 0, 0]} barSize={15} hide={!seriesVisibility.actualRevenue} name="Eff. Ertrag">
                        <LabelList dataKey="actualJournalRevenue" position="top" formatter={(value: number) => value !== 0 ? formatCurrency(value) : ''} className="text-xs fill-muted-foreground" offset={5} />
                    </Bar>
                    <Bar dataKey="actualJournalExpense" fill="var(--color-actualExpense)" radius={[0, 0, 4, 4]} barSize={15} hide={!seriesVisibility.actualExpense} name="Eff. Aufwand">
                        <LabelList dataKey="actualJournalExpense" position="bottom" formatter={(value: number) => value !== 0 ? formatCurrency(Math.abs(value)) : ''} className="text-xs fill-muted-foreground" offset={5} />
                    </Bar>

                    <Line type="monotone" dataKey="cumulativeActualJournalProfitLoss" stroke="var(--color-actualJournalProfitLoss)" strokeWidth={2.5} dot={{r:4}} name="Ist G/V" hide={!seriesVisibility.actualJournalProfitLoss}/>
                    <Line type="monotone" dataKey="cumulativeActualBudgetProfitLoss" stroke="var(--color-actualProfitLoss)" strokeWidth={2.5} dot={{r:4}} name="Budget G/V Standard" hide={!seriesVisibility.actualProfitLoss}/>
                    <Line type="monotone" dataKey="cumulativeBestCaseBudgetProfitLoss" stroke="var(--color-bestCaseProfitLoss)" strokeWidth={2} dot={{r:3}} name="Budget G/V Best-Case" hide={!seriesVisibility.bestCaseProfitLoss}/>
                    <Line type="monotone" dataKey="cumulativeWorstCaseBudgetProfitLoss" stroke="var(--color-worstCaseProfitLoss)" strokeWidth={2} dot={{r:3}} name="Budget G/V Worst-Case" hide={!seriesVisibility.worstCaseProfitLoss}/>
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
                Budgetierte Beträge pro Konto für den Zeitraum {startDate ? format(startDate, "dd.MM.yy", { locale: de }) : ''} - {endDate ? format(endDate, "dd.MM.yy", { locale: de }) : ''}.
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
                        <React.Fragment>
                        <TableRow className="bg-muted/50 font-semibold">
                            <TableCell colSpan={2}>Erträge</TableCell><TableCell className="text-right">{formatCurrency(revenueTotals.actual)}</TableCell><TableCell className="text-right">{formatCurrency(revenueTotals.bestCase)}</TableCell><TableCell className="text-right">{formatCurrency(revenueTotals.worstCase)}</TableCell>
                        </TableRow>
                        {pnlAccounts.filter(acc => acc.mainType === 'Revenue').map(item => (
                            <TableRow key={item.accountId}><TableCell>{item.accountNumber}</TableCell><TableCell>{item.accountName}</TableCell><TableCell className="text-right">{formatCurrency(item.actualAmount)}</TableCell><TableCell className="text-right">{formatCurrency(item.bestCaseAmount)}</TableCell><TableCell className="text-right">{formatCurrency(item.worstCaseAmount)}</TableCell></TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-semibold">
                            <TableCell colSpan={2}>Aufwände</TableCell><TableCell className="text-right">{formatCurrency(expenseTotals.actual)}</TableCell><TableCell className="text-right">{formatCurrency(expenseTotals.bestCase)}</TableCell><TableCell className="text-right">{formatCurrency(expenseTotals.worstCase)}</TableCell>
                        </TableRow>
                        {pnlAccounts.filter(acc => acc.mainType === 'Expense').map(item => (
                            <TableRow key={item.accountId}><TableCell>{item.accountNumber}</TableCell><TableCell>{item.accountName}</TableCell><TableCell className="text-right">{formatCurrency(item.actualAmount)}</TableCell><TableCell className="text-right">{formatCurrency(item.bestCaseAmount)}</TableCell><TableCell className="text-right">{formatCurrency(item.worstCaseAmount)}</TableCell></TableRow>
                        ))}
                        <TableRow className="bg-primary/10 font-bold border-t-2 border-primary">
                            <TableCell colSpan={2}>Gewinn / Verlust</TableCell><TableCell className="text-right">{formatCurrency(profitLossTotals.actual)}</TableCell><TableCell className="text-right">{formatCurrency(profitLossTotals.bestCase)}</TableCell><TableCell className="text-right">{formatCurrency(profitLossTotals.worstCase)}</TableCell>
                        </TableRow>
                        </React.Fragment>
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
       {!isLoading && clientLoaded && !budgetReportData && (!startDate || !endDate) && (
         <p className="text-muted-foreground text-center py-8">Bitte wählen Sie einen Zeitraum aus, um den Bericht zu generieren.</p>
      )}
    </div>
  );
}

    
