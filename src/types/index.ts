export interface Tenant {
  id: string;
  name: string;
  createdAt: string; // Store as ISO string for simplicity, converted from Firestore Timestamp
  chartOfAccountsTemplateId?: string; // ID of the template used during creation
  chartOfAccountsId?: string; // ID of the tenant's specific Chart of Accounts document
  activeFiscalYearId?: string; // ID of the currently active fiscal year for this tenant
  // Add other tenant-specific settings like timezone, notification preferences if needed
  // timezone?: string;
  // notificationsEnabled?: boolean;
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
  TENANT_SETTINGS_BASIC = "TENANT_SETTINGS_BASIC",
  TENANT_SETTINGS_USERS = "TENANT_SETTINGS_USERS",
  TENANT_SETTINGS_COA = "TENANT_SETTINGS_COA",
  TENANT_SETTINGS_FISCAL_YEARS = "TENANT_SETTINGS_FISCAL_YEARS",
  // Add other modules as needed
}

export enum PermissionLevel {
  READ = "READ",
  WRITE = "WRITE",
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
  // entryType?: 'single' | 'batch'; // Optional: To distinguish how the entry was created/is best represented
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

export interface MonthlyBreakdownItem {
  month: string; // e.g., "Jan", "Feb"
  year: number;  // e.g., 2024
  monthYear: string; // e.g., "Jan 2024" for display
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
  monthlyBreakdown: MonthlyBreakdownItem[];
}

export interface CarryForwardBalancesPayload {
  tenantId: string;
  sourceFiscalYearId: string;
  targetFiscalYearId: string; 
}

// --- Budgeting Types ---
export type BudgetScenario = "Actual" | "Best Case" | "Worst Case";
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
  scenario: BudgetScenario;
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
  amount: number;
  type: BudgetEntryType; 
  startDate?: string; 
  endDate?: string; 
  isRecurring: boolean;
  recurrence: BudgetRecurrence;
  createdAt: string;
  updatedAt: string;
}

export type BudgetEntryFormValues = {
  description: string;
  accountId: string; 
  counterAccountId?: string; 
  amount: number;
  type: BudgetEntryType;
  startDate?: Date; 
  endDate?: Date;   
  isRecurring: boolean;
  recurrence: BudgetRecurrence; 
};

export type NewBudgetEntryPayload = Omit<BudgetEntry, 'id' | 'createdAt' | 'updatedAt'>;
