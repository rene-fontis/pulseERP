// src/types/index.ts

export interface Tenant {
  id: string;
  name: string;
  createdAt: string; // Store as ISO string for simplicity, converted from Firestore Timestamp
  chartOfAccountsTemplateId?: string; // ID of the template used during creation
  chartOfAccountsId?: string; // ID of the tenant's specific Chart of Accounts document
  activeFiscalYearId?: string; // ID of the currently active fiscal year for this tenant
  vatNumber?: string; // VAT / MWST Nummer
  taxRates?: TaxRate[]; // Defined tax rates for the tenant
}

export interface TaxRate {
  id: string;
  name: string; // e.g., "Normalsatz", "Reduzierter Satz"
  rate: number; // e.g., 7.7, 2.5
  isDefault?: boolean;
}

// --- Chart of Accounts Template Types ---
export interface AccountTemplate {
  id?: string; // Unique within the template, e.g., generated or based on number
  number: string; // Account number, e.g., "1000"
  name: string; // Account name, e.g., "Kasse"
  description?: string;
  isSystemAccount: boolean; // For special accounts like profit/loss, non-deletable/modifiable by user
  isRetainedEarningsAccount?: boolean; // Specifically for "Gewinnvortrag / Verlustvortrag"
}

export interface AccountGroupTemplate {
  id: string; // Unique within the template
  name: string; // e.g., "Umlaufvermögen", "Bank"
  mainType: 'Asset' | 'Liability' | 'Expense' | 'Revenue' | 'Equity'; // Main COA categories
  accounts: AccountTemplate[];
  isFixed?: boolean; // True for the 5 main unmodifiable groups (Asset, Liability, etc.)
  parentId?: string | null; // ID of the parent group, null for top-level (fixed) groups
  level?: number; // Hierarchy level, 0 for fixed groups, 1 for their subgroups, etc.
}

export interface ChartOfAccountsTemplate {
  id: string;
  name: string; // e.g., "KMU Schweiz", "Verein", "Privat"
  description?: string;
  groups: AccountGroupTemplate[]; // Now a flat list, hierarchy managed by parentId and level
  createdAt: string;
  updatedAt: string;
}
// For form handling, excluding DB-generated fields
export type ChartOfAccountsTemplateFormValues = Omit<ChartOfAccountsTemplate, 'id' | 'createdAt' | 'updatedAt'>;


// --- Tenant-Specific Chart of Accounts Types ---
// These will mirror template structures but are modifiable by the tenant
export interface Account {
  id: string;
  number: string;
  name: string;
  description?: string;
  balance: number; // Opening balance for the fiscal period, changed from optional
  isSystemAccount: boolean; 
  isRetainedEarningsAccount?: boolean;
}

export interface AccountGroup {
  id: string;
  name: string;
  mainType: 'Asset' | 'Liability' | 'Expense' | 'Revenue' | 'Equity';
  accounts: Account[];
  isFixed?: boolean;
  parentId?: string | null;
  level?: number;
  balance?: number; // Optional: aggregate balance for the group, calculated on the fly or stored
}

export interface TenantChartOfAccounts {
  id: string;
  tenantId: string;
  name: string; // Can be derived from template name initially
  groups: AccountGroup[]; // Flat list
  createdAt: string;
  updatedAt: string;
}

// For form handling, excluding DB-generated fields and tenantId
export type TenantChartOfAccountsFormValues = Omit<TenantChartOfAccounts, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>;


// --- User Management Types ---
export enum Module {
  ACCOUNTING_JOURNAL = "ACCOUNTING_JOURNAL",
  ACCOUNTING_REPORTS = "ACCOUNTING_REPORTS",
  BUDGETING = "BUDGETING",
  CONTACTS = "CONTACTS",
  PROJECTS = "PROJECTS",
  TIME_TRACKING = "TIME_TRACKING",
  INVENTORY = "INVENTORY",
  INVOICING = "INVOICING",
  TENANT_SETTINGS_BASIC = "TENANT_SETTINGS_BASIC",
  TENANT_SETTINGS_USERS = "TENANT_SETTINGS_USERS",
  TENANT_SETTINGS_COA = "TENANT_SETTINGS_COA",
  TENANT_SETTINGS_FISCAL_YEARS = "TENANT_SETTINGS_FISCAL_YEARS",
  // Add other modules as needed
}

