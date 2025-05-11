"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ArrowLeft, CalendarDays, BarChart2 as BarChartIconLucide, TrendingUp, TrendingDown, DollarSign, Info, BookOpen, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend, ReferenceLine, LabelList
} from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart"; // Removed ChartTooltip import as ChartTooltipContent is used directly
import { useGetTenantById } from '@/hooks/useTenants';
import { useGetTenantChartOfAccountsById } from '@/hooks/useTenantChartOfAccounts';
import { useGetFiscalYears, useGetFiscalYearById } from '@/hooks/useFiscalYears';
import { useGetAllJournalEntriesForTenant } from '@/hooks/useJournalEntries';
import { useGetAllBudgetEntriesForTenant } from '@/hooks/useBudgetEntries';
import type { Account, AccountGroup, AggregationPeriod, BudgetEntry, FiscalYear, JournalEntry, JournalEntryLine, TenantChartOfAccounts } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { 
  format, parseISO, isWithinInterval, startOfDay, endOfDay, 
  eachMonthOfInterval, eachWeekOfInterval, eachDayOfInterval, 
  getISOWeekYear, getISOWeek, addMonths, addWeeks, addDays, 
  isEqual, isBefore, getYear, getMonth, 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, isAfter 
} from 'date-fns';
import { de } from 'date-fns/locale';

