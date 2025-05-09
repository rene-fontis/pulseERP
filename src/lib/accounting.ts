import type { TenantChartOfAccounts, JournalEntry, Account, AccountGroup, MonthlyBreakdownItem } from '@/types';
import { parseISO, format, getYear, getMonth } from 'date-fns';
import { de } from 'date-fns/locale';

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
  monthlyBreakdown: MonthlyBreakdownItem[];
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
    monthlyBreakdown: [],
  };

  if (!chartOfAccounts || !journalEntries) {
    return initialSummary;
  }

  const accountBalances: AccountBalances = {};
  const monthlyDataAggregator: Map<string, { revenue: number; expenses: number; year: number; monthIndex: number }> = new Map();

  // Initialize accountBalances with the opening balances from the Chart of Accounts.
  chartOfAccounts.groups.forEach(group => {
    group.accounts.forEach(account => {
      accountBalances[account.id] = account.balance || 0;
    });
  });

  // Adjust balances based on journal entries for the current period
  journalEntries.forEach(entry => {
    const entryDate = parseISO(entry.date);
    const year = getYear(entryDate);
    const monthIndex = getMonth(entryDate); // 0-indexed (0 for January)
    const monthYearKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`; // YYYY-MM for sorting

    if (!monthlyDataAggregator.has(monthYearKey)) {
      monthlyDataAggregator.set(monthYearKey, { revenue: 0, expenses: 0, year, monthIndex });
    }
    const currentMonthData = monthlyDataAggregator.get(monthYearKey)!;

    entry.lines.forEach(line => {
      const account = chartOfAccounts.groups.flatMap(g => g.accounts).find(a => a.id === line.accountId);
      if (account) {
        let groupOfAccount = chartOfAccounts.groups.find(g => g.accounts.some(a => a.id === line.accountId));
        let mainTypeForAggregation: AccountGroup['mainType'] | undefined = undefined;

        if (groupOfAccount) {
            if (groupOfAccount.isFixed) {
                mainTypeForAggregation = groupOfAccount.mainType;
            } else if (groupOfAccount.parentId) {
                const parentFixedGroup = chartOfAccounts.groups.find(pg => pg.id === groupOfAccount!.parentId && pg.isFixed);
                if (parentFixedGroup) {
                    mainTypeForAggregation = parentFixedGroup.mainType;
                }
            }
        }

        const debitAmount = line.debit || 0;
        const creditAmount = line.credit || 0;
        // For Asset/Expense: positive debit increases balance. For Liability/Equity/Revenue: positive credit increases "value" (decreases balance number).
        const netChange = debitAmount - creditAmount; 

        // Update overall account balances (used for Bilanz items)
        accountBalances[line.accountId] = (accountBalances[line.accountId] || 0) + netChange;

        // Aggregate monthly P&L
        if (mainTypeForAggregation === 'Revenue') {
            // Revenue increases with credits. A credit makes netChange negative for P&L calculation from balance perspective.
            // We want positive revenue value, so -netChange if netChange represents change in balance.
            currentMonthData.revenue -= netChange; 
        } else if (mainTypeForAggregation === 'Expense') {
            // Expenses increase with debits. A debit makes netChange positive.
            currentMonthData.expenses += netChange;
        }
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

      switch (group.mainType) { 
        case 'Asset':
          totalAssets += currentBalance;
          break;
        case 'Liability':
          totalLiabilities -= currentBalance; 
          break;
        case 'Equity':
          // This sums the *current balances* of equity accounts.
          // The profit/loss for the *current period* is handled separately.
          // totalEquityFromInitialBalances -= currentBalance; 
          break;
        case 'Revenue':
          totalRevenue -= currentBalance; // Revenue accounts have credit balances, so subtract to get positive revenue figure
          break;
        case 'Expense':
          totalExpenses += currentBalance; // Expense accounts have debit balances
          break;
      }
    });
  });

  const netProfitLoss = totalRevenue - totalExpenses;
  
  // Equity on the balance sheet is Assets - Liabilities.
  const calculatedEquityFromAssetsLiabilities = totalAssets - totalLiabilities;

  const monthlyBreakdown: MonthlyBreakdownItem[] = Array.from(monthlyDataAggregator.entries())
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB)) // Sort by YYYY-MM key
    .map(([key, data]) => ({
      month: format(new Date(data.year, data.monthIndex), "MMM", { locale: de }), // e.g., "Jan"
      year: data.year,
      monthYear: `${format(new Date(data.year, data.monthIndex), "MMM", { locale: de })} '${String(data.year).slice(-2)}`, // e.g., "Jan '24"
      revenue: data.revenue,
      expenses: data.expenses,
    }));


  return {
    totalAssets,
    totalLiabilities,
    totalRevenue,
    totalExpenses,
    netProfitLoss,
    equity: calculatedEquityFromAssetsLiabilities, 
    accountBalances, 
    monthlyBreakdown,
  };
}