export enum PermissionLevel {
  READ = "READ",
  WRITE = "WRITE",
  ADMIN = "ADMIN", // Full control over the module for this tenant
  NONE = "NONE",
}

export interface TenantUserPermission {
  module: Module;
  level: PermissionLevel;
}

export interface TenantUser {
  id: string; // Could be Firebase Auth UID
  tenantId: string;
  email: string; // Or username
  displayName?: string;
  roles: string[]; // e.g., ['admin', 'accountant'] // Simplified roles for now
  // permissions: TenantUserPermission[]; // Specific permissions - more granular, for future
  createdAt: string;
}

// --- Accounting / Journal Types ---
export interface JournalEntryLine {
  id: string; // Unique within the entry, typically client-generated for array manipulation
  accountId: string; // Reference to an Account.id in TenantChartOfAccounts
  accountNumber: string; // For display & autocomplete convenience
  accountName: string; // For display
  debit?: number; // Soll
  credit?: number; // Haben
}

export interface JournalEntry {
  id:string; // Firestore document ID
  tenantId: string;
  fiscalYearId?: string; // Reference to the fiscal year this entry belongs to
  entryNumber: string; // Sequential or generated
  date: string; // ISO string
  description: string;
  lines: JournalEntryLine[];
  attachments?: { name: string; url: string }[]; // Array of attachments (name and storage URL)
  createdAt: string; // ISO string from Firestore serverTimestamp
  updatedAt: string; // ISO string from Firestore serverTimestamp
  posted: boolean; // Whether the entry is posted to ledger
}

// Type for submitting new journal entries to the service/mutation
export type NewJournalEntryPayload = Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>;

// --- Fiscal Year Types ---
export interface FiscalYear {
  id: string;
  name: string; // e.g., "2024", "Geschäftsjahr 23/24"
  startDate: string; // ISO string
  endDate: string; // ISO string
  isClosed?: boolean; // To mark a fiscal year as closed, preventing new entries
  carryForwardSourceFiscalYearId?: string | null; // For UI to track which FY was used to carry forward balances into this one
  createdAt: string;
  updatedAt: string;
}

export type FiscalYearFormValues = Omit<FiscalYear, 'id' | 'isClosed' | 'carryForwardSourceFiscalYearId' | 'createdAt' | 'updatedAt'>;

// --- Financial Summary Types ---
export interface AccountBalances {
  [accountId: string]: number;
}

export type AggregationPeriod = 'monthly' | 'weekly' | 'daily';

export interface PeriodicalBreakdownItem {
  periodLabel: string; // e.g., "Jan '24", "KW23 '24", "01.06.24"
  year: number;
  revenue: number;
  expenses: number;
}

export interface FinancialSummary {
  totalAssetsPeriodChange: number;
  totalLiabilitiesPeriodChange: number;
  equityPeriodChange: number;
  closingTotalAssets: number;
  closingTotalLiabilities: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfitLoss: number;
  closingEquity: number;
  accountBalances: AccountBalances; // Closing balances for all accounts
  periodicalBreakdown: PeriodicalBreakdownItem[];
}

export interface CarryForwardBalancesPayload {
  tenantId: string;
  sourceFiscalYearId: string;
  targetFiscalYearId: string; 
}

// --- Budgeting Types ---
export type BudgetEntryType = "Income" | "Expense";
export type BudgetRecurrence = 
  | "None" 
  | "Monthly" 
  | "Bimonthly" // Alle zwei Monate
  | "Quarterly" // Drei Monate / Quartalsweise
  | "EveryFourMonths" // Alle vier Monate
  | "Semiannually" // Halbjährlich
  | "Yearly"; // Jährlich

