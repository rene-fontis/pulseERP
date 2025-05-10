
import type {
  TenantChartOfAccounts,
  Budget,
  BudgetEntry,
  BudgetReportData,
  BudgetReportAccountEntry,
  BudgetReportChartDataItem,
  Account,
  AccountGroup,
  AggregationPeriod,
  BudgetScenario,
} from '@/types';
import {
  parseISO,
  format,
  addMonths,
  addWeeks,
  addDays,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  eachMonthOfInterval,
  eachWeekOfInterval,
  eachDayOfInterval,
  isBefore,
  isAfter,
  isEqual,
  getMonth,
  getYear,
} from 'date-fns';
import { de } from 'date-fns/locale';

function countOccurrencesInPeriod(
  entry: BudgetEntry,
  periodStart: Date,
  periodEnd: Date
): number {
  if (!entry.startDate) return 0;

  const entryStartDate = startOfDay(parseISO(entry.startDate));
  const entryOwnEndDate = entry.endDate ? endOfDay(parseISO(entry.endDate)) : null;

  // If the entry itself is outside the query period entirely, return 0.
  if (entryOwnEndDate && isBefore(entryOwnEndDate, periodStart)) return 0;
  if (isAfter(entryStartDate, periodEnd)) return 0;

  if (!entry.isRecurring || entry.recurrence === 'None') {
    return isWithinInterval(entryStartDate, { start: periodStart, end: periodEnd }) ? 1 : 0;
  }

  let occurrences = 0;
  let currentDate = entryStartDate;

  // Adjust currentDate to be the first occurrence >= periodStart
  while (isBefore(currentDate, periodStart)) {
    switch (entry.recurrence) {
      case 'Monthly': currentDate = addMonths(currentDate, 1); break;
      case 'Bimonthly': currentDate = addMonths(currentDate, 2); break;
      case 'Quarterly': currentDate = addMonths(currentDate, 3); break;
      case 'EveryFourMonths': currentDate = addMonths(currentDate, 4); break;
      case 'Semiannually': currentDate = addMonths(currentDate, 6); break;
      case 'Yearly': currentDate = addMonths(currentDate, 12); break;
      default: return 0; // Should not happen with 'None' handled
    }
  }
  
  while (isBefore(currentDate, periodEnd) || isEqual(currentDate, periodEnd)) {
    if (entryOwnEndDate && isAfter(currentDate, entryOwnEndDate)) {
      break; 
    }
    if (isWithinInterval(currentDate, { start: periodStart, end: periodEnd })) {
      occurrences++;
    }

    switch (entry.recurrence) {
      case 'Monthly': currentDate = addMonths(currentDate, 1); break;
      case 'Bimonthly': currentDate = addMonths(currentDate, 2); break;
      case 'Quarterly': currentDate = addMonths(currentDate, 3); break;
      case 'EveryFourMonths': currentDate = addMonths(currentDate, 4); break;
      case 'Semiannually': currentDate = addMonths(currentDate, 6); break;
      case 'Yearly': currentDate = addMonths(currentDate, 12); break;
      default: return occurrences; // Should not happen
    }
  }
  return occurrences;
}

