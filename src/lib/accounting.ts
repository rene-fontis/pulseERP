src/lib/accounting.ts
import type { TenantChartOfAccounts, JournalEntry, Account } from '@/types';

export interface AccountBalances {
  [accountId: string]: number;
}

export interface FinancialSummary {
  totalAssets: number;
  totalLiabilities: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfitLoss: number;
  equity: number; // Assets - Liabilities
  accountBalances: AccountBalances; // Balances for each individual account
}

export function calculateFinancialSummary(
  chartOfAccounts: TenantChartOfAccounts | undefined,
  journalEntries: JournalEntry[] | undefined
): FinancialSummary {
  const initialSummary: FinancialSummary = {
    totalAssets: 0,
    totalLiabilities: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netProfitLoss: 0,
    equity: 0,
    accountBalances: {},
  };

  if (!chartOfAccounts || !journalEntries) {
    return initialSummary;
  }

  const accountBalances: AccountBalances = {};

  // Initialize balances for all accounts in the CoA from their stored/initial balance
  chartOfAccounts.groups.forEach(group => {
    group.accounts.forEach(account => {
      // Use the balance from CoA as starting point if it exists, otherwise 0
      // This 'balance' on the account object is the one stored in Firestore for the CoA structure.
      // We will adjust it with journal entries.
      accountBalances[account.id] = account.balance || 0;
    });
  });
  
  // Adjust balances based on journal entries
  // This logic assumes that the account.balance in CoA is an *opening* balance or a static value.
  // If account.balance in CoA is meant to be *the* real-time balance, then this calculation
  // should start from 0 for each account and sum up all transactions.
  // Given current setup, let's assume we calculate from scratch for the overview.
  
  // Re-initialize to 0 to calculate current balance from all transactions
  chartOfAccounts.groups.forEach(group => {
    group.accounts.forEach(account => {
      accountBalances[account.id] = 0; 
    });
  });


  journalEntries.forEach(entry => {
    entry.lines.forEach(line => {
      const account = chartOfAccounts.groups
        .flatMap(g => g.accounts)
        .find(a => a.id === line.accountId);

      if (account) {
        const debitAmount = line.debit || 0;
        const creditAmount = line.credit || 0;

        switch (account.mainType) {
          case 'Asset':
          case 'Expense':
            accountBalances[account.id] = (accountBalances[account.id] || 0) + debitAmount - creditAmount;
            break;
          case 'Liability':
          case 'Revenue':
            accountBalances[account.id] = (accountBalances[account.id] || 0) + creditAmount - debitAmount;
            break;
          default:
            break;
        }
      }
    });
  });

  // Calculate totals
  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalRevenue = 0;
  let totalExpenses = 0;

  chartOfAccounts.groups.forEach(group => {
    group.accounts.forEach(account => {
      const balance = accountBalances[account.id] || 0;
      switch (account.mainType) {
        case 'Asset':
          totalAssets += balance;
          break;
        case 'Liability':
          totalLiabilities += balance;
          break;
        case 'Revenue':
          // Revenue typically has credit balance. If we sum them directly, a positive value means revenue.
          totalRevenue += balance; 
          break;
        case 'Expense':
          // Expenses typically have debit balance. If we sum them directly, a positive value means expense.
          totalExpenses += balance;
          break;
      }
    });
  });

  const netProfitLoss = totalRevenue - totalExpenses;
  const equity = totalAssets - totalLiabilities; // Basic equity calculation

  return {
    totalAssets,
    totalLiabilities,
    totalRevenue,
    totalExpenses,
    netProfitLoss,
    equity,
    accountBalances,
  };
}