export interface Budget {
  id: string;
  tenantId: string;
  name: string;
  description: string; 
  createdAt: string;
  updatedAt: string;
}
export type BudgetFormValues = Omit<Budget, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>;


export interface BudgetEntry {
  id: string;
  budgetId: string;
  accountId: string; 
  accountNumber?: string; 
  accountName?: string;   
  counterAccountId?: string; 
  counterAccountNumber?: string; 
  counterAccountName?: string;   
  description: string;
  amountActual: number; // Standard amount
  amountBestCase?: number | null; 
  amountWorstCase?: number | null; 
  type: BudgetEntryType; 
  startDate?: string; 
  endDate?: string; 
  isRecurring: boolean;
  recurrence: BudgetRecurrence;
  createdAt: string;
  updatedAt: string;
}

// For form handling of BudgetEntry
export type BudgetEntryFormValues = {
  description: string;
  accountId: string; 
  counterAccountId?: string; 
  amountActual: number; // Standard
  amountBestCase?: number | null;
  amountWorstCase?: number | null;
  type: BudgetEntryType;
  startDate?: Date; 
  endDate?: Date;   
  isRecurring: boolean;
  recurrence: BudgetRecurrence; 
};

export type NewBudgetEntryPayload = Omit<BudgetEntry, 'id' | 'createdAt' | 'updatedAt'>;

// --- Budget Reporting Types ---
export interface BudgetReportAccountEntry {
  accountId: string;
  accountNumber: string;
  accountName: string;
  mainType: AccountGroup['mainType']; // From CoA
  actualAmount: number; // Derived from entry.amountActual
  bestCaseAmount: number; // Derived from entry.amountBestCase or entry.amountActual
  worstCaseAmount: number; // Derived from entry.amountWorstCase or entry.amountActual
}

export interface BudgetReportChartDataItem {
  periodLabel: string;
  periodActualBudgetProfitLoss: number;
  periodBestCaseBudgetProfitLoss: number;
  periodWorstCaseBudgetProfitLoss: number;
}

export interface BudgetReportData {
  tableData: BudgetReportAccountEntry[];
  chartData: BudgetReportChartDataItem[];
}

// Combined data structure for the budget report chart in the page component
export interface CombinedBudgetReportChartItem {
  periodLabel: string;
  actualJournalRevenue?: number; // For bars - Periodical Actual Revenue from Journal
  actualJournalExpense?: number; // For bars (positive value) - Periodical Actual Expense from Journal
  
  // Lines for CUMULATIVE P/L
  cumulativeActualJournalProfitLoss: number; // From Journal
  cumulativeActualBudgetProfitLoss: number;  // From Budget Entry amountActual
  cumulativeBestCaseBudgetProfitLoss: number;// From Budget Entry amountBestCase (or amountActual)
  cumulativeWorstCaseBudgetProfitLoss: number;// From Budget Entry amountWorstCase (or amountActual)
}

// --- Contact Management Types ---
export interface Address {
  street?: string;
  zip?: string;
  city?: string;
  country?: string;
}

