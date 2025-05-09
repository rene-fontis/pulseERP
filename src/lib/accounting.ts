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
      const account = chartOfAccounts.groups
        .flatMap(g => g.accounts)
        .find(a => a.id === line.accountId);

      if (account) { 
        const debitAmount = line.debit || 0;
        const creditAmount = line.credit || 0;
        // Update the running balance.
        // For accounts that naturally increase with a debit (Assets, Expenses): Balance = Opening + Debits - Credits
        // For accounts that naturally increase with a credit (Liabilities, Equity, Revenue): Balance = Opening - Debits + Credits
        // Our current `accountBalances[account.id]` holds the opening balance.
        // So, we add debits and subtract credits. The interpretation of this value depends on the account type.
        accountBalances[account.id] = (accountBalances[account.id] || 0) + debitAmount - creditAmount;
      }
    });
  });

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0; // Sum of equity accounts directly
  let totalRevenue = 0; 
  let totalExpenses = 0;

  chartOfAccounts.groups.forEach(group => {
    group.accounts.forEach(account => {
      const currentBalance = accountBalances[account.id] || 0;
      // currentBalance = OpeningBalance + DebitsForPeriod - CreditsForPeriod

      switch (account.mainType) {
        case 'Asset':
          // Assets have a natural debit balance. Positive currentBalance adds to totalAssets.
          totalAssets += currentBalance;
          break;
        case 'Liability':
          // Liabilities have a natural credit balance.
          // If currentBalance is negative (more credits than debits), it's a liability.
          // We sum the absolute value of credit balances.
          totalLiabilities -= currentBalance; 
          break;
        case 'Equity':
          // Equity has a natural credit balance.
          totalEquity -= currentBalance;
          break;
        case 'Revenue':
          // Revenue has a natural credit balance.
          totalRevenue -= currentBalance;
          break;
        case 'Expense':
          // Expenses have a natural debit balance.
          totalExpenses += currentBalance;
          break;
      }
    });
  });

  const netProfitLoss = totalRevenue - totalExpenses;
  
  // Final Equity: Opening Equity (from equity accounts) + Net Profit/Loss for the period
  // Note: If a "Current Year Earnings" system account is part of Equity, its balance
  // should automatically reflect netProfitLoss after all calculations if journal entries are posted correctly.
  // For display, often Equity = Initial Equity Accounts + Current P&L
  // Or simply Assets - Liabilities (which should include P&L impact implicitly)
  const calculatedEquityFromAssetsLiabilities = totalAssets - totalLiabilities;


  return {
    totalAssets,
    totalLiabilities,
    totalRevenue,
    totalExpenses,
    netProfitLoss,
    equity: calculatedEquityFromAssetsLiabilities, // Displaying A-L
    accountBalances, 
  };
}
