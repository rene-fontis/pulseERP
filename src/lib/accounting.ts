import type { TenantChartOfAccounts, JournalEntry, Account, AccountGroup, FinancialSummary, FiscalYear, PeriodicalBreakdownItem, AggregationPeriod } from '@/types';
import { parseISO, format, getYear, getMonth, isWithinInterval, startOfDay, endOfDay, getISOWeek, getISOWeekYear } from 'date-fns';
import { de } from 'date-fns/locale';

export interface AccountBalances {
  [accountId: string]: number;
}


export function calculateFinancialSummary(
  chartOfAccounts: TenantChartOfAccounts | undefined,
  allJournalEntriesForTenant: JournalEntry[] | undefined, // Should contain all entries for the tenant
  selectedFiscalYear: FiscalYear | null | undefined,
  aggregationPeriod: AggregationPeriod = 'monthly'
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
    periodicalBreakdown: [],
  };

  if (!chartOfAccounts) {
    return initialSummary; 
  }

  const accountBalances: AccountBalances = {};
  chartOfAccounts.groups.forEach(group => {
    group.accounts.forEach(account => {
      accountBalances[account.id] = account.balance || 0; // Start with opening balances from CoA
    });
  });
  
  let openingTotalAssets = 0;
  let openingTotalLiabilities = 0;
  chartOfAccounts.groups.forEach(group => {
    group.accounts.forEach(account => {
      if (group.mainType === 'Asset') openingTotalAssets += (account.balance || 0);
      // Liabilities are credit, so their balance contributes negatively to assets - liabilities = equity
      else if (group.mainType === 'Liability') openingTotalLiabilities += (account.balance || 0); 
    });
  });
  const openingEquity = openingTotalAssets - openingTotalLiabilities;


  if (!selectedFiscalYear) {
    initialSummary.closingTotalAssets = openingTotalAssets;
    initialSummary.closingTotalLiabilities = openingTotalLiabilities;
    initialSummary.closingEquity = openingEquity;
    return initialSummary;
  }
  
  const periodicalDataAggregator: Map<string, { revenue: number; expenses: number; year: number; sortKey: string; periodLabel: string }> = new Map();
  
  const fyStartDate = startOfDay(parseISO(selectedFiscalYear.startDate));
  const fyEndDate = endOfDay(parseISO(selectedFiscalYear.endDate));

  const periodJournalEntries = (allJournalEntriesForTenant || []).filter(entry => {
    const entryDate = parseISO(entry.date);
    return isWithinInterval(entryDate, { start: fyStartDate, end: fyEndDate });
  });

  periodJournalEntries.forEach(entry => {
    const entryDate = parseISO(entry.date);
    const year = getYear(entryDate);
    
    let periodKey: string;
    let periodLabel: string;
    let sortKey: string;

    switch (aggregationPeriod) {
      case 'weekly':
        const week = getISOWeek(entryDate);
        const weekYear = getISOWeekYear(entryDate);
        periodKey = `${weekYear}-W${String(week).padStart(2, '0')}`;
        periodLabel = `KW${week} '${String(weekYear).slice(-2)}`;
        sortKey = periodKey;
        break;
      case 'daily':
        periodKey = format(entryDate, 'yyyy-MM-dd');
        periodLabel = format(entryDate, "dd.MM.yy", { locale: de });
        sortKey = periodKey;
        break;
      case 'monthly':
      default:
        const monthIndex = getMonth(entryDate);
        periodKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
        periodLabel = `${format(entryDate, "MMM", { locale: de })} '${String(year).slice(-2)}`;
        sortKey = periodKey;
        break;
    }


    if (!periodicalDataAggregator.has(periodKey)) {
      periodicalDataAggregator.set(periodKey, { revenue: 0, expenses: 0, year, sortKey, periodLabel });
    }
    const currentPeriodData = periodicalDataAggregator.get(periodKey)!;

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
            currentPeriodData.revenue -= netChange; 
        } else if (mainTypeForAggregation === 'Expense') {
            currentPeriodData.expenses += netChange;
        }
      }
    });
  });

  let periodChangeAssets = 0;
  let periodChangeLiabilities = 0;
  let periodChangeEquity = 0; // For direct equity changes not part of P/L (e.g. capital contributions)
  let periodRevenue = 0;
  let periodExpenses = 0;

  chartOfAccounts.groups.forEach(group => {
    group.accounts.forEach(account => {
      const closingBalance = accountBalances[account.id] || 0;
      const openingBalance = account.balance || 0; 
      const periodAccountChange = closingBalance - openingBalance;

      let groupIsAsset = false;
      let groupIsLiability = false;
      let groupIsEquity = false;
      let groupIsRevenue = false;
      let groupIsExpense = false;

      // Determine the effective mainType for period change calculation
      const effectiveGroup = group.isFixed ? group : chartOfAccounts.groups.find(pg => pg.id === group.parentId && pg.isFixed);
      if (effectiveGroup) {
        if (effectiveGroup.mainType === 'Asset') groupIsAsset = true;
        if (effectiveGroup.mainType === 'Liability') groupIsLiability = true;
        if (effectiveGroup.mainType === 'Equity') groupIsEquity = true;
        if (effectiveGroup.mainType === 'Revenue') groupIsRevenue = true;
        if (effectiveGroup.mainType === 'Expense') groupIsExpense = true;
      }

      if (groupIsAsset) {
        periodChangeAssets += periodAccountChange;
      } else if (groupIsLiability) {
        periodChangeLiabilities -= periodAccountChange; 
      } else if (groupIsEquity) {
        // Only consider direct equity changes here, P/L is calculated separately
        if (!account.isRetainedEarningsAccount && !account.isSystemAccount) {
            periodChangeEquity += periodAccountChange; // This depends on debit/credit nature of equity accounts
        }
      } else if (groupIsRevenue) {
        periodRevenue -= periodAccountChange; 
      } else if (groupIsExpense) {
        periodExpenses += periodAccountChange;
      }
    });
  });
  
  const netProfitLossForPeriod = periodRevenue - periodExpenses;
  
  const closingTotalAssets = openingTotalAssets + periodChangeAssets;
  const closingTotalLiabilities = openingTotalLiabilities - periodChangeLiabilities; // Remember, liabilities are stored as positive credits
  
  // Equity period change = Net Profit/Loss + Direct Equity Changes (Capital contributions/withdrawals)
  // The 'periodChangeEquity' calculated above from non-P/L equity accounts needs to be adjusted
  // based on its debit/credit nature if we were to sum it.
  // Simpler: Closing Equity = Opening Equity + Net Profit/Loss + (Other direct equity changes, if any, captured in periodChangeEquity)
  // For now: periodChangeEquity = netProfitLossForPeriod (assuming no other direct equity transactions in this simplified model).
  // More accurately:
  const calculatedEquityPeriodChange = netProfitLossForPeriod; // Add direct capital changes if tracked separately.

  const closingEquity = openingEquity + calculatedEquityPeriodChange;


  const periodicalBreakdown: PeriodicalBreakdownItem[] = Array.from(periodicalDataAggregator.values())
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey)) 
    .map(data => ({
      periodLabel: data.periodLabel,
      year: data.year,
      revenue: data.revenue,
      expenses: data.expenses,
    }));

  return {
    totalAssetsPeriodChange: periodChangeAssets,
    totalLiabilitiesPeriodChange: periodChangeLiabilities, // This is the change in liability value (positive for increase in debt)
    equityPeriodChange: calculatedEquityPeriodChange,
    closingTotalAssets: closingTotalAssets,
    closingTotalLiabilities: closingTotalLiabilities, // This is the total liability value (positive)
    totalRevenue: periodRevenue,
    totalExpenses: periodExpenses,
    netProfitLoss: netProfitLossForPeriod,
    closingEquity: closingEquity, 
    accountBalances,
    periodicalBreakdown,
  };
}
