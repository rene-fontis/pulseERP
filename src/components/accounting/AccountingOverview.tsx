
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
                <Skeleton className="h-[200px] w-full" />
              </CardContent>
            </Card>
            <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!summary || !chartOfAccounts || !summary.accountBalances) {
    return (
        <p className="text-muted-foreground">Keine Daten für die detaillierte Finanzübersicht verfügbar. Bitte überprüfen Sie, ob ein Kontenplan zugewiesen und Buchungen vorhanden sind.</p>
    );
  }
  
  const chartData = summary ? [
    { name: "Erfolg", Ertrag: summary.totalRevenue, Aufwand: summary.totalExpenses },
  ] : [];

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

                if (accountsForCategory.length === 0) return null;

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
                                {accountsForCategory.map((account) => {
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

            {/* Chart for Revenue vs Expenses */}
            {summary && (summary.totalRevenue > 0 || summary.totalExpenses > 0) && (
              <Card className="mb-6 shadow-md">
                <CardHeader>
                  <CardTitle>Aufwand vs. Ertrag</CardTitle>
                  <CardDescription>
                    Vergleich von Gesamtertrag und Gesamtaufwand.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px] w-full"> {/* Changed: Explicit height */}
                    <BarChart 
                        accessibilityLayer 
                        data={chartData} 
                        layout="vertical"
                        margin={{ top: 5, right: 50, left: 5, bottom: 20 }} 
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        tick={false} 
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel formatter={(value, name) => <div className="flex flex-col items-start"><span className="font-medium">{name === 'Ertrag' ? 'Ertrag' : 'Aufwand'}</span><span className="text-sm text-muted-foreground">{formatCurrency(value as number)}</span></div>} />}
                      />
                       <ChartLegend content={<ChartLegendContent />} verticalAlign="bottom" wrapperStyle={{paddingTop: '20px'}}/>
                      <Bar dataKey="Ertrag" fill="var(--color-Ertrag)" radius={[0, 4, 4, 0]} barSize={35}>
                         <LabelList dataKey="Ertrag" position="right" offset={8} className="fill-foreground font-medium" formatter={(value: number) => formatCurrency(value)} />
                      </Bar>
                      <Bar dataKey="Aufwand" fill="var(--color-Aufwand)" radius={[0, 4, 4, 0]} barSize={35}>
                         <LabelList dataKey="Aufwand" position="right" offset={8} className="fill-foreground font-medium" formatter={(value: number) => formatCurrency(value)} />
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            <Accordion type="multiple" className="w-full" defaultValue={erfolgsrechnungCategories.map(c => c.id)}>
            {erfolgsrechnungCategories.map((category) => {
                const accountsForCategory: Account[] = chartOfAccounts.groups
                .filter(group => group.mainType === category.type)
                .flatMap(group => group.accounts)
                .sort((a, b) => a.number.localeCompare(b.number));

                if (accountsForCategory.length === 0) return null;

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
                                {accountsForCategory.map((account) => {
                                const balance = summary.accountBalances[account.id] || 0;
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
                    </AccordionContent>
                </AccordionItem>
                );
            })}
            </Accordion>
        </div>
    </div>
  );
}

