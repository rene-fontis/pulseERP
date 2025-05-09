import type { TenantChartOfAccounts, JournalEntry, Account, AccountGroup, MonthlyBreakdownItem, FiscalYear } from '@/types';
import { parseISO, format, getYear, getMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { de } from 'date-fns/locale';

export interface AccountBalances {
  [accountId: string]: number;
}

export interface FinancialSummary {
  totalAssets: number; // Will now represent period change for summary cards
  totalLiabilities: number; // Will now represent period change for summary cards
  closingTotalAssets: number; // Absolute closing balance for equity calculation
  closingTotalLiabilities: number; // Absolute closing balance for equity calculation
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
    closingTotalAssets: 0,
    closingTotalLiabilities: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netProfitLoss: 0,
    equity: 0,
    accountBalances: {},
    monthlyBreakdown: [],
  };

  if (!chartOfAccounts || !selectedFiscalYear) {
     if (chartOfAccounts) {
        let openingAssets = 0;
        let openingLiabilities = 0;
        chartOfAccounts.groups.forEach(group => {
            group.accounts.forEach(account => {
            initialSummary.accountBalances[account.id] = account.balance || 0; // Opening balances
            if (group.mainType === 'Asset') openingAssets += (account.balance || 0);
            else if (group.mainType === 'Liability') openingLiabilities -= (account.balance || 0);
            });
        });
        initialSummary.closingTotalAssets = openingAssets;
        initialSummary.closingTotalLiabilities = openingLiabilities;
        initialSummary.equity = openingAssets - openingLiabilities;
    }
    // If no fiscal year, P&L figures and period changes remain 0
    return initialSummary;
  }
  
  // If fiscal year is selected, but no entries, we start with opening balances
  // and P&L items will be 0.
  if (!allJournalEntriesForTenant || allJournalEntriesForTenant.length === 0) {
    let openingAssets = 0;
    let openingLiabilities = 0;
    chartOfAccounts.groups.forEach(group => {
        group.accounts.forEach(account => {
        initialSummary.accountBalances[account.id] = account.balance || 0; // Opening balances
        if (group.mainType === 'Asset') openingAssets += (account.balance || 0);
        else if (group.mainType === 'Liability') openingLiabilities -= (account.balance || 0);
        });
    });
    initialSummary.closingTotalAssets = openingAssets;
    initialSummary.closingTotalLiabilities = openingLiabilities;
    initialSummary.equity = openingAssets - openingLiabilities;
    initialSummary.totalAssets = 0; // No change in period
    initialSummary.totalLiabilities = 0; // No change in period
    return initialSummary;
  }


  const accountBalances: AccountBalances = {};
  const monthlyDataAggregator: Map<string, { revenue: number; expenses: number; year: number; monthIndex: number }> = new Map();

  chartOfAccounts.groups.forEach(group => {
    group.accounts.forEach(account => {
      accountBalances[account.id] = account.balance || 0; // Start with opening balances
    });
  });
  
  const fyStartDate = startOfDay(parseISO(selectedFiscalYear.startDate));
  const fyEndDate = endOfDay(parseISO(selectedFiscalYear.endDate));

  const periodJournalEntries = allJournalEntriesForTenant.filter(entry => {
    const entryDate = parseISO(entry.date);
    return isWithinInterval(entryDate, { start: fyStartDate, end: fyEndDate });
  });

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
        const netChange = debitAmount - creditAmount; 

        accountBalances[line.accountId] = (accountBalances[line.accountId] || 0) + netChange;
        
        if (mainTypeForAggregation === 'Revenue') {
            currentMonthData.revenue -= netChange; 
        } else if (mainTypeForAggregation === 'Expense') {
            currentMonthData.expenses += netChange;
        }
      }
    });
  });

  let periodChangeAssets = 0;
  let periodChangeLiabilities = 0;
  let closingTotalAssets = 0;
  let closingTotalLiabilities = 0;
  let periodRevenue = 0;
  let periodExpenses = 0;

  chartOfAccounts.groups.forEach(group => {
    group.accounts.forEach(account => {
      const closingBalance = accountBalances[account.id] || 0;
      const openingBalance = account.balance || 0; 
      const periodAccountChange = closingBalance - openingBalance;

      switch (group.mainType) { 
        case 'Asset':
          closingTotalAssets += closingBalance;
          periodChangeAssets += periodAccountChange;
          break;
        case 'Liability':
          closingTotalLiabilities -= closingBalance; // Liabilities are credit balances, so subtract for positive total.
          periodChangeLiabilities -= periodAccountChange; // A negative change (more debt) becomes positive here.
          break;
        case 'Equity':
          // Equity closing balance is handled via Assets - Liabilities.
          // Individual equity account changes are not directly summed for the cards,
          // but their closing balances are in `accountBalances`.
          break; 
        case 'Revenue':
          periodRevenue -= periodAccountChange; // Revenue is credit, so negative change increases revenue value
          break;
        case 'Expense':
          periodExpenses += periodAccountChange; // Expense is debit, positive change increases expense value
          break;
      }
    });
  });
  
  const netProfitLossForPeriod = periodRevenue - periodExpenses;
  const equityAtPeriodEnd = closingTotalAssets - closingTotalLiabilities;

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
    totalAssets: periodChangeAssets,
    totalLiabilities: periodChangeLiabilities,
    closingTotalAssets: closingTotalAssets,
    closingTotalLiabilities: closingTotalLiabilities,
    totalRevenue: periodRevenue,
    totalExpenses: periodExpenses,
    netProfitLoss: netProfitLossForPeriod,
    equity: equityAtPeriodEnd, 
    accountBalances,
    monthlyBreakdown,
  };
}
