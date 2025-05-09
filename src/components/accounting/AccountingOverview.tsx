
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
                                    .sort((a,b) => (a.isFixed ? -1 : 1)) // Fixed groups first, then sort by name or number if needed
                                    .flatMap(g => g.accounts.sort((accA, accB) => accA.number.localeCompare(accB.number)))
                                    .map((account) => {
                                        const closingBalance = summary.accountBalances[account.id] || 0;
                                        const openingBalance = chartOfAccounts.groups.flatMap(g => g.accounts).find(a => a.id === account.id)?.balance || 0;
                                        let periodChange = closingBalance - openingBalance;

                                        let displayBalanceForBilanz = periodChange; 
                                        if (category.type === 'Liability' || category.type === 'Equity') {
                                          displayBalanceForBilanz = -periodChange; 
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


    