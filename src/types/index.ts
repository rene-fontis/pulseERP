// src/types/index.ts

export interface Tenant {
  id: string;
  name: string;
  createdAt: string; // Store as ISO string for simplicity, converted from Firestore Timestamp
  chartOfAccountsTemplateId?: string; // ID of the template used during creation
  chartOfAccountsId?: string; // ID of the tenant's specific Chart of Accounts document
  activeFiscalYearId?: string; // ID of the currently active fiscal year for this tenant
  vatNumber?: string | null; // VAT / MWST Nummer - allow null
  taxRates?: TaxRate[]; // Defined tax rates for the tenant
  productCustomFieldDefinitions?: CustomProductFieldDefinition[]; // For inventory custom fields
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

export interface User {
  id: string; // Firebase Auth UID
  email: string;
  displayName?: string | null; // Firebase Auth can have null displayName
  photoURL?: string | null; // Firebase Auth can have photoURL
  createdAt: string; // ISO string from Firestore serverTimestamp or client-side new Date()
  tenantIds?: string[]; // Array of tenant IDs this user has access to
  // Add other roles/permissions as needed
}

// For creating new user documents in Firestore (excluding id, which is UID)
export type NewUserPayload = Omit<User, 'id' | 'createdAt'> & {
  createdAt?: any; // For Firestore serverTimestamp or client Date
};

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
  TENANT_SETTINGS_INVENTORY = "TENANT_SETTINGS_INVENTORY", // New for custom product fields
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

export type JournalEntryFormValues = Omit<NewJournalEntryPayload, 'tenantId' | 'fiscalYearId' | 'date' | 'lines'> & {
  date: Date; // Form uses Date object
  entryType: 'single' | 'batch';
  // Fields for single entry
  debitAccountId?: string;
  creditAccountId?: string;
  amount?: number;
  // Fields for batch entry
  lines: Array<{
    id?: string; // Optional for new lines in form
    accountId: string;
    debit?: number;
    credit?: number;
  }>;
};


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
export type BudgetEntryType = "Income" | "Expense" | "Transfer";

export const BudgetEntryTypeLabels: Record<BudgetEntryType, string> = {
  Income: "Einnahme",
  Expense: "Ausgabe",
  Transfer: "Kontoübertrag"
};

export type BudgetRecurrence = 
  | "None" 
  | "Weekly"
  | "Monthly" 
  | "Bimonthly" 
  | "Quarterly" 
  | "EveryFourMonths"
  | "Semiannually" 
  | "Yearly"; 

export const budgetRecurrenceLabels: Record<BudgetRecurrence, string> = {
  None: "Einmalig / Keine",
  Weekly: "Wöchentlich",
  Monthly: "Monatlich",
  Bimonthly: "Alle zwei Monate",
  Quarterly: "Quartalsweise (alle 3 Monate)",
  EveryFourMonths: "Alle vier Monate",
  Semiannually: "Halbjährlich",
  Yearly: "Jährlich",
};


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
  counterAccountId?: string | null; // Allow null for non-transfer entries
  counterAccountNumber?: string; 
  counterAccountName?: string;   
  description: string;
  amountActual: number; 
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

export type BudgetEntryFormValues = {
  description: string;
  accountId: string; 
  counterAccountId?: string; 
  amountActual: number; 
  amountBestCase?: number | null;
  amountWorstCase?: number | null;
  type: BudgetEntryType;
  startDate?: Date; 
  endDate?: Date;   
  isRecurring: boolean;
  recurrence: BudgetRecurrence; 
};

export type NewBudgetEntryPayload = Omit<BudgetEntry, 'id' | 'createdAt' | 'updatedAt'>;

export interface BudgetReportAccountEntry {
  accountId: string;
  accountNumber: string;
  accountName: string;
  mainType: AccountGroup['mainType']; 
  actualAmount: number; 
  bestCaseAmount: number; 
  worstCaseAmount: number; 
}

export interface BudgetReportChartDataItem {
  periodLabel: string;
  sortKey: string; 
  periodActualBudgetProfitLoss: number;
  periodBestCaseBudgetProfitLoss: number;
  periodWorstCaseBudgetProfitLoss: number;
}

export interface BudgetReportData {
  tableData: BudgetReportAccountEntry[];
  chartData: BudgetReportChartDataItem[];
}

export interface CombinedBudgetReportChartItem {
  periodLabel: string;
  actualJournalRevenue?: number; 
  actualJournalExpense?: number; 
  cumulativeActualJournalProfitLoss: number; 
  cumulativeActualBudgetProfitLoss: number; 
  cumulativeBestCaseBudgetProfitLoss: number;
  cumulativeWorstCaseBudgetProfitLoss: number;
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
  firstName?: string;
  companyName?: string;
  address: Address; 
  phone?: string;
  email?: string;
  segmentIds?: string[];
  hourlyRate?: number | null; 
  isClient: boolean; 
  isSupplier: boolean; 
  isPartner: boolean; 
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type NewContactPayload = Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>;

export interface Segment {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
export type NewSegmentPayload = Omit<Segment, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>;


// --- Project Management Types ---
export type ProjectStatus = 'Active' | 'Archived' | 'Completed' | 'OnHold' | 'Cancelled';
export const projectStatusLabels: Record<ProjectStatus, string> = {
  Active: "Aktiv",
  Archived: "Archiviert",
  Completed: "Abgeschlossen",
  OnHold: "Angehalten",
  Cancelled: "Abgebrochen"
};

export interface Milestone {
  id: string;
  name: string;
  description?: string;
  dueDate?: string | null; // ISO Date string
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 'Open' | 'InProgress' | 'InReview' | 'Completed' | 'Blocked';

export const taskStatusLabels: Record<TaskStatus, string> = {
  Open: "Offen",
  InProgress: "In Bearbeitung",
  InReview: "In Prüfung",
  Completed: "Abgeschlossen",
  Blocked: "Blockiert"
};

export interface ProjectTask {
  id: string;
  name: string;
  description?: string;
  assigneeId?: string; // User ID
  milestoneId?: string | null; // Link to a milestone
  status: TaskStatus; 
  dueDate?: string | null; // ISO Date string
  estimatedHours?: number | null;
  createdAt: string;
  updatedAt: string;
}


export interface Project {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  contactId?: string | null; 
  contactName?: string | null; 
  startDate?: string | null; 
  endDate?: string | null; 
  status: ProjectStatus;
  milestones: Milestone[];
  tasks: ProjectTask[];
  createdAt: string;
  updatedAt: string;
}

export type NewProjectPayload = Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'milestones' | 'tasks' | 'contactName'> & {
  milestones?: Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'>[]; 
  tasks?: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt'>[];
};

export type ProjectFormValues = Omit<Project, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'milestones' | 'tasks' | 'contactName'> & {
  startDate?: Date | null;
  endDate?: Date | null;
};

export type NewMilestonePayload = Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'>;
export type MilestoneFormValues = Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'> & {
  dueDate?: Date | null;
};

export type NewTaskPayload = Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt'>;
export type TaskFormValues = Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt'> & {
  dueDate?: Date | null;
  estimatedHours?: number | null;
};


// --- Time Tracking Types ---
export interface TimeEntry {
  id: string;
  tenantId: string;
  userId: string; // User who logged the time
  contactId?: string | null; // Optional: Link to a contact
  projectId?: string | null; // Optional: Link to a project
  taskId?: string | null; // Optional: Link to a specific task within a project
  date: string; // ISO string for the date of the time entry
  hours: number; // Duration in hours (e.g., 1.5 for 1h 30m)
  description?: string; // Description of the work done
  rate?: number | null; // Hourly rate for this specific entry (can override default)
  isBillable: boolean; // Whether this time entry is billable
  invoicedId?: string | null; // If this entry has been invoiced, link to the invoice
  createdAt: string;
  updatedAt: string;
}

export type NewTimeEntryPayload = Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt' | 'userId'>; // userId will be set by the backend/service based on logged-in user

export type TimeEntryFormValues = Omit<NewTimeEntryPayload, 'tenantId' | 'date'> & {
  date: Date; // Use Date object for form, convert to ISO string on submit
  // Potentially add separate fields for timer if not handled by direct hours input
};


// --- Inventory / Product Management Types ---
export type CustomProductFieldType = 'text' | 'number' | 'boolean' | 'date' | 'textarea'; // Add 'textarea'

export interface CustomProductFieldDefinition {
  id: string; // Unique ID for the field definition
  name: string; // Internal name/key, e.g., "material_type"
  label: string; // User-friendly label, e.g., "Materialart"
  type: CustomProductFieldType;
  options?: string[]; // For 'select' type if added in future
  isRequired?: boolean;
  inputMask?: string; // Optional input mask for 'text' or 'number' types
  order?: number; // For controlling display order
}

export interface ProductCategory {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  parentId?: string | null; // For sub-categories
  createdAt: string;
  updatedAt: string;
}
export type NewProductCategoryPayload = Omit<ProductCategory, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>;
export type ProductCategoryFormValues = Omit<NewProductCategoryPayload, 'parentId'> & { parentId?: string | null };


export interface Warehouse {
  id: string;
  tenantId: string;
  name: string;
  location?: string; // e.g., "Hauptlager Zürich", "Lager A-12"
  isDefault?: boolean; // Is this the default warehouse for new products?
  createdAt: string;
  updatedAt: string;
}
export type NewWarehousePayload = Omit<Warehouse, 'id' | 'createdAt' | 'updatedAt'>;


export type StockMovementType = 'Purchase' | 'Sale' | 'AdjustmentIn' | 'AdjustmentOut' | 'TransferIn' | 'TransferOut';

export interface StockMovement {
  id: string;
  tenantId: string;
  productId: string;
  warehouseId: string; 
  type: StockMovementType;
  quantityChange: number; // Positive for increase, negative for decrease
  date: string; // ISO string
  notes?: string;
  relatedDocumentId?: string; // e.g., Invoice ID for sales, Purchase Order ID for purchases
  userId: string; // User who made the stock change
  createdAt: string;
}
export type NewStockMovementPayload = Omit<StockMovement, 'id' | 'createdAt' | 'userId'>;


export interface Product {
  id: string;
  tenantId: string;
  itemNumber: string; // Artikelnummer
  name: string;
  description?: string;
  unitPrice: number; // Verkaufspreis
  purchasePrice?: number | null; // Einkaufspreis (optional)
  taxRateId?: string | null; 
  unit?: string; // Einheit (Stk, kg, m, etc.)
  minimumQuantity?: number | null; // Mindestbestellmenge oder Meldebestand
  stockOnHand?: number; // Gesamter Lagerbestand über alle Lager (kann berechnet werden)
  defaultWarehouseId?: string | null; // Standardlager für dieses Produkt
  categoryIds?: string[]; // IDs of ProductCategory
  customFields?: Record<string, any>; // Stores values for custom fields defined by tenant { [fieldDefinitionId]: value }
  createdAt: string;
  updatedAt: string;
}

export type NewProductPayload = Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'> & {
  customFields?: Record<string, any>; // Ensure customFields is part of the payload
};
export type ProductFormValues = Omit<NewProductPayload, 'tenantId'>;


// --- Invoicing Types ---
export interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number; 
  total: number; 
  productId?: string; 
  timeEntryId?: string; 
}

export interface Invoice {
  id: string;
  tenantId: string;
  invoiceNumber: string; 
  contactId: string; 
  projectId?: string; 
  date: string; 
  dueDate: string; 
  lines: InvoiceLine[];
  subTotal: number; 
  taxAmount: number; 
  totalAmount: number; 
  notes?: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  paymentDetails?: string;
  createdAt: string;
  updatedAt: string;
}
