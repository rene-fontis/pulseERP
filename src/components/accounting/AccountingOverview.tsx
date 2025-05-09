"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FileText } from 'lucide-react';
import type { FinancialSummary } from '@/lib/accounting';
import type { TenantChartOfAccounts, Account, AccountGroup } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LabelList,
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

export function AccountingOverview({ summary, isLoading, chartOfAccounts }: AccountingOverviewProps) {
  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Skeleton for Bilanz Accordion */}
        <div>
            <div className="flex items-center mb-4">
                <Skeleton className="h-6 w-6 mr-2" />
                <Skeleton className="h-6 w-1/4" />
            </div>
            <Skeleton className="h-32 w-full rounded-lg" />
        </div>

        {/* Skeleton for Erfolgsrechnung Accordion & Chart */}
        <div>
            <div className="flex items-center mb-4">
                <Skeleton className="h-6 w-6 mr-2" />
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
            <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!summary || !chartOfAccounts || !summary.accountBalances || !summary.monthlyBreakdown) {
    return (
        <p className="text-muted-foreground">Keine Daten für die detaillierte Finanzübersicht verfügbar. Bitte überprüfen Sie, ob ein Kontenplan zugewiesen und Buchungen vorhanden sind.</p>
    );
  }
  
  const monthlyChartData = summary.monthlyBreakdown.map(item => ({
    name: item.monthYear, // e.g., "Jan '24"
    Ertrag: item.revenue,
    Aufwand: item.expenses,
  }));

  const chartConfig = {
    Ertrag: {
      label: "Ertrag",
      color: "hsl(var(--chart-2))", 
    },
    Aufwand: {
      label: "Aufwand",
      color: "hsl(var(--chart-1))", 
    },
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
                     // Also check subgroups if the main fixed group itself has no direct accounts
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
                                    .sort((a,b) => (a.isFixed ? -1 : 1)) // Fixed groups first, then subgroups
                                    .flatMap(g => g.accounts.sort((accA, accB) => accA.number.localeCompare(accB.number)))
                                    .map((account) => {
                                        const balance = summary.accountBalances[account.id] || 0;
                                        const displayBalance = (category.type === 'Liability' || category.type === 'Equity') ? -balance : balance;
                                        return (
                                            <TableRow key={account.id}>
                                            <TableCell className="font-medium">{account.number}</TableCell>
                                            <TableCell>{account.name}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(displayBalance)}</TableCell>
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
             <div className="flex items-center mb-4">
                <FileText className="h-6 w-6 mr-2 text-primary" />
                <h3 className="text-xl font-semibold">Erfolgsrechnung</h3>
            </div>

            {/* Chart for Monthly Revenue vs Expenses */}
            {monthlyChartData.length > 0 ? (
              <Card className="mb-6 shadow-md">
                <CardHeader>
                  <CardTitle>Monatlicher Aufwand vs. Ertrag</CardTitle>
                  <CardDescription>
                    Vergleich von Ertrag und Aufwand pro Monat.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <BarChart data={monthlyChartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={true}
                        tickMargin={8}
                      />
                      <YAxis
                        tickFormatter={(value) => `${(value / 1000)}k`}
                        tickLine={false}
                        axisLine={true}
                        tickMargin={8}
                      />
                      <ChartTooltip
                        cursor={true}
                        content={<ChartTooltipContent formatter={(value, name) => [formatCurrency(value as number), name]} />}
                      />
                       <ChartLegend content={<ChartLegendContent />} verticalAlign="top" wrapperStyle={{paddingBottom: '20px'}}/>
                      <Bar dataKey="Ertrag" fill="var(--color-Ertrag)" radius={[4, 4, 0, 0]} barSize={20}>
                        <LabelList dataKey="Ertrag" position="top" formatter={(value: number) => value !== 0 ? formatCurrency(value) : ''} className="text-xs fill-muted-foreground" offset={5}/>
                      </Bar>
                      <Bar dataKey="Aufwand" fill="var(--color-Aufwand)" radius={[4, 4, 0, 0]} barSize={20}>
                        <LabelList dataKey="Aufwand" position="top" formatter={(value: number) => value !== 0 ? formatCurrency(value) : ''} className="text-xs fill-muted-foreground" offset={5}/>
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            ) : (
                 <p className="text-muted-foreground mb-6">Keine monatlichen Daten für das Diagramm verfügbar.</p>
            )}

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
                                        const balance = summary.accountBalances[account.id] || 0;
                                        // For Revenue, a credit balance (negative in our system usually for assets) means positive revenue.
                                        // For Expenses, a debit balance (positive) means positive expense.
                                        const displayBalance = (category.type === 'Revenue') ? -balance : balance;
                                        return (
                                            <TableRow key={account.id}>
                                            <TableCell className="font-medium">{account.number}</TableCell>
                                            <TableCell>{account.name}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(displayBalance)}</TableCell>
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
