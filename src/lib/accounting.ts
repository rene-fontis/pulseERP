import type { TenantChartOfAccounts, JournalEntry, Account, AccountGroup, MonthlyBreakdownItem, FiscalYear } from '@/types';
import { parseISO, format, getYear, getMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { de } from 'date-fns/locale';

export interface AccountBalances {
  [accountId: string]: number;
}

export interface FinancialSummary {
  totalAssetsPeriodChange: number;
  totalLiabilitiesPeriodChange: number;
  equityPeriodChange: number;
  closingTotalAssets: number;
  closingTotalLiabilities: number;
  totalRevenue: number; // For the selected period
  totalExpenses: number; // For the selected period
  netProfitLoss: number; // For the selected period
  closingEquity: number; // As of end of selected period
  accountBalances: AccountBalances; // As of end of selected period
  monthlyBreakdown: MonthlyBreakdownItem[]; // For the selected period
}

export function calculateFinancialSummary(
  chartOfAccounts: TenantChartOfAccounts | undefined,
  allJournalEntriesForTenant: JournalEntry[] | undefined, // Should contain all entries for the tenant
  selectedFiscalYear: FiscalYear | null | undefined
): FinancialSummary {
  const initialSummary: FinancialSummary = {
    totalAssetsPeriodChange: 0,
    totalLiabilitiesPeriodChange: 0,
    equityPeriodChange: 0,
    closingTotalAssets: 0,
    closingTotalLiabilities: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netProfitLoss: 0,
    closingEquity: 0,
    accountBalances: {},
    monthlyBreakdown: [],
  };

  if (!chartOfAccounts) {
    return initialSummary; // No CoA, return empty summary
  }

  // Initialize account balances with opening balances from CoA
  chartOfAccounts.groups.forEach(group => {
    group.accounts.forEach(account => {
      initialSummary.accountBalances[account.id] = account.balance || 0;
    });
  });
  
  let openingTotalAssets = 0;
  let openingTotalLiabilities = 0;
  chartOfAccounts.groups.forEach(group => {
    group.accounts.forEach(account => {
      if (group.mainType === 'Asset') openingTotalAssets += (account.balance || 0);
      else if (group.mainType === 'Liability') openingTotalLiabilities -= (account.balance || 0); // Liabilities are credit, subtract for positive value
    });
  });
  const openingEquity = openingTotalAssets - openingTotalLiabilities;


  if (!selectedFiscalYear) {
    // If no fiscal year, calculate closing balances based on opening balances (no period changes)
    initialSummary.closingTotalAssets = openingTotalAssets;
    initialSummary.closingTotalLiabilities = openingTotalLiabilities;
    initialSummary.closingEquity = openingEquity;
    return initialSummary;
  }
  
  const accountBalances: AccountBalances = {};
  chartOfAccounts.groups.forEach(group => {
    group.accounts.forEach(account => {
      accountBalances[account.id] = account.balance || 0; // Start with opening balances for the period
    });
  });

  const monthlyDataAggregator: Map<string, { revenue: number; expenses: number; year: number; monthIndex: number }> = new Map();
  
  const fyStartDate = startOfDay(parseISO(selectedFiscalYear.startDate));
  const fyEndDate = endOfDay(parseISO(selectedFiscalYear.endDate));

  const periodJournalEntries = (allJournalEntriesForTenant || []).filter(entry => {
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
    let groupIsAsset = false;
    let groupIsLiability = false;
    let groupIsRevenue = false;
    let groupIsExpense = false;

    // Determine the effective mainType for period change calculation
    // For subgroups, use the mainType of their fixed parent
    if (group.isFixed) {
      if (group.mainType === 'Asset') groupIsAsset = true;
      if (group.mainType === 'Liability') groupIsLiability = true;
      if (group.mainType === 'Revenue') groupIsRevenue = true;
      if (group.mainType === 'Expense') groupIsExpense = true;
    } else if (group.parentId) {
      const parentGroup = chartOfAccounts.groups.find(pg => pg.id === group.parentId && pg.isFixed);
      if (parentGroup) {
        if (parentGroup.mainType === 'Asset') groupIsAsset = true;
        if (parentGroup.mainType === 'Liability') groupIsLiability = true;
        if (parentGroup.mainType === 'Revenue') groupIsRevenue = true;
        if (parentGroup.mainType === 'Expense') groupIsExpense = true;
      }
    }

    group.accounts.forEach(account => {
      const closingBalance = accountBalances[account.id] || 0;
      const openingBalance = account.balance || 0; 
      const periodAccountChange = closingBalance - openingBalance;

      if (groupIsAsset) {
        closingTotalAssets += closingBalance;
        periodChangeAssets += periodAccountChange;
      } else if (groupIsLiability) {
        closingTotalLiabilities -= closingBalance; // Liabilities are credit balances, so subtract for positive total.
        periodChangeLiabilities -= periodAccountChange; 
      } else if (groupIsRevenue) {
        periodRevenue -= periodAccountChange; // Revenue is credit, so negative change increases revenue value
      } else if (groupIsExpense) {
        periodExpenses += periodAccountChange; // Expense is debit, positive change increases expense value
      }
    });
  });
  
  const netProfitLossForPeriod = periodRevenue - periodExpenses;
  const closingEquity = closingTotalAssets - closingTotalLiabilities;
  const equityPeriodChange = closingEquity - openingEquity;


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
    totalAssetsPeriodChange: periodChangeAssets,
    totalLiabilitiesPeriodChange: periodChangeLiabilities,
    equityPeriodChange: equityPeriodChange,
    closingTotalAssets: closingTotalAssets,
    closingTotalLiabilities: closingTotalLiabilities,
    totalRevenue: periodRevenue,
    totalExpenses: periodExpenses,
    netProfitLoss: netProfitLossForPeriod,
    closingEquity: closingEquity, 
    accountBalances,
    monthlyBreakdown,
  };
}
