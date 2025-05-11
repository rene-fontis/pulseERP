"use client";

import React, { useMemo, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ListChecks, ChevronRight } from 'lucide-react';
import { useGetTenantById } from '@/hooks/useTenants';
import { useGetTenantChartOfAccountsById } from '@/hooks/useTenantChartOfAccounts';
import type { Account, AccountGroup, TenantChartOfAccounts } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AccountRowProps {
  account: Account;
  tenantId: string;
}

const AccountRow: React.FC<AccountRowProps> = ({ account, tenantId }) => {
  return (
    <TableRow>
      <TableCell className="font-medium">
        <Link href={`/tenants/${tenantId}/accounting/accounts/${account.id}`} className="hover:underline text-primary">
          {account.number}
        </Link>
      </TableCell>
      <TableCell>
        <Link href={`/tenants/${tenantId}/accounting/accounts/${account.id}`} className="hover:underline text-primary">
          {account.name}
        </Link>
      </TableCell>
      <TableCell>{account.description || '-'}</TableCell>
      <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
       <TableCell className="text-right">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/tenants/${tenantId}/accounting/accounts/${account.id}`} title={`Details zu Konto ${account.number}`}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
};

interface GroupSectionProps {
  group: AccountGroup;
  allGroups: AccountGroup[];
  tenantId: string;
  level?: number;
}

const GroupSection: React.FC<GroupSectionProps> = ({ group, allGroups, tenantId, level = 0 }) => {
  const subgroups = allGroups.filter(sub => sub.parentId === group.id && !sub.isFixed);
  const sortedAccounts = [...group.accounts].sort((a, b) => a.number.localeCompare(b.number));

  return (
    <AccordionItem value={group.id} key={group.id} className="border-b-0">
      <AccordionTrigger className="text-lg font-medium hover:bg-muted/50 px-2 py-3 rounded-md">
        {group.name}
      </AccordionTrigger>
      <AccordionContent className="pt-0 pl-4">
        {sortedAccounts.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Nummer</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Beschreibung</TableHead>
                <TableHead className="text-right">Anfangsbestand</TableHead>
                <TableHead className="text-right w-[50px]">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAccounts.map(account => (
                <AccountRow key={account.id} account={account} tenantId={tenantId} />
              ))}
            </TableBody>
          </Table>
        )}
        {sortedAccounts.length === 0 && subgroups.length === 0 && (
          <p className="text-sm text-muted-foreground p-2">Keine Konten oder Untergruppen in dieser Gruppe.</p>
        )}
        {subgroups.length > 0 && (
          <Accordion type="multiple" className="w-full space-y-2 mt-2">
            {subgroups.sort((a,b) => a.name.localeCompare(b.name)).map(subG => (
              <GroupSection key={subG.id} group={subG} allGroups={allGroups} tenantId={tenantId} level={level + 1} />
            ))}
          </Accordion>
        )}
      </AccordionContent>
    </AccordionItem>
  );
};


export default function AccountsListPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const router = useRouter();

  const [clientLoaded, setClientLoaded] = useState(false);
  useEffect(() => setClientLoaded(true), []);

  const { data: tenant, isLoading: isLoadingTenant, error: tenantError } = useGetTenantById(tenantId);
  const { data: chartOfAccounts, isLoading: isLoadingCoA, error: coaError } = useGetTenantChartOfAccountsById(tenant?.chartOfAccountsId);

  const sortedTopLevelGroups = useMemo(() => {
    if (!chartOfAccounts) return [];
    const order: AccountGroup['mainType'][] = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
    return chartOfAccounts.groups
      .filter(g => g.isFixed && g.level === 0)
      .sort((a, b) => order.indexOf(a.mainType) - order.indexOf(b.mainType));
  }, [chartOfAccounts]);

  const isLoading = (isLoadingTenant || (clientLoaded && tenant?.chartOfAccountsId && isLoadingCoA)) && !clientLoaded;
  const combinedError = tenantError || coaError;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        <Skeleton className="h-10 w-2/5 mb-2" />
        <Skeleton className="h-6 w-3/5 mb-6" />
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
            <CardContent><Skeleton className="h-20 w-full" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (combinedError) {
    return (
      <div className="container mx-auto py-8 text-center">
        <AlertCircle className="w-16 h-16 mb-4 mx-auto text-destructive" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Kontendaten</h2>
        <p>{(combinedError as Error).message}</p>
        <Button onClick={() => router.back()} variant="outline" className="mt-4">Zurück</Button>
      </div>
    );
  }

  if (!tenant && !isLoadingTenant && clientLoaded) {
    return (
      <div className="container mx-auto py-8 text-center">
        <AlertCircle className="w-16 h-16 mb-4 mx-auto text-muted-foreground" />
        <h2 className="text-2xl font-semibold mb-2">Mandant nicht gefunden</h2>
      </div>
    );
  }

  if (!chartOfAccounts && clientLoaded) {
    return (
      <div className="container mx-auto py-8 text-center">
        <AlertCircle className="w-16 h-16 mb-4 mx-auto text-destructive" />
        <h2 className="text-2xl font-semibold mb-2">Kein Kontenplan zugewiesen</h2>
        <p>Für diesen Mandanten wurde kein Kontenplan gefunden oder zugewiesen.</p>
        <Button asChild variant="link" className="mt-4">
          <Link href={`/tenants/${tenantId}/settings/chart-of-accounts`}>Zu den Kontenplan-Einstellungen</Link>
        </Button>
      </div>
    );
  }
  
  const defaultOpenAccordionItems = sortedTopLevelGroups.map(g => g.id);


  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center">
        <ListChecks className="h-8 w-8 mr-3 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Kontenübersicht</h1>
          <p className="text-muted-foreground">Mandant: {tenant?.name || '...'}</p>
        </div>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Kontenliste</CardTitle>
          <CardDescription>
            Alle Konten aus dem Kontenplan "{chartOfAccounts?.name}". Klicken Sie auf eine Kontonummer oder -name für Details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedTopLevelGroups.length > 0 && chartOfAccounts ? (
            <Accordion type="multiple" className="w-full space-y-4" defaultValue={defaultOpenAccordionItems}>
              {sortedTopLevelGroups.map(group => (
                <GroupSection key={group.id} group={group} allGroups={chartOfAccounts.groups} tenantId={tenantId} />
              ))}
            </Accordion>
          ) : (
            <p className="text-muted-foreground text-center py-8">Der Kontenplan enthält keine Hauptgruppen.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