export interface Contact {
  id: string;
  tenantId: string;
  name: string;
  address?: Address;
  phone?: string;
  email?: string;
  segments?: string[]; // For grouping contacts
  hourlyRate?: number; // Default hourly rate for this contact if they are a client
  isClient?: boolean;
  isSupplier?: boolean;
  isPartner?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Project Management Types ---
export interface Milestone {
  id: string;
  name: string;
  dueDate?: string; // ISO Date string
  completed: boolean;
}

export interface TaskStatusDefinition {
  id: string;
  name: string; // e.g., "Offen", "In Arbeit", "Erledigt"
  order: number;
}

export interface ProjectTask {
  id: string;
  name: string;
  description?: string;
  assigneeId?: string; // TenantUser ID
  statusId: string; // TaskStatusDefinition ID
  dueDate?: string; // ISO Date string
  estimatedHours?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  contactId?: string; // Contact ID (client)
  startDate?: string; // ISO Date string
  endDate?: string; // ISO Date string
  milestones?: Milestone[];
  tasks?: ProjectTask[];
  statusDefinitions?: TaskStatusDefinition[]; // Tenant-specific or project-specific task statuses
  createdAt: string;
  updatedAt: string;
}

// --- Time Tracking Types ---
export interface TimeEntry {
  id: string;
  tenantId: string;
  userId: string; // TenantUser ID who tracked the time
  contactId?: string; // Optional: if time is directly for a contact
  projectId?: string; // Optional: if time is for a project
  taskId?: string; // Optional: if time is for a specific task
  date: string; // ISO Date string
  hours: number;
  description?: string;
  rate?: number; // Hourly rate for this specific entry (can override project/contact default)
  isBillable: boolean;
  invoicedId?: string; // If this time entry has been invoiced
  createdAt: string;
  updatedAt: string;
}

// --- Inventory / Product Management Types ---
export interface Product {
  id: string;
  tenantId: string;
  itemNumber: string;
  name: string;
  description?: string;
  unitPrice: number;
  taxRateId?: string; // Reference to a TaxRate ID defined in Tenant settings
  unit?: string; // e.g., "Stk.", "Std.", "kg"
  stock?: number; // Optional: for basic stock tracking
  createdAt: string;
  updatedAt: string;
}

// --- Invoicing Types ---
export interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number; // e.g., 7.7 (percent)
  total: number; // quantity * unitPrice * (1 + taxRate/100)
  productId?: string; // Optional: if the line item comes from a product
  timeEntryId?: string; // Optional: if the line item comes from a time entry
}

