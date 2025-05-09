"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Card, CardHeader, CardTitle not used here anymore directly.
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FileText } from 'lucide-react'; // Removed unused icons: TrendingUp, TrendingDown, Scale, Landmark, DollarSign, List
import type { FinancialSummary } from '@/lib/accounting';
import type { TenantChartOfAccounts, Account, AccountGroup } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

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

        {/* Skeleton for Erfolgsrechnung Accordion */}
        <div>
            <div className="flex items-center mb-4">
                <Skeleton className="h-6 w-6 mr-2" />
                <Skeleton className="h-6 w-1/4" />
            </div>
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
  
  return (
    <div className="space-y-8">
        {/* Bilanz Section - Accordion Only */}
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

        {/* Erfolgsrechnung Section - Accordion Only */}
        <div>
             <div className="flex items-center mb-4">
                <FileText className="h-6 w-6 mr-2 text-primary" />
                <h3 className="text-xl font-semibold">Erfolgsrechnung</h3>
            </div>
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