
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FileText, TrendingUp, TrendingDown, BarChart2 as BarChartIconLucide, DollarSign } from 'lucide-react';
import type { FinancialSummary } from '@/lib/accounting';
import type { TenantChartOfAccounts, Account, AccountGroup, FiscalYear } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
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

interface AccountingOverviewProps {
  summary: FinancialSummary | null;
  isLoading: boolean;
  chartOfAccounts: TenantChartOfAccounts | undefined;
  selectedFiscalYear: FiscalYear | undefined;
}

const bilanzCategories: Array<{ type: AccountGroup['mainType'], displayName: string, id: string }> = [
  { type: 'Asset', displayName: 'Aktiven', id: 'overview-assets' },
  { type: 'Liability', displayName: 'Passiven', id: 'overview-liabilities' },
  { type: 'Equity', displayName: 'Eigenkapital', id: 'overview-equity' },
];

const erfolgsrechnungCategories: Array<{ type: AccountGroup['mainType'], displayName: string, id: string }> = [
  { type: 'Revenue', displayName: 'Ertrag', id: 'overview-revenue' },
  { type: 'Expense', displayName: 'Aufwand', id: 'overview-expenses' },
];

export function AccountingOverview({ summary, isLoading, chartOfAccounts, selectedFiscalYear }: AccountingOverviewProps) {
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
            <div className="flex items-center mb-4">
                <Skeleton className="h-6 w-6 mr-2" />
                <Skeleton className="h-6 w-1/4" />
            </div>
            <Skeleton className="h-32 w-full rounded-lg" />
        </div>
        <div>
            <div className="flex items-center mb-4">
                <BarChartIconLucide className="h-6 w-6 mr-2 text-primary" />
                <Skeleton className="h-6 w-1/4" />
            </div>
            <Card className="mb-6">
              <CardHeader>
                <Skeleton className="h-6 w-1/3 mb-1" />
                <Skeleton className="h-4 w-2/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[350px] w-full" />
              </CardContent>
            </Card>
             <div className="flex items-center mb-4">
                <FileText className="h-6 w-6 mr-2 text-primary" />
                 <Skeleton className="h-6 w-1/4" />
            </div>
            <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!selectedFiscalYear) {
    return <p className="text-muted-foreground">Bitte wählen Sie ein Geschäftsjahr aus, um die Details anzuzeigen.</p>;
  }

  if (!summary || !chartOfAccounts || !summary.accountBalances) {
    return (
        <p className="text-muted-foreground">Keine Daten für die detaillierte Finanzübersicht im ausgewählten Geschäftsjahr verfügbar. Bitte überprüfen Sie, ob ein Kontenplan zugewiesen und Buchungen vorhanden sind.</p>
    );
  }

  const monthlyChartData = summary.monthlyBreakdown?.map(item => ({
    name: item.monthYear,
    Ertrag: item.revenue,
    Aufwand: -item.expenses, // Expenses are made negative to render downwards
    GewinnVerlust: item.revenue - item.expenses,
  })) || [];

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

  return (
    <div className="space-y-8">
        {/* Bilanz Section */}
        <div>
            <div className="flex items-center mb-4">
                <FileText className="h-6 w-6 mr-2 text-primary" />
                <h3 className="text-xl font-semibold">Bilanz</h3>
            </div>
            <Accordion type="multiple" className="w-full" defaultValue={bilanzCategories.map(c => c.id)}>
            {bilanzCategories.map((category) => {
                const accountsForCategory: Account[] = chartOfAccounts.groups
                .filter(group => group.mainType === category.type)
                .flatMap(group => group.accounts)
                .sort((a, b) => a.number.localeCompare(b.number));

                if (accountsForCategory.length === 0 && !chartOfAccounts.groups.some(g => g.parentId && chartOfAccounts.groups.find(pg => pg.id === g.parentId)?.mainType === category.type)) {
                    const subgroupsWithAccounts = chartOfAccounts.groups.filter(sg => sg.parentId && chartOfAccounts.groups.find(pg => pg.id === sg.parentId)?.mainType === category.type && sg.accounts.length > 0);
                    if (subgroupsWithAccounts.length === 0) return null;
                }

                return (
                <AccordionItem value={category.id} key={category.id}>
                    <AccordionTrigger className="text-lg font-medium hover:bg-muted/50 px-2 py-3 rounded-md">
                        {category.displayName}
                    </AccordionTrigger>
                    <AccordionContent className="pt-0">
                        <div className="overflow-x-auto">
                            <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead className="w-[100px]">Nummer</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead className="text-right">Saldo (CHF)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {chartOfAccounts.groups
                                    .filter(g => (g.mainType === category.type && g.isFixed) || (g.parentId && chartOfAccounts.groups.find(pg => pg.id === g.parentId)?.mainType === category.type))
                                    .sort((a,b) => (a.isFixed ? -1 : 1))
                                    .flatMap(g => g.accounts.sort((accA, accB) => accA.number.localeCompare(accB.number)))
                                    .map((account) => {
                                        const closingBalance = summary.accountBalances[account.id] || 0;
                                        let displayBalanceForBilanz = closingBalance;
                                        // Liabilities and Equity are typically credit balances.
                                        // To show them as positive conventional values in the balance sheet passives/equity side:
                                        if (category.type === 'Liability' || category.type === 'Equity') {
                                          displayBalanceForBilanz = -closingBalance;
                                        }

                                        return (
                                            <TableRow key={account.id}>
                                            <TableCell className="font-medium">{account.number}</TableCell>
                                            <TableCell>{account.name}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(displayBalanceForBilanz)}</TableCell>
                                            </TableRow>
                                        );
                                })}
                            </TableBody>
                            </Table>
                        </div>
                         {accountsForCategory.length === 0 &&
                            chartOfAccounts.groups.filter(g => (g.mainType === category.type && g.isFixed) || (g.parentId && chartOfAccounts.groups.find(pg => pg.id === g.parentId)?.mainType === category.type)).flatMap(g => g.accounts).length === 0 &&
                            (<p className="text-sm text-muted-foreground p-2">Keine Konten in dieser Kategorie.</p>)}
                    </AccordionContent>
                </AccordionItem>
                );
            })}
            </Accordion>
        </div>

        {/* Erfolgsrechnung Section */}
        <div>
             <div className="flex items-center mb-4 mt-8">
                <BarChartIconLucide className="h-6 w-6 mr-2 text-primary" />
                <h3 className="text-xl font-semibold">Monatliche Erfolgsübersicht</h3>
            </div>
            {monthlyChartData.length > 0 ? (
              <Card className="mb-6 shadow-md">
                <CardHeader>
                  <CardTitle>Monatlicher Aufwand vs. Ertrag</CardTitle>
                  <CardDescription>
                    Vergleich von Ertrag und Aufwand pro Monat im Geschäftsjahr: {selectedFiscalYear?.name}.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[400px] w-full">
                    <ComposedChart data={monthlyChartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} horizontalStroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={{ stroke: 'hsl(var(--foreground))', strokeWidth: 1.5 }}
                        tickMargin={8}
                      />
                      <YAxis
                        tickFormatter={(value) => `${(value / 1000)}k`}
                        tickLine={false}
                        axisLine={false} // Default Y axis line is turned off
                        tickMargin={8}
                      />
                      <ChartTooltip
                        cursor={true}
                        content={<ChartTooltipContent formatter={(value, name) => {
                            const displayValue = name === "Aufwand" ? Math.abs(value as number) : value as number;
                            return [formatCurrency(displayValue), String(name)];
                        }} />}
                      />
                       <ChartLegend content={<ChartLegendContent />} verticalAlign="top" wrapperStyle={{paddingBottom: '20px'}}/>
                       <ReferenceLine y={0} stroke="hsl(var(--foreground))" strokeWidth={1.5} strokeOpacity={0.7}/>
                      <Bar dataKey="Ertrag" fill="var(--color-Ertrag)" radius={[4, 4, 0, 0]} barSize={20}>
                        <LabelList dataKey="Ertrag" position="top" formatter={(value: number) => value !== 0 ? formatCurrency(value) : ''} className="text-xs fill-muted-foreground" offset={5}/>
                      </Bar>
                      <Bar dataKey="Aufwand" fill="var(--color-Aufwand)" radius={[4, 4, 0, 0]} barSize={20}>
                         {/* For negative bars (Aufwand), position="bottom" places label near zero-axis inside the bar */}
                        <LabelList dataKey="Aufwand" position="bottom" formatter={(value: number) => value !== 0 ? formatCurrency(Math.abs(value)) : ''} className="text-xs fill-muted-foreground" offset={5}/>
                      </Bar>
                       <Line type="monotone" dataKey="GewinnVerlust" stroke="var(--color-GewinnVerlust)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-GewinnVerlust)" }} activeDot={{ r: 6 }} name="Gewinn/Verlust" />
                    </ComposedChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            ) : (
                 <p className="text-muted-foreground mb-6">Keine monatlichen Erfolgsdaten für das Diagramm im ausgewählten Geschäftsjahr verfügbar.</p>
            )}

            <div className="flex items-center mb-4 mt-6">
                <FileText className="h-6 w-6 mr-2 text-primary" />
                <h3 className="text-xl font-semibold">Erfolgsrechnung (Periode)</h3>
            </div>
            <Accordion type="multiple" className="w-full" defaultValue={erfolgsrechnungCategories.map(c => c.id)}>
            {erfolgsrechnungCategories.map((category) => {
                const accountsForCategory: Account[] = chartOfAccounts.groups
                .filter(group => group.mainType === category.type)
                .flatMap(group => group.accounts)
                .sort((a, b) => a.number.localeCompare(b.number));

                if (accountsForCategory.length === 0 && !chartOfAccounts.groups.some(g => g.parentId && chartOfAccounts.groups.find(pg => pg.id === g.parentId)?.mainType === category.type)) {
                     const subgroupsWithAccounts = chartOfAccounts.groups.filter(sg => sg.parentId && chartOfAccounts.groups.find(pg => pg.id === sg.parentId)?.mainType === category.type && sg.accounts.length > 0);
                    if (subgroupsWithAccounts.length === 0) return null;
                }

                return (
                <AccordionItem value={category.id} key={category.id}>
                    <AccordionTrigger className="text-lg font-medium hover:bg-muted/50 px-2 py-3 rounded-md">
                        {category.displayName}
                    </AccordionTrigger>
                    <AccordionContent className="pt-0">
                        <div className="overflow-x-auto">
                            <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead className="w-[100px]">Nummer</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead className="text-right">Saldo (CHF)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {chartOfAccounts.groups
                                    .filter(g => (g.mainType === category.type && g.isFixed) || (g.parentId && chartOfAccounts.groups.find(pg => pg.id === g.parentId)?.mainType === category.type))
                                    .sort((a,b) => (a.isFixed ? -1 : 1))
                                    .flatMap(g => g.accounts.sort((accA, accB) => accA.number.localeCompare(accB.number)))
                                    .map((account) => {
                                        const closingBalance = summary.accountBalances[account.id] || 0;
                                        const openingBalance = chartOfAccounts.groups.flatMap(g => g.accounts).find(a => a.id === account.id)?.balance || 0;
                                        let periodChange = closingBalance - openingBalance;

                                        const displayAmount = (category.type === 'Revenue') ? -periodChange : periodChange;

                                        return (
                                            <TableRow key={account.id}>
                                            <TableCell className="font-medium">{account.number}</TableCell>
                                            <TableCell>{account.name}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(displayAmount)}</TableCell>
                                            </TableRow>
                                        );
                                })}
                            </TableBody>
                            </Table>
                        </div>
                         {accountsForCategory.length === 0 &&
                            chartOfAccounts.groups.filter(g => (g.mainType === category.type && g.isFixed) || (g.parentId && chartOfAccounts.groups.find(pg => pg.id === g.parentId)?.mainType === category.type)).flatMap(g => g.accounts).length === 0 &&
                            (<p className="text-sm text-muted-foreground p-2">Keine Konten in dieser Kategorie.</p>)}
                    </AccordionContent>
                </AccordionItem>
                );
            })}
            </Accordion>
        </div>
    </div>
  );
}