const chartConfigBase = {
  actual: { label: "Ist-Saldo/Fluss", color: "hsl(var(--chart-1))" },
  budget: { label: "Budget-Saldo/Fluss", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;


function getAccountDetailsFromCoA(chartOfAccounts: TenantChartOfAccounts | undefined, accountId: string): (Account & { groupMainType?: AccountGroup['mainType'], groupName?: string }) | null {
  if (!chartOfAccounts) return null;
  for (const group of chartOfAccounts.groups) {
    const account = group.accounts.find(acc => acc.id === accountId);
    if (account) {
      let effectiveMainType: AccountGroup['mainType'] | undefined = group.mainType;
      if (!group.isFixed && group.parentId) {
        let currentGroup: AccountGroup | undefined = group;
        while(currentGroup && !currentGroup.isFixed && currentGroup.parentId) {
            const parentGroup = chartOfAccounts.groups.find(pg => pg.id === currentGroup!.parentId);
             if (parentGroup?.isFixed) { // Found the ultimate fixed parent
                effectiveMainType = parentGroup.mainType;
                break; 
            }
            currentGroup = parentGroup;
        }
      }
      return { ...account, groupMainType: effectiveMainType, groupName: group.name };
    }
  }
  return null;
}

function countBudgetEntryOccurrencesInPeriod(
  entry: BudgetEntry,
  periodStart: Date,
  periodEnd: Date
): number {
  if (!entry.startDate) return 0;
  const entryStartDate = startOfDay(parseISO(entry.startDate));
  const entryOwnEndDate = entry.endDate ? endOfDay(parseISO(entry.endDate)) : null;

  if (entryOwnEndDate && isBefore(entryOwnEndDate, periodStart)) return 0;
  if (isAfter(entryStartDate, periodEnd)) return 0;

  if (!entry.isRecurring || entry.recurrence === 'None') {
    return isWithinInterval(entryStartDate, { start: periodStart, end: periodEnd }) ? 1 : 0;
  }

  let occurrences = 0;
  let currentDate = entryStartDate;
  
  while (isBefore(currentDate, periodStart)) { 
    let nextDate = currentDate;
    switch (entry.recurrence) {
      case 'Monthly': nextDate = addMonths(currentDate, 1); break;
      case 'Bimonthly': nextDate = addMonths(currentDate, 2); break;
      case 'Quarterly': nextDate = addMonths(currentDate, 3); break;
      case 'EveryFourMonths': nextDate = addMonths(currentDate, 4); break;
      case 'Semiannually': nextDate = addMonths(currentDate, 6); break;
      case 'Yearly': nextDate = addMonths(currentDate, 12); break;
      default: return 0; 
    }
    if (isAfter(nextDate, periodStart) && !isEqual(nextDate, periodStart) && isBefore(currentDate, periodStart)) {
      break; 
    }
    currentDate = nextDate;
    if (entryOwnEndDate && isAfter(currentDate, entryOwnEndDate)) break; 
  }

  while (isBefore(currentDate, periodEnd) || isEqual(currentDate, periodEnd)) {
    if (entryOwnEndDate && isAfter(currentDate, entryOwnEndDate)) break;
    if (isWithinInterval(currentDate, { start: periodStart, end: periodEnd })) {
      occurrences++;
    }
    switch (entry.recurrence) {
      case 'Monthly': currentDate = addMonths(currentDate, 1); break;
      case 'Bimonthly': currentDate = addMonths(currentDate, 2); break;
      case 'Quarterly': currentDate = addMonths(currentDate, 3); break;
      case 'EveryFourMonths': currentDate = addMonths(currentDate, 4); break;
      case 'Semiannually': currentDate = addMonths(currentDate, 6); break;
      case 'Yearly': currentDate = addMonths(currentDate, 12); break;
      default: return occurrences; 
    }
  }
  return occurrences;
}


export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const accountId = params.accountId as string;

  const [clientLoaded, setClientLoaded] = useState(false);
  const [selectedFiscalYearId, setSelectedFiscalYearId] = useState<string | undefined>(undefined);
  const [aggregationPeriod, setAggregationPeriod] = useState<AggregationPeriod>('monthly');
  const [seriesVisibility, setSeriesVisibility] = useState<Record<string, boolean>>({ actual: true, budget: true });

  useEffect(() => setClientLoaded(true), []);

  const { data: tenant, isLoading: isLoadingTenant } = useGetTenantById(tenantId);
  const { data: chartOfAccounts, isLoading: isLoadingCoA } = useGetTenantChartOfAccountsById(tenant?.chartOfAccountsId);
  const { data: fiscalYears, isLoading: isLoadingFiscalYears } = useGetFiscalYears(tenantId);
  const { data: selectedFiscalYearDetails, isLoading: isLoadingSelectedFY } = useGetFiscalYearById(tenantId, selectedFiscalYearId ?? null);
  const { data: allJournalEntries, isLoading: isLoadingJournal } = useGetAllJournalEntriesForTenant(tenantId);
  const { data: allBudgetEntries, isLoading: isLoadingBudget } = useGetAllBudgetEntriesForTenant(tenantId);

  const accountDetails = useMemo(() => getAccountDetailsFromCoA(chartOfAccounts, accountId), [chartOfAccounts, accountId]);

  useEffect(() => {
    if (tenant?.activeFiscalYearId && !selectedFiscalYearId) {
      setSelectedFiscalYearId(tenant.activeFiscalYearId);
    } else if (!tenant?.activeFiscalYearId && fiscalYears && fiscalYears.length > 0 && !selectedFiscalYearId) {
      setSelectedFiscalYearId(fiscalYears.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0].id);
    }
  }, [tenant, fiscalYears, selectedFiscalYearId]);

  const journalEntriesForAccountAndPeriod = useMemo(() => {
    if (!allJournalEntries || !selectedFiscalYearDetails || !accountId) return [];
    const fyStartDate = startOfDay(parseISO(selectedFiscalYearDetails.startDate));
    const fyEndDate = endOfDay(parseISO(selectedFiscalYearDetails.endDate));

    return allJournalEntries
      .filter(je => {
        const entryDate = parseISO(je.date);
        return isWithinInterval(entryDate, { start: fyStartDate, end: fyEndDate }) &&
               je.lines.some(line => line.accountId === accountId);
      })
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()); 
  }, [allJournalEntries, selectedFiscalYearDetails, accountId]);

  const periodMovement = useMemo(() => {
    if (!journalEntriesForAccountAndPeriod) return { debit: 0, credit: 0, net: 0 };
    let totalDebit = 0;
    let totalCredit = 0;
    journalEntriesForAccountAndPeriod.forEach(entry => {
      entry.lines.forEach(line => {
        if (line.accountId === accountId) {
          totalDebit += line.debit || 0;
          totalCredit += line.credit || 0;
        }
      });
    });
    return { debit: totalDebit, credit: totalCredit, net: totalDebit - totalCredit };
  }, [journalEntriesForAccountAndPeriod, accountId]);

  const chartData = useMemo(() => {
    if (!clientLoaded || !selectedFiscalYearDetails || !accountDetails || !allJournalEntries || !allBudgetEntries || !chartOfAccounts) {
      return [];
    }

    const fyStartDate = startOfDay(parseISO(selectedFiscalYearDetails.startDate));
    const fyEndDate = endOfDay(parseISO(selectedFiscalYearDetails.endDate));
    const isBSAccount = accountDetails.groupMainType === 'Asset' || accountDetails.groupMainType === 'Liability' || accountDetails.groupMainType === 'Equity';
    
    // For BS accounts, the opening balance for the chart needs to be the *start* of the selected fiscal year.
    // This is the `balance` field on the Account object within the TenantChartOfAccounts if it's correctly maintained
    // (i.e., updated by carry-forward operations).
    const openingBalanceForChart = accountDetails.balance || 0; 

    let periods: { periodStart: Date; periodEnd: Date; periodLabel: string; sortKey: string }[] = [];
    switch (aggregationPeriod) {
      case 'monthly':
        periods = eachMonthOfInterval({ start: fyStartDate, end: fyEndDate }).map(d => ({
          periodStart: startOfMonth(d), periodEnd: endOfMonth(d),
          periodLabel: format(d, "MMM yy", { locale: de }),
          sortKey: format(d, "yyyy-MM")
        }));
        break;
      case 'weekly':
        periods = eachWeekOfInterval({ start: fyStartDate, end: fyEndDate }, { weekStartsOn: 1 }).map(d => ({
          periodStart: startOfWeek(d, { weekStartsOn: 1 }), periodEnd: endOfWeek(d, { weekStartsOn: 1 }),
          periodLabel: `KW${getISOWeek(d)} '${String(getISOWeekYear(d)).slice(-2)}`,
          sortKey: `${getISOWeekYear(d)}-W${String(getISOWeek(d)).padStart(2, '0')}`
        }));
        break;
      case 'daily':
        periods = eachDayOfInterval({ start: fyStartDate, end: fyEndDate }).map(d => ({
          periodStart: startOfDay(d), periodEnd: endOfDay(d),
          periodLabel: format(d, "dd.MM.yy", { locale: de }),
          sortKey: format(d, "yyyy-MM-dd")
        }));
        break;
    }

    let cumulativeActualBalance = openingBalanceForChart;
    let cumulativeBudgetBalance = openingBalanceForChart;

    const result = periods.map(({ periodStart, periodEnd, periodLabel, sortKey }) => {
      let actualFlow = 0;
      let budgetFlow = 0;

      allJournalEntries
        .filter(je => isWithinInterval(parseISO(je.date), { start: periodStart, end: periodEnd }))
        .forEach(je => {
          je.lines.forEach(line => {
            if (line.accountId === accountId) {
              actualFlow += (line.debit || 0) - (line.credit || 0);
            }
          });
        });
      
      if (isBSAccount) {
        cumulativeActualBalance += actualFlow;
      }

      allBudgetEntries.forEach(be => {
        const occurrences = countBudgetEntryOccurrencesInPeriod(be, periodStart, periodEnd);
        if (occurrences > 0) {
          const amount = be.amountActual * occurrences;
          if (isBSAccount) { 
            if (be.type === 'Transfer') {
              if (be.accountId === accountId) budgetFlow -= amount; 
              if (be.counterAccountId === accountId) budgetFlow += amount; 
            } else if (be.counterAccountId === accountId) { 
              budgetFlow += (be.type === 'Income' ? amount : -amount);
            }
          } else { 
            if (be.accountId === accountId) {
              budgetFlow += (be.type === 'Income' ? amount : -amount);
            }
          }
        }
      });

      if (isBSAccount) {
        cumulativeBudgetBalance += budgetFlow;
      }
      
      const dataPoint: any = { periodLabel, sortKey };
      if (isBSAccount) {
        dataPoint.actual = cumulativeActualBalance;
        dataPoint.budget = cumulativeBudgetBalance;
      } else { 
        dataPoint.actual = (accountDetails.groupMainType === 'Revenue' || accountDetails.groupMainType === 'Equity') ? -actualFlow : actualFlow; 
        dataPoint.budget = (accountDetails.groupMainType === 'Revenue' || accountDetails.groupMainType === 'Equity') ? -budgetFlow : budgetFlow;
      }
      return dataPoint;
    }).sort((a,b) => a.sortKey.localeCompare(b.sortKey));
    
    return result;

  }, [clientLoaded, selectedFiscalYearDetails, accountDetails, allJournalEntries, allBudgetEntries, aggregationPeriod, chartOfAccounts, accountId]);

  const isLoadingData = isLoadingTenant || isLoadingCoA || isLoadingFiscalYears || (selectedFiscalYearId && isLoadingSelectedFY) || isLoadingJournal || isLoadingBudget || !clientLoaded;

  const currentActualBalance = useMemo(() => {
    if (!accountDetails || !selectedFiscalYearDetails || !clientLoaded) return accountDetails?.balance || 0;
    
    // Start with the account's opening balance for the selected fiscal year
    let balance = accountDetails.balance || 0; 
    
    // Add movements *within* the selected fiscal year
    journalEntriesForAccountAndPeriod.forEach(je => {
      je.lines.forEach(line => {
        if (line.accountId === accountId) {
          balance += (line.debit || 0) - (line.credit || 0);
        }
      });
    });
    return balance;
  }, [accountDetails, journalEntriesForAccountAndPeriod, selectedFiscalYearDetails, clientLoaded, accountId]);
  
  const handleLegendClick = (data: any) => {
    const { dataKey } = data;
    if (dataKey && typeof dataKey === 'string' && chartConfigBase.hasOwnProperty(dataKey)) {
        setSeriesVisibility(prev => ({
            ...prev,
            [dataKey]: !prev[dataKey]
        }));
    }
  };

  if (isLoadingData && clientLoaded) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        <Skeleton className="h-8 w-1/4 mb-2" />
        <Skeleton className="h-6 w-3/4 mb-4" />
        <Skeleton className="h-10 w-1/2 mb-6" />
        <div className="grid md:grid-cols-3 gap-4 mb-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
        </div>
        <Card><CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader><CardContent><Skeleton className="h-32 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!accountDetails && clientLoaded) {
    return (
      <div className="container mx-auto py-8 text-center">
        <AlertCircle className="w-16 h-16 mb-4 mx-auto text-destructive" />
        <h2 className="text-2xl font-semibold mb-2">Konto nicht gefunden</h2>
        <p>Das angeforderte Konto (ID: {accountId}) konnte nicht im Kontenplan des Mandanten gefunden werden.</p>
        <Button onClick={() => router.back()} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Zurück
        </Button>
      </div>
    );
  }
  
  const isBalanceSheetAccount = accountDetails?.groupMainType === 'Asset' || accountDetails?.groupMainType === 'Liability' || accountDetails?.groupMainType === 'Equity';

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Zurück zur Kontenübersicht
          </Button>
          <h1 className="text-3xl font-bold">Kontodetail: {accountDetails?.number} - {accountDetails?.name}</h1>
          <p className="text-muted-foreground">Mandant: {tenant?.name || '...'}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kontoübersicht</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div><span className="font-semibold">Kontonummer:</span> {accountDetails?.number}</div>
          <div><span className="font-semibold">Kontoname:</span> {accountDetails?.name}</div>
          <div><span className="font-semibold">Gruppe:</span> {accountDetails?.groupName || 'N/A'}</div>
          <div><span className="font-semibold">Haupttyp:</span> {accountDetails?.groupMainType || 'N/A'}</div>
          <div><span className="font-semibold">Eröffnungsbilanz (gem. Kontenplan):</span> {formatCurrency(accountDetails?.balance)}</div>
          <div>
            <span className="font-semibold">Saldo per Ende 
                {selectedFiscalYearDetails ? ` ${selectedFiscalYearDetails.name}` : ' aktueller Periode'}
                :
            </span> {formatCurrency(currentActualBalance)}
            </div>
          {accountDetails?.description && <div className="md:col-span-2"><span className="font-semibold">Beschreibung:</span> {accountDetails.description}</div>}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {selectedFiscalYearDetails && accountDetails && (
        <div className="grid md:grid-cols-3 gap-4">
          {isBalanceSheetAccount ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Eröffnungsbilanz ({selectedFiscalYearDetails.name})</CardTitle>
                  <Scale className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(accountDetails.balance)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Periodenbewegung ({selectedFiscalYearDetails.name})</CardTitle>
                  <BarChartIconLucide className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(periodMovement.net)}</div>
                  <p className="text-xs text-muted-foreground">
                    Soll: {formatCurrency(periodMovement.debit)}, Haben: {formatCurrency(periodMovement.credit)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Schlussbilanz ({selectedFiscalYearDetails.name})</CardTitle>
                  <Scale className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(currentActualBalance)}</div>
                </CardContent>
              </Card>
            </>
          ) : ( // P&L Account
            <>
              <Card className="md:col-span-3">
                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        {accountDetails.groupMainType === 'Revenue' ? 'Total Ertrag' : 'Total Aufwand'} ({selectedFiscalYearDetails.name})
                    </CardTitle>
                    {accountDetails.groupMainType === 'Revenue' ? <TrendingUp className="h-4 w-4 text-muted-foreground" /> : <TrendingDown className="h-4 w-4 text-muted-foreground" />}
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {formatCurrency(accountDetails.groupMainType === 'Revenue' ? (periodMovement.credit - periodMovement.debit) : (periodMovement.debit - periodMovement.credit))}
                    </div>
                     <p className="text-xs text-muted-foreground">
                        Periode: {format(parseISO(selectedFiscalYearDetails.startDate), "dd.MM.yy", {locale:de})} - {format(parseISO(selectedFiscalYearDetails.endDate), "dd.MM.yy", {locale:de})}
                    </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}


      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Kontoentwicklung</CardTitle>
              <CardDescription className="flex items-center">
                <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                {selectedFiscalYearDetails ? 
                    `Geschäftsjahr: ${selectedFiscalYearDetails.name} (${format(parseISO(selectedFiscalYearDetails.startDate), "dd.MM.yy", {locale:de})} - ${format(parseISO(selectedFiscalYearDetails.endDate), "dd.MM.yy", {locale:de})})` 
                    : "Bitte Geschäftsjahr wählen"}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2 mt-2 sm:mt-0">
              <div className="min-w-[180px]">
                <Label htmlFor="fiscal-year-select" className="sr-only">Geschäftsjahr</Label>
                <Select value={selectedFiscalYearId} onValueChange={setSelectedFiscalYearId}>
                  <SelectTrigger id="fiscal-year-select"><SelectValue placeholder="Geschäftsjahr..." /></SelectTrigger>
                  <SelectContent>
                    {fiscalYears?.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()).map(fy => (
                      <SelectItem key={fy.id} value={fy.id}>{fy.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[150px]">
                <Label htmlFor="aggregation-period" className="sr-only">Ansicht</Label>
                <Select value={aggregationPeriod} onValueChange={value => setAggregationPeriod(value as AggregationPeriod)}>
                  <SelectTrigger id="aggregation-period"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monatlich</SelectItem>
                    <SelectItem value="weekly">Wöchentlich</SelectItem>
                    <SelectItem value="daily">Täglich</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedFiscalYearDetails ? (
             <div className="h-[400px] flex items-center justify-center">
                <p className="text-muted-foreground flex items-center"><Info className="w-5 h-5 mr-2"/>Bitte wählen Sie ein Geschäftsjahr, um die Entwicklung anzuzeigen.</p>
            </div>
          ) : chartData.length > 0 ? (
            <ChartContainer config={chartConfigBase} className="h-[400px] w-full">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="periodLabel" tickLine={false} axisLine={{strokeDasharray:"3 3"}} tickMargin={8} />
                <YAxis tickFormatter={value => formatCurrency(value, 'CHF', 'de-CH').replace('CHF', '').trim()} tickLine={false} axisLine={false} tickMargin={8}/>
                <Tooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />} />
                <Legend content={<ChartLegendContent onClick={handleLegendClick} />} verticalAlign="top" wrapperStyle={{paddingBottom: '20px'}} />
                <ReferenceLine y={0} stroke="hsl(var(--foreground))" strokeOpacity={0.5} />

                {accountDetails?.groupMainType === 'Asset' || accountDetails?.groupMainType === 'Liability' || accountDetails?.groupMainType === 'Equity' ? (
                  <>
                    <Line type="monotone" dataKey="actual" stroke="var(--color-actual)" strokeWidth={2.5} dot={{ r: 4 }} name="Ist-Saldo" hide={!seriesVisibility.actual}/>
                    <Line type="monotone" dataKey="budget" stroke="var(--color-budget)" strokeWidth={2} dot={{ r: 3 }} name="Budget-Saldo" hide={!seriesVisibility.budget}/>
                  </>
                ) : ( 
                  <>
                    <Bar dataKey="actual" fill="var(--color-actual)" barSize={20} name="Ist-Fluss" hide={!seriesVisibility.actual}>
                       <LabelList dataKey="actual" position="top" formatter={(value: number) => value !== 0 ? formatCurrency(value) : ''} className="text-xs fill-muted-foreground" offset={5} />
                    </Bar>
                    <Bar dataKey="budget" fill="var(--color-budget)" barSize={20} name="Budget-Fluss" hide={!seriesVisibility.budget}>
                       <LabelList dataKey="budget" position="top" formatter={(value: number) => value !== 0 ? formatCurrency(value) : ''} className="text-xs fill-muted-foreground" offset={5} />
                    </Bar>
                  </>
                )}
              </ComposedChart>
            </ChartContainer>
          ) : (
            <div className="h-[400px] flex items-center justify-center">
               <p className="text-muted-foreground">Keine Daten für die Kontoentwicklung im gewählten Zeitraum verfügbar.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center">
            <BookOpen className="h-6 w-6 mr-3 text-primary" />
            <CardTitle className="text-2xl font-bold">Journal-Einträge für {accountDetails?.name}</CardTitle>
          </div>
          {selectedFiscalYearDetails && (
            <CardDescription>
              Anzeige aller Buchungen für dieses Konto im Geschäftsjahr: {selectedFiscalYearDetails.name}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {!selectedFiscalYearDetails ? (
            <p className="text-muted-foreground text-center py-4">Bitte wählen Sie ein Geschäftsjahr, um die Journaleinträge anzuzeigen.</p>
          ) : journalEntriesForAccountAndPeriod.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Beleg-Nr.</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead className="text-right">Soll</TableHead>
                    <TableHead className="text-right">Haben</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalEntriesForAccountAndPeriod.map(entry => {
                    const relevantLine = entry.lines.find(line => line.accountId === accountId);
                    if (!relevantLine) return null; 

                    return (
                      <TableRow key={entry.id}>
                        <TableCell>{format(parseISO(entry.date), "dd.MM.yyyy", { locale: de })}</TableCell>
                        <TableCell>{entry.entryNumber}</TableCell>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell className="text-right">
                          {relevantLine.debit && relevantLine.debit !== 0 ? formatCurrency(relevantLine.debit) : ''}
                        </TableCell>
                        <TableCell className="text-right">
                          {relevantLine.credit && relevantLine.credit !== 0 ? formatCurrency(relevantLine.credit) : ''}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Keine Journaleinträge für dieses Konto im ausgewählten Geschäftsjahr.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