export function calculateBudgetReportData(
  chartOfAccounts: TenantChartOfAccounts,
  allTenantBudgets: Budget[],
  allTenantBudgetEntries: BudgetEntry[],
  reportStartDate: Date,
  reportEndDate: Date,
  aggregationPeriod: AggregationPeriod = 'monthly'
): BudgetReportData {
  const reportData: BudgetReportData = {
    tableData: [],
    chartData: [],
  };

  const accountMap = new Map<string, Account & { mainType: AccountGroup['mainType'] }>();
  chartOfAccounts.groups.forEach(group => {
    group.accounts.forEach(acc => {
      accountMap.set(acc.id, { ...acc, mainType: group.mainType });
    });
  });

  // --- Prepare Table Data ---
  const accountAggregates = new Map<string, BudgetReportAccountEntry>();

  allTenantBudgetEntries.forEach(entry => {
    const occurrences = countOccurrencesInPeriod(entry, reportStartDate, reportEndDate);
    if (occurrences === 0) return;

    const budget = allTenantBudgets.find(b => b.id === entry.budgetId);
    if (!budget) return;

    const account = accountMap.get(entry.accountId);
    if (!account) return;
    
    let aggregate = accountAggregates.get(entry.accountId);
    if (!aggregate) {
      aggregate = {
        accountId: entry.accountId,
        accountNumber: account.number,
        accountName: account.name,
        mainType: account.mainType,
        actualAmount: 0,
        bestCaseAmount: 0,
        worstCaseAmount: 0,
      };
    }

    const totalAmountForPeriod = entry.amount * occurrences;
    const amountToAdd = entry.type === 'Income' ? totalAmountForPeriod : -totalAmountForPeriod;

    switch (budget.scenario) {
      case 'Actual':
        aggregate.actualAmount += amountToAdd;
        // If an account has an 'Actual' entry, it contributes to best/worst too unless overridden
        if (!allTenantBudgetEntries.some(be => be.accountId === entry.accountId && be.budgetId !== entry.budgetId && allTenantBudgets.find(b=>b.id === be.budgetId)?.scenario === 'Best Case')) {
             aggregate.bestCaseAmount += amountToAdd;
        }
        if (!allTenantBudgetEntries.some(be => be.accountId === entry.accountId && be.budgetId !== entry.budgetId && allTenantBudgets.find(b=>b.id === be.budgetId)?.scenario === 'Worst Case')) {
             aggregate.worstCaseAmount += amountToAdd;
        }
        break;
      case 'Best Case':
        aggregate.bestCaseAmount += amountToAdd;
        break;
      case 'Worst Case':
        aggregate.worstCaseAmount += amountToAdd;
        break;
    }
    accountAggregates.set(entry.accountId, aggregate);
  });
  reportData.tableData = Array.from(accountAggregates.values());


  // --- Prepare Chart Data ---
  let periods: Date[] = [];
  switch (aggregationPeriod) {
    case 'monthly':
      periods = eachMonthOfInterval({ start: reportStartDate, end: reportEndDate });
      break;
    case 'weekly':
      periods = eachWeekOfInterval({ start: reportStartDate, end: reportEndDate }, { weekStartsOn: 1 });
      break;
    case 'daily':
      periods = eachDayOfInterval({ start: reportStartDate, end: reportEndDate });
      break;
  }

  periods.forEach(periodDate => {
    let periodStart: Date, periodEnd: Date, periodLabel: string;

    switch (aggregationPeriod) {
      case 'monthly':
        periodStart = startOfMonth(periodDate);
        periodEnd = endOfMonth(periodDate);
        periodLabel = format(periodDate, "MMM yy", { locale: de });
        break;
      case 'weekly':
        periodStart = startOfWeek(periodDate, { weekStartsOn: 1 });
        periodEnd = endOfWeek(periodDate, { weekStartsOn: 1 });
        periodLabel = `KW${format(periodDate, "ww", { locale: de })} '${format(periodDate, "yy", { locale: de })}`;
        break;
      case 'daily':
        periodStart = startOfDay(periodDate);
        periodEnd = endOfDay(periodDate);
        periodLabel = format(periodDate, "dd.MM.yy", { locale: de });
        break;
    }
    
    // Ensure periodEnd does not exceed reportEndDate
    if (isAfter(periodEnd, reportEndDate)) {
        periodEnd = reportEndDate;
    }
    // Ensure periodStart does not predate reportStartDate
    if (isBefore(periodStart, reportStartDate)) {
        periodStart = reportStartDate;
    }


    const chartItem: BudgetReportChartDataItem = {
      periodLabel,
      actualProfitLoss: 0,
      bestCaseProfitLoss: 0,
      worstCaseProfitLoss: 0,
    };

    allTenantBudgetEntries.forEach(entry => {
      const occurrences = countOccurrencesInPeriod(entry, periodStart, periodEnd);
      if (occurrences === 0) return;

      const budget = allTenantBudgets.find(b => b.id === entry.budgetId);
      if (!budget) return;

      const account = accountMap.get(entry.accountId);
      if (!account || (account.mainType !== 'Revenue' && account.mainType !== 'Expense')) return;

      const totalAmountForSubPeriod = entry.amount * occurrences;
      const amountChange = entry.type === 'Income' ? totalAmountForSubPeriod : -totalAmountForSubPeriod;

      switch (budget.scenario) {
        case 'Actual':
          chartItem.actualProfitLoss += amountChange;
          // Contribution to best/worst if not overridden.
           if (!allTenantBudgetEntries.some(be => be.accountId === entry.accountId && be.budgetId !== entry.budgetId && allTenantBudgets.find(b=>b.id === be.budgetId)?.scenario === 'Best Case' && countOccurrencesInPeriod(be, periodStart, periodEnd) > 0)) {
             chartItem.bestCaseProfitLoss += amountChange;
           }
           if (!allTenantBudgetEntries.some(be => be.accountId === entry.accountId && be.budgetId !== entry.budgetId && allTenantBudgets.find(b=>b.id === be.budgetId)?.scenario === 'Worst Case' && countOccurrencesInPeriod(be, periodStart, periodEnd) > 0)) {
            chartItem.worstCaseProfitLoss += amountChange;
           }
          break;
        case 'Best Case':
          chartItem.bestCaseProfitLoss += amountChange;
          break;
        case 'Worst Case':
          chartItem.worstCaseProfitLoss += amountChange;
          break;
      }
    });
    reportData.chartData.push(chartItem);
  });

  return reportData;
}
