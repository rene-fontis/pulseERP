
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ArrowLeft, CalendarDays, BarChart2 as BarChartIconLucide, TrendingUp, TrendingDown, DollarSign, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend, ReferenceLine, LabelList
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";
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
  // Placeholder for best/worst case, can be enabled if data is available
  // bestCase: { label: "Best-Case Budget", color: "hsl(var(--chart-3))" },
  // worstCase: { label: "Worst-Case Budget", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;


function getAccountDetailsFromCoA(chartOfAccounts: TenantChartOfAccounts | undefined, accountId: string): (Account & { groupMainType?: AccountGroup['mainType'], groupName?: string }) | null {
  if (!chartOfAccounts) return null;
  for (const group of chartOfAccounts.groups) {
    const account = group.accounts.find(acc => acc.id === accountId);
    if (account) {
      let effectiveMainType: AccountGroup['mainType'] | undefined = group.mainType;
      if (!group.isFixed && group.parentId) {
        const parentGroup = chartOfAccounts.groups.find(pg => pg.id === group.parentId);
        if (parentGroup) effectiveMainType = parentGroup.mainType;
      }
      return { ...account, groupMainType: effectiveMainType, groupName: group.name };
    }
  }
  return null;
}

// Helper function to count occurrences of a recurring budget entry within a specific period
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
  while (isBefore(currentDate, periodStart)) { // Fast-forward to the period
    switch (entry.recurrence) {
      case 'Monthly': currentDate = addMonths(currentDate, 1); break;
      case 'Bimonthly': currentDate = addMonths(currentDate, 2); break;
      case 'Quarterly': currentDate = addMonths(currentDate, 3); break;
      case 'EveryFourMonths': currentDate = addMonths(currentDate, 4); break;
      case 'Semiannually': currentDate = addMonths(currentDate, 6); break;
      case 'Yearly': currentDate = addMonths(currentDate, 12); break;
      default: return 0;
    }
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

  const chartData = useMemo(() => {
    if (!clientLoaded || !selectedFiscalYearDetails || !accountDetails || !allJournalEntries || !allBudgetEntries || !chartOfAccounts) return [];

    const fyStartDate = startOfDay(parseISO(selectedFiscalYearDetails.startDate));
    const fyEndDate = endOfDay(parseISO(selectedFiscalYearDetails.endDate));
    const isBSAccount = accountDetails.groupMainType === 'Asset' || accountDetails.groupMainType === 'Liability' || accountDetails.groupMainType === 'Equity';
    const openingBalance = accountDetails.balance || 0;

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

    let cumulativeActualBalance = openingBalance;
    let cumulativeBudgetBalance = openingBalance;

    return periods.map(({ periodStart, periodEnd, periodLabel, sortKey }) => {
      let actualFlow = 0;
      let budgetFlow = 0;

      // Calculate Actual Flow/Balance
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

      // Calculate Budget Flow/Balance
      allBudgetEntries.forEach(be => {
        const occurrences = countBudgetEntryOccurrencesInPeriod(be, periodStart, periodEnd);
        if (occurrences > 0) {
          const amount = be.amountActual * occurrences;
          if (isBSAccount) { // Cashflow for BS accounts
            if (be.type === 'Transfer') {
              if (be.accountId === accountId) budgetFlow -= amount; // Outflow
              if (be.counterAccountId === accountId) budgetFlow += amount; // Inflow
            } else if (be.counterAccountId === accountId) { // Income/Expense affecting this BS account
              budgetFlow += (be.type === 'Income' ? amount : -amount);
            }
          } else { // P&L account flow
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
      } else { // P&L account: show flow
        dataPoint.actual = (accountDetails.groupMainType === 'Revenue' || accountDetails.groupMainType === 'Equity') ? -actualFlow : actualFlow; // Revenue is credit positive
        dataPoint.budget = (accountDetails.groupMainType === 'Revenue' || accountDetails.groupMainType === 'Equity') ? -budgetFlow : budgetFlow;
      }
      return dataPoint;
    }).sort((a,b) => a.sortKey.localeCompare(b.sortKey));

  }, [clientLoaded, selectedFiscalYearDetails, accountDetails, allJournalEntries, allBudgetEntries, aggregationPeriod, chartOfAccounts, accountId]);


  const isLoadingData = isLoadingTenant || isLoadingCoA || isLoadingFiscalYears || (selectedFiscalYearId && isLoadingSelectedFY) || isLoadingJournal || isLoadingBudget || !clientLoaded;

  const currentActualBalance = useMemo(() => {
    if (!accountDetails || !allJournalEntries || !clientLoaded) return accountDetails?.balance || 0;
    let balance = accountDetails.balance || 0;
    allJournalEntries.forEach(je => {
      // Optionally filter by selectedFiscalYearDetails if you only want balance for that FY
      // For now, using all entries to get "current overall balance"
      je.lines.forEach(line => {
        if (line.accountId === accountId) {
          balance += (line.debit || 0) - (line.credit || 0);
        }
      });
    });
    return balance;
  }, [accountDetails, allJournalEntries, clientLoaded, accountId]);
  
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
          <div><span className="font-semibold">Eröffnungsbilanz (GJ-Beginn):</span> {formatCurrency(accountDetails?.balance)}</div>
          <div><span className="font-semibold">Aktueller Saldo (Gesamt):</span> {formatCurrency(currentActualBalance)}</div>
          {accountDetails?.description && <div className="md:col-span-2"><span className="font-semibold">Beschreibung:</span> {accountDetails.description}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Kontoentwicklung</CardTitle>
              <CardDescription className="flex items-center">
                <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                {selectedFiscalYearDetails ? 
                    `Geschäftsjahr: ${selectedFiscalYearDetails.name} (${format(parseISO(selectedFiscalYearDetails.startDate), "dd.MM.yy")} - ${format(parseISO(selectedFiscalYearDetails.endDate), "dd.MM.yy")})` 
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
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />} />
                <ChartLegend content={<ChartLegendContent onClick={handleLegendClick} />} verticalAlign="top" wrapperStyle={{paddingBottom: '20px'}} />
                <ReferenceLine y={0} stroke="hsl(var(--foreground))" strokeOpacity={0.5} />

                {accountDetails?.groupMainType === 'Asset' || accountDetails?.groupMainType === 'Liability' || accountDetails?.groupMainType === 'Equity' ? (
                  <>
                    <Line type="monotone" dataKey="actual" stroke="var(--color-actual)" strokeWidth={2.5} dot={{ r: 4 }} name="Ist-Saldo" hide={!seriesVisibility.actual}/>
                    <Line type="monotone" dataKey="budget" stroke="var(--color-budget)" strokeWidth={2} dot={{ r: 3 }} name="Budget-Saldo" hide={!seriesVisibility.budget}/>
                  </>
                ) : ( // P&L accounts
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
    </div>
  );
}

