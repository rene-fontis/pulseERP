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
  // isSystemAccount?: boolean; // For special accounts like profit/loss
}

export interface AccountGroupTemplate {
  id?: string; // Unique within the template
  name: string; // e.g., "Umlaufvermögen", "Bank"
  mainType: 'Asset' | 'Liability' | 'Expense' | 'Revenue'; // Main COA categories
  accounts: AccountTemplate[];
}

export interface ChartOfAccountsTemplate {
  id: string;
  name: string; // e.g., "KMU Schweiz", "Verein", "Privat"
  description?: string;
  groups: AccountGroupTemplate[];
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
  balance?: number; // Current balance, might be calculated or stored
  // isSystemAccount?: boolean; // For special accounts like profit/loss
}

export interface AccountGroup {
  id: string;
  name: string;
  mainType: 'Asset' | 'Liability' | 'Expense' | 'Revenue';
  accounts: Account[];
}

export interface TenantChartOfAccounts {
  id: string;
  tenantId: string;
  name: string; // Can be derived from template name initially
  groups: AccountGroup[];
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
  description?: string;
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
  // tenantId is implicit as this will be a subcollection
  createdAt: string;
  updatedAt: string;
}

export type FiscalYearFormValues = Omit<FiscalYear, 'id' | 'isClosed' | 'createdAt' | 'updatedAt'>;