export interface Invoice {
  id: string;
  tenantId: string;
  invoiceNumber: string; // Generated or manually entered
  contactId: string; // Client
  projectId?: string; // Optional: if related to a specific project
  date: string; // ISO Date string
  dueDate: string; // ISO Date string
  lines: InvoiceLine[];
  subTotal: number; // Sum of line totals before tax
  taxAmount: number; // Total tax amount
  totalAmount: number; // subTotal + taxAmount
  notes?: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  paymentDetails?: string;
  createdAt: string;
  updatedAt: string;
}
```
</change>
  <change>
    <file>src/app/tenants/[tenantId]/settings/basic/page.tsx</file>
    <description>Extend basic tenant settings to include VAT number and a placeholder for tax rate management.</description>
    <content><![CDATA[
"use client";

import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, AlertCircle, Percent } from 'lucide-react';
import { useGetTenantById, useUpdateTenant } from '@/hooks/useTenants';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import type { Tenant } from '@/types';
import React from 'react';

const basicSettingsSchema = z.object({
  name: z.string().min(2, "Mandantenname muss mindestens 2 Zeichen lang sein."),
  vatNumber: z.string().optional(),
  timezone: z.string().optional(), 
  notificationsEnabled: z.boolean().optional(),
});

type BasicSettingsFormValues = z.infer<typeof basicSettingsSchema>;

export default function TenantBasicSettingsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { data: tenant, isLoading, error, refetch } = useGetTenantById(tenantId);
  const updateTenantMutation = useUpdateTenant();
  const { toast } = useToast();

  const form = useForm<BasicSettingsFormValues>({
    resolver: zodResolver(basicSettingsSchema),
    defaultValues: {
      name: '',
      vatNumber: '',
      timezone: '',
      notificationsEnabled: false,
    }
  });

  React.useEffect(() => {
    if (tenant) {
      form.reset({
        name: tenant.name,
        vatNumber: tenant.vatNumber || '',
        timezone: (tenant as any).timezone || '(GMT+01:00) Mitteleuropäische Zeit', 
        notificationsEnabled: (tenant as any).notificationsEnabled === undefined ? true : (tenant as any).notificationsEnabled,
      });
    }
  }, [tenant, form]);

  const onSubmit = async (values: BasicSettingsFormValues) => {
    if (!tenant) return;
    try {
      await updateTenantMutation.mutateAsync({ 
        id: tenant.id, 
        data: { 
          name: values.name,
          // Assuming 'vatNumber' can be updated. If it's on a different sub-object, adjust mutation.
          // For now, direct update:
          vatNumber: values.vatNumber || null, // Send null if empty to clear it
        } as any // Cast to any to allow vatNumber if not strictly on Tenant type yet for update hook
      });
      // TODO: Add mutation for other settings like timezone, notifications when they are added to Tenant type and service
      toast({ title: "Erfolg", description: "Basiseinstellungen erfolgreich aktualisiert." });
      refetch(); 
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast({ title: "Fehler", description: `Einstellungen konnten nicht gespeichert werden: ${errorMessage}`, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
       <div className="space-y-6 p-4 md:p-8">
        <Skeleton className="h-10 w-1/3 mb-2" />
        <Skeleton className="h-6 w-2/3 mb-6" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/4" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/5" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/5" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-6 w-10" />
              <Skeleton className="h-4 w-2/5" />
            </div>
            <Skeleton className="h-10 w-1/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-4 md:p-8">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Fehler beim Laden der Einstellungen</h2>
        <p>{error.message}</p>
      </div>
    );
  }
  
  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 md:p-8">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Mandant nicht gefunden</h2>
        <p>Der angeforderte Mandant konnte nicht gefunden werden.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 px-4 md:px-0">
        <div className="flex items-center mb-2">
            <Settings className="h-8 w-8 mr-3 text-primary" />
            <h1 className="text-2xl font-bold">Basiseinstellungen: {tenant.name}</h1>
        </div>
        <p className="text-muted-foreground">
          Allgemeine Einstellungen und Präferenzen für den Mandanten {tenant.name}.
        </p>
      </div>
      
      <Card className="shadow-lg mx-4 md:mx-0">
        <CardHeader>
          <CardTitle className="text-xl">Mandanten Details</CardTitle>
           <CardDescription>
            Passen Sie hier die grundlegenden Informationen Ihres Mandanten an.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mandantenname</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vatNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MWST-Nummer (UID)</FormLabel>
                    <FormControl>
                      <Input placeholder="CHE-XXX.XXX.XXX MWST" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zeitzone (Platzhalter)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="z.B. Europe/Berlin" disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="notificationsEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background">
                    <div className="space-y-0.5">
                      <FormLabel>E-Mail-Benachrichtigungen (Platzhalter)</FormLabel>
                       <CardDescription className="text-xs">
                        Benachrichtigungen für diesen Mandanten aktivieren oder deaktivieren.
                      </CardDescription>
                    </div>
                    <FormControl>
                       <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled // if the setting is not yet saveable
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="border-t pt-6">
                <Button type="submit" disabled={updateTenantMutation.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  {updateTenantMutation.isPending ? "Speichern..." : "Änderungen speichern"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="shadow-lg mx-4 md:mx-0 mt-8">
        <CardHeader>
          <CardTitle className="text-xl">Steuersätze</CardTitle>
           <CardDescription>
            Verwalten Sie die Mehrwertsteuersätze für diesen Mandanten.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="text-center py-6 text-muted-foreground">
                <Percent className="mx-auto h-10 w-10 mb-3 text-primary" />
                <p className="font-semibold">Funktion in Entwicklung</p>
                <p>Hier können Sie bald die für die Schweiz gültigen Steuersätze (z.B. 8.1% Normalsatz, 2.6% Reduzierter Satz) verwalten und als Standard für Rechnungen festlegen.</p>
            </div>
             <Button disabled className="mt-4">Steuersätze verwalten (Demnächst)</Button>
        </CardContent>
      </Card>

    </div>
  );
}
