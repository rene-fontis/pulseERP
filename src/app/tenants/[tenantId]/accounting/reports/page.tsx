"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart2 as BarChartIconLucide, TrendingUp, TrendingDown, DollarSign, AlertCircle, Loader2, CalendarDays } from 'lucide-react';
import { useGetTenantById } from '@/hooks/useTenants';
import { useGetTenantChartOfAccountsById } from '@/hooks/useTenantChartOfAccounts';
import { useGetFiscalYears, useGetFiscalYearById } from '@/hooks/useFiscalYears';
import { useGetJournalEntries } from '@/hooks/useJournalEntries';
import { calculateFinancialSummary, type FinancialSummary } from '@/lib/accounting';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LabelList,
  ReferenceLine,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig
} from "@/components/ui/chart";
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import type { AggregationPeriod } from '@/types';

const chartConfig = {
    Ertrag: {
      label: "Ertrag",
      color: "hsl(var(--chart-2))",
      icon: TrendingUp
    },
    Aufwand: {
      label: "Aufwand",
      color: "hsl(var(--chart-1))",
      icon: TrendingDown
    },
    GewinnVerlust: {
      label: "Gewinn/Verlust",
      color: "hsl(var(--chart-4))",
      icon: DollarSign
    }
  } satisfies ChartConfig;


