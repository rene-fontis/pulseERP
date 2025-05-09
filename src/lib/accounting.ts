import type { TenantChartOfAccounts, JournalEntry, Account, AccountGroup, MonthlyBreakdownItem, FiscalYear } from '@/types';
import { parseISO, format, getYear, getMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { de } from 'date-fns/locale';

export interface AccountBalances {
  [accountId: string]: number;
}

export interface FinancialSummary {
  totalAssets: number;
  totalLiabilities: number;
  totalRevenue: number; // For the selected period
  totalExpenses: number; // For the selected period
  netProfitLoss: number; // For the selected period
  equity: number; // As of end of selected period
  accountBalances: AccountBalances; // As of end of selected period
  monthlyBreakdown: MonthlyBreakdownItem[]; // For the selected period
}

export function calculateFinancialSummary(
  chartOfAccounts: TenantChartOfAccounts | undefined,
  allJournalEntriesForTenant: JournalEntry[] | undefined, // Should contain all entries for the tenant
  selectedFiscalYear: FiscalYear | null | undefined
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

  if (!chartOfAccounts || !allJournalEntriesForTenant || !selectedFiscalYear) {
    // If no fiscal year is selected, or base data is missing, return initial summary or handle opening balances only
     if (chartOfAccounts) {
        chartOfAccounts.groups.forEach(group => {
            group.accounts.forEach(account => {
            initialSummary.accountBalances[account.id] = account.balance || 0;
            if (group.mainType === 'Asset') initialSummary.totalAssets += (account.balance || 0);
            else if (group.mainType === 'Liability') initialSummary.totalLiabilities -= (account.balance || 0);
            // Initial equity is assets - liabilities if no profit/loss considered yet
            });
        });
        initialSummary.equity = initialSummary.totalAssets - initialSummary.totalLiabilities;
    }
    return initialSummary;
  }

  const accountBalances: AccountBalances = {};
  const monthlyDataAggregator: Map<string, { revenue: number; expenses: number; year: number; monthIndex: number }> = new Map();

  // Initialize accountBalances with the opening balances from the Chart of Accounts.
  // These are considered the balances at the START of the very first period OR after a year-end closing.
  chartOfAccounts.groups.forEach(group => {
    group.accounts.forEach(account => {
      accountBalances[account.id] = account.balance || 0;
    });
  });
  
  const fyStartDate = startOfDay(parseISO(selectedFiscalYear.startDate));
  const fyEndDate = endOfDay(parseISO(selectedFiscalYear.endDate));

  // Filter entries relevant for P&L (within the selected fiscal year)
  const periodJournalEntries = allJournalEntriesForTenant.filter(entry => {
    const entryDate = parseISO(entry.date);
    return isWithinInterval(entryDate, { start: fyStartDate, end: fyEndDate });
  });

  // Process journal entries for the selected fiscal year to calculate P&L and adjust BS accounts
  periodJournalEntries.forEach(entry => {
    const entryDate = parseISO(entry.date);
    const year = getYear(entryDate);
    const monthIndex = getMonth(entryDate);
    const monthYearKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

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
        const netChange = debitAmount - creditAmount; // Positive for debit, negative for credit

        // Update overall account balances (these become closing balances for the period)
        accountBalances[line.accountId] = (accountBalances[line.accountId] || 0) + netChange;
        
        // Aggregate P&L for monthly breakdown and period totals
        if (mainTypeForAggregation === 'Revenue') {
            currentMonthData.revenue -= netChange; // Revenue increases with credits (netChange is negative for credit)
        } else if (mainTypeForAggregation === 'Expense') {
            currentMonthData.expenses += netChange; // Expenses increase with debits (netChange is positive for debit)
        }
      }
    });
  });

  let totalAssets = 0;
  let totalLiabilities = 0;
  let periodRevenue = 0;
  let periodExpenses = 0;

  chartOfAccounts.groups.forEach(group => {
    group.accounts.forEach(account => {
      const closingBalance = accountBalances[account.id] || 0;
      switch (group.mainType) { 
        case 'Asset':
          totalAssets += closingBalance;
          break;
        case 'Liability':
          totalLiabilities -= closingBalance; // Liabilities are credit balances
          break;
        case 'Equity':
          // Equity sum from accounts (excluding current period P&L, which is added later or implicitly via A-L)
          // This part sums up the *closing balances* of equity accounts.
          break; 
        case 'Revenue':
          // Sum the *change* during the period for revenue accounts for P&L report
          // The change is (closingBalance - openingBalance)
          // Since revenue accounts are credit, their balance decreases (becomes more negative) with revenue
          // So, change = closingBalance - openingBalance = (initial + periodCredits - periodDebits) - initial = periodCredits - periodDebits
          // If we define revenue as positive: -(closingBalance - openingBalance)
          periodRevenue -= (closingBalance - (account.balance || 0));
          break;
        case 'Expense':
          // Sum the *change* during the period for expense accounts
          // change = closingBalance - openingBalance = (initial + periodDebits - periodCredits) - initial = periodDebits - periodCredits
          periodExpenses += (closingBalance - (account.balance || 0));
          break;
      }
    });
  });
  
  const netProfitLossForPeriod = periodRevenue - periodExpenses;
  
  // Final Equity for Balance Sheet = Assets - Liabilities
  // This automatically includes opening equity + all profit/loss up to the end of the selected period.
  const equityAtPeriodEnd = totalAssets - totalLiabilities;

  const monthlyBreakdown: MonthlyBreakdownItem[] = Array.from(monthlyDataAggregator.entries())
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB)) 
    .map(([key, data]) => ({
      month: format(new Date(data.year, data.monthIndex), "MMM", { locale: de }),
      year: data.year,
      monthYear: `${format(new Date(data.year, data.monthIndex), "MMM", { locale: de })} '${String(data.year).slice(-2)}`,
      revenue: data.revenue,
      expenses: data.expenses,
    }));

  return {
    totalAssets,
    totalLiabilities,
    totalRevenue: periodRevenue,
    totalExpenses: periodExpenses,
    netProfitLoss: netProfitLossForPeriod,
    equity: equityAtPeriodEnd, 
    accountBalances, // These are closing balances for the selected period
    monthlyBreakdown,
  };
}

