import type { TenantChartOfAccounts, JournalEntry, Account, AccountGroup } from '@/types';

export interface AccountBalances {
  [accountId: string]: number;
}

export interface FinancialSummary {
  totalAssets: number;
  totalLiabilities: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfitLoss: number;
  equity: number; 
  accountBalances: AccountBalances; 
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

  // Initialize accountBalances with the opening balances from the Chart of Accounts.
  chartOfAccounts.groups.forEach(group => {
    group.accounts.forEach(account => {
      accountBalances[account.id] = account.balance || 0;
    });
  });

  // Adjust balances based on journal entries for the current period
  journalEntries.forEach(entry => {
    entry.lines.forEach(line => {
      // Find the account group to determine its mainType, as accounts themselves don't store mainType.
      let accountGroup: AccountGroup | undefined;
      for (const grp of chartOfAccounts.groups) {
        if (grp.accounts.some(acc => acc.id === line.accountId)) {
          accountGroup = grp;
          break;
        }
      }

      if (accountGroup) { 
        const debitAmount = line.debit || 0;
        const creditAmount = line.credit || 0;
        accountBalances[line.accountId] = (accountBalances[line.accountId] || 0) + debitAmount - creditAmount;
      }
    });
  });

  let totalAssets = 0;
  let totalLiabilities = 0;
  // totalEquityFromInitialBalances is not directly used for the final summary.equity, 
  // but can be useful for understanding the components.
  // let totalEquityFromInitialBalances = 0; 
  let totalRevenue = 0; 
  let totalExpenses = 0;

  chartOfAccounts.groups.forEach(group => {
    group.accounts.forEach(account => {
      const currentBalance = accountBalances[account.id] || 0;
      // currentBalance = OpeningBalance + DebitsForPeriod - CreditsForPeriod

      switch (group.mainType) { // Corrected: Use group.mainType
        case 'Asset':
          totalAssets += currentBalance;
          break;
        case 'Liability':
          totalLiabilities -= currentBalance; 
          break;
        case 'Equity':
          // This sums the *current balances* of equity accounts.
          // If an equity account is for "Retained Earnings" (Gewinnvortrag), its currentBalance will reflect that.
          // If another is for "Share Capital" (Grundkapital), its currentBalance is usually stable.
          // The profit/loss for the *current period* is handled separately by totalRevenue - totalExpenses.
          // The final 'equity' card in the UI uses Assets - Liabilities, so this direct sum of equity accounts
          // is more for internal consistency or potential detailed equity reporting.
          // totalEquityFromInitialBalances -= currentBalance; // Example: If initial capital is 1000 (credit), balance is -1000. totalEquity will be 1000.
          break;
        case 'Revenue':
          totalRevenue -= currentBalance;
          break;
        case 'Expense':
          totalExpenses += currentBalance;
          break;
      }
    });
  });

  const netProfitLoss = totalRevenue - totalExpenses;
  
  // Equity on the balance sheet is Assets - Liabilities.
  // This inherently includes the current period's profit/loss because assets and liabilities
  // are affected by revenue and expense transactions.
  const calculatedEquityFromAssetsLiabilities = totalAssets - totalLiabilities;


  return {
    totalAssets,
    totalLiabilities,
    totalRevenue,
    totalExpenses,
    netProfitLoss,
    equity: calculatedEquityFromAssetsLiabilities, 
    accountBalances, 
  };
}