export default function TenantReportsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const { data: tenant, isLoading: isLoadingTenant, error: tenantError } = useGetTenantById(tenantId);
  const { data: chartOfAccounts, isLoading: isLoadingCoA, error: coaError } = useGetTenantChartOfAccountsById(tenant?.chartOfAccountsId);
  const { data: fiscalYears, isLoading: isLoadingFiscalYears, error: fiscalYearsError } = useGetFiscalYears(tenantId);

  const [selectedFiscalYearId, setSelectedFiscalYearId] = useState<string | undefined>(undefined);
  const [aggregationPeriod, setAggregationPeriod] = useState<AggregationPeriod>('monthly');
  const [clientLoaded, setClientLoaded] = useState(false);

  const [seriesVisibility, setSeriesVisibility] = useState<Record<string, boolean>>({
    Ertrag: true,
    Aufwand: true,
    GewinnVerlust: true,
  });

  useEffect(() => {
    setClientLoaded(true);
  }, []);

  useEffect(() => {
    if (tenant?.activeFiscalYearId && !selectedFiscalYearId) {
      setSelectedFiscalYearId(tenant.activeFiscalYearId);
    } else if (!tenant?.activeFiscalYearId && fiscalYears && fiscalYears.length > 0 && !selectedFiscalYearId) {
      setSelectedFiscalYearId(fiscalYears.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0].id);
    }
  }, [tenant, fiscalYears, selectedFiscalYearId]);

  const { data: journalEntries, isLoading: isLoadingEntries, error: entriesError } = useGetJournalEntries(tenantId, selectedFiscalYearId);
  const { data: selectedFiscalYearDetails, isLoading: isLoadingSelectedFiscalYear } = useGetFiscalYearById(tenantId, selectedFiscalYearId ?? null);
  
  const financialSummary: FinancialSummary | null = useMemo(() => {
    if (!chartOfAccounts || !journalEntries || !clientLoaded || !selectedFiscalYearDetails) return null;
    return calculateFinancialSummary(chartOfAccounts, journalEntries, selectedFiscalYearDetails, aggregationPeriod);
  }, [chartOfAccounts, journalEntries, clientLoaded, selectedFiscalYearDetails, aggregationPeriod]);

  const isLoadingData = isLoadingTenant || 
                        (clientLoaded && isLoadingCoA) || 
                        (clientLoaded && isLoadingEntries) || 
                        (clientLoaded && isLoadingFiscalYears) ||
                        (clientLoaded && selectedFiscalYearId && isLoadingSelectedFiscalYear);

  const combinedError = tenantError || coaError || entriesError || fiscalYearsError;

  const formatDate = (dateString: string | Date | undefined) => {
    if (!clientLoaded || !dateString) return "";
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return format(date, "dd.MM.yyyy", { locale: de });
    } catch (e) {
      return "Ungültiges Datum";
    }
  };
  
  const periodicalChartData = financialSummary?.periodicalBreakdown?.map(item => ({
    name: item.periodLabel,
    Ertrag: item.revenue,
    Aufwand: -item.expenses, 
    GewinnVerlust: item.revenue - item.expenses,
  })) || [];

  const handleLegendClick = (data: any) => {
    const { dataKey } = data;
    if (dataKey && typeof dataKey === 'string' && chartConfig.hasOwnProperty(dataKey)) {
        setSeriesVisibility(prev => ({
            ...prev,
            [dataKey]: !prev[dataKey]
        }));
    }
  };

  if (isLoadingData && !clientLoaded) {
    return (
      <div className="space-y-6 p-4 md:p-8">
        <Skeleton className="h-10 w-1/3 mb-2" />
        <Skeleton className="h-6 w-2/3 mb-6" />
        <Skeleton className="h-10 w-1/2 mb-4" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-5 w-3/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (combinedError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4 md:p-8">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Berichtsdaten</h2>
        <p>{(combinedError as Error).message}</p>
      </div>
    );
  }

  if (!tenant && !isLoadingTenant) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 md:p-8">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Mandant nicht gefunden</h2>
      </div>
    );
  }
  
  if (tenant && !tenant.chartOfAccountsId && !isLoadingCoA && clientLoaded) {
    return (
      <div className="container mx-auto py-8 text-center">
        <AlertCircle className="w-16 h-16 mb-4 mx-auto text-destructive" />
        <h2 className="text-2xl font-semibold mb-2">Kein Kontenplan zugewiesen</h2>
        <p>Für diesen Mandanten wurde kein Kontenplan zugewiesen.</p>
         <Button asChild variant="link" className="mt-4">
            <a href={`/tenants/${tenantId}/settings/chart-of-accounts`}>Zu Kontenplan Einstellungen</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="px-4 md:px-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
          <div className="flex items-center mb-2 sm:mb-0">
            <BarChartIconLucide className="h-8 w-8 mr-3 text-primary" />
            <h1 className="text-3xl font-bold">Berichte: {tenant?.name || (isLoadingTenant ? "Lade..." : "Unbekannt")}</h1>
          </div>
          {clientLoaded && fiscalYears && fiscalYears.length > 0 && (
            <div className="w-full sm:w-auto min-w-[250px]">
              <Select
                value={selectedFiscalYearId}
                onValueChange={setSelectedFiscalYearId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Geschäftsjahr wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {fiscalYears.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()).map((fy) => (
                    <SelectItem key={fy.id} value={fy.id}>
                      {fy.name} ({formatDate(fy.startDate)} - {formatDate(fy.endDate)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <p className="text-lg text-muted-foreground">
          Finanzberichte und Analysen für {tenant?.name || (isLoadingTenant ? "Lade..." : "Unbekannt")}.
        </p>
         {clientLoaded && fiscalYears && fiscalYears.length === 0 && !isLoadingFiscalYears && (
            <Card className="mt-4 border-destructive">
                <CardHeader className="flex-row items-center gap-2">
                    <AlertCircle className="text-destructive h-5 w-5"/>
                    <CardTitle className="text-destructive text-lg">Keine Geschäftsjahre</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Für diesen Mandanten wurden noch keine Geschäftsjahre definiert. Bitte legen Sie zuerst Geschäftsjahre in den <a href={`/tenants/${tenantId}/settings/fiscal-years`} className="underline hover:text-primary">Einstellungen</a> an.</p>
                </CardContent>
            </Card>
        )}
      </div>

      <Card className="shadow-xl mx-4 md:mx-0">
        <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <CardTitle className="text-2xl font-bold">Erfolgsübersicht</CardTitle>
                    <CardDescription className="flex items-center">
                        <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                        {selectedFiscalYearDetails ? 
                            `Geschäftsjahr: ${selectedFiscalYearDetails.name} (${formatDate(selectedFiscalYearDetails.startDate)} - ${formatDate(selectedFiscalYearDetails.endDate)})` 
                            : (isLoadingSelectedFiscalYear ? "Lade Geschäftsjahres Info..." : "Bitte Geschäftsjahr wählen")}
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
          {isLoadingData && clientLoaded ? (
            <Loader2 className="mx-auto my-8 h-12 w-12 animate-spin text-primary" />
          ) : !selectedFiscalYearDetails ? (
            <p className="text-muted-foreground text-center py-8">Bitte wählen Sie ein Geschäftsjahr, um das Diagramm anzuzeigen.</p>
          ) : periodicalChartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[450px] w-full">
              <ComposedChart data={periodicalChartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} horizontalStroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(var(--foreground))', strokeWidth: 1, strokeDasharray: "3 3" }}
                  tickMargin={8}
                />
                <YAxis
                  tickFormatter={(value) => `${(value / 1000)}k`}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <ChartTooltip
                  cursor={true}
                  content={<ChartTooltipContent formatter={(value, name) => {
                    const displayValue = name === "Aufwand" ? Math.abs(value as number) : value as number;
                    return [formatCurrency(displayValue), String(name)];
                  }} />}
                />
                <ChartLegend 
                    content={<ChartLegendContent onClick={handleLegendClick} />} 
                    verticalAlign="top" 
                    wrapperStyle={{ paddingBottom: '20px' }}
                />
                <ReferenceLine y={0} stroke="hsl(var(--foreground))" strokeWidth={2} strokeOpacity={0.9} />
                <Bar dataKey="Ertrag" fill="var(--color-Ertrag)" radius={[4, 4, 0, 0]} barSize={25} hide={!seriesVisibility.Ertrag}>
                  <LabelList dataKey="Ertrag" position="top" formatter={(value: number) => value !== 0 ? formatCurrency(value) : ''} className="text-xs fill-muted-foreground" offset={5} />
                </Bar>
                <Bar dataKey="Aufwand" fill="var(--color-Aufwand)" radius={[0, 0, 4, 4]} barSize={25} hide={!seriesVisibility.Aufwand}>
                  <LabelList dataKey="Aufwand" position="bottom" formatter={(value: number) => value !== 0 ? formatCurrency(Math.abs(value)) : ''} className="text-xs fill-muted-foreground" offset={5} />
                </Bar>
                <Line type="monotone" dataKey="GewinnVerlust" stroke="var(--color-GewinnVerlust)" strokeWidth={2.5} dot={{ r: 5, fill: "var(--color-GewinnVerlust)" }} activeDot={{ r: 7 }} name="Gewinn/Verlust" hide={!seriesVisibility.GewinnVerlust} />
              </ComposedChart>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">Keine Daten für die Erfolgsübersicht im gewählten Zeitraum verfügbar.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    
