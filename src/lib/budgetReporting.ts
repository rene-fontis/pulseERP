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

  if (entryOwnEndDate && isBefore(entryOwnEndDate, periodStart)) return 0;
  if (isAfter(entryStartDate, periodEnd)) return 0;

  if (!entry.isRecurring || entry.recurrence === 'None') {
    return isWithinInterval(entryStartDate, { start: periodStart, end: periodEnd }) ? 1 : 0;
  }

  let occurrences = 0;
  let currentDate = entryStartDate;

  while (isBefore(currentDate, periodStart)) {
    switch (entry.recurrence) {
      case 'Monthly': currentDate = addMonths(currentDate, 1); break;
      case 'Bimonthly': currentDate = addMonths(currentDate, 2); break;
      case 'Quarterly': currentDate = addMonths(currentDate, 3); break;
      case 'EveryFourMonths': currentDate = addMonths(currentDate, 4); break;
      case 'Semiannually': currentDate = addMonths(currentDate, 6); break;
      case 'Yearly': currentDate = addMonths(currentDate, 12); break;
      default: return 0;
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
      default: return occurrences;
    }
  }
  return occurrences;
}

export function calculateBudgetReportData(
  chartOfAccounts: TenantChartOfAccounts,
  _allTenantBudgets: Budget[], // No longer needed for scenario filtering, but kept for potential future use
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
    const effectiveMainType = group.isFixed ? group.mainType : chartOfAccounts.groups.find(g => g.id === group.parentId)?.mainType || group.mainType;
    group.accounts.forEach(acc => {
      accountMap.set(acc.id, { ...acc, mainType: effectiveMainType });
    });
  });

  const accountAggregates = new Map<string, BudgetReportAccountEntry>();

  allTenantBudgetEntries.forEach(entry => {
    if (entry.type === 'Transfer') return; // Ignore transfers for P&L focused table data

    const occurrences = countOccurrencesInPeriod(entry, reportStartDate, reportEndDate);
    if (occurrences === 0) return;

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

    const pnlImpactActual = (entry.type === 'Income' ? entry.amountActual : -entry.amountActual) * occurrences;
    // Use actual amount if best/worst case is not specified (null or undefined)
    const amountForBestCase = entry.amountBestCase ?? entry.amountActual;
    const amountForWorstCase = entry.amountWorstCase ?? entry.amountActual;

    const pnlImpactBestCase = (entry.type === 'Income' ? amountForBestCase : -amountForBestCase) * occurrences;
    const pnlImpactWorstCase = (entry.type === 'Income' ? amountForWorstCase : -amountForWorstCase) * occurrences;

    aggregate.actualAmount += pnlImpactActual;
    aggregate.bestCaseAmount += pnlImpactBestCase;
    aggregate.worstCaseAmount += pnlImpactWorstCase;
    
    accountAggregates.set(entry.accountId, aggregate);
  });
  reportData.tableData = Array.from(accountAggregates.values());

  let periods: Date[] = [];
  switch (aggregationPeriod) {
    case 'monthly': periods = eachMonthOfInterval({ start: reportStartDate, end: reportEndDate }); break;
    case 'weekly': periods = eachWeekOfInterval({ start: reportStartDate, end: reportEndDate }, { weekStartsOn: 1 }); break;
    case 'daily': periods = eachDayOfInterval({ start: reportStartDate, end: reportEndDate }); break;
  }

  periods.forEach(periodDate => {
    let periodStart: Date, periodEnd: Date, periodLabel: string;

    switch (aggregationPeriod) {
      case 'monthly':
        periodStart = startOfMonth(periodDate); periodEnd = endOfMonth(periodDate);
        periodLabel = format(periodDate, "MMM yy", { locale: de }); break;
      case 'weekly':
        periodStart = startOfWeek(periodDate, { weekStartsOn: 1 }); periodEnd = endOfWeek(periodDate, { weekStartsOn: 1 });
        periodLabel = `KW${format(periodDate, "ww", { locale: de })} '${format(periodDate, "yy", { locale: de })}`; break;
      case 'daily':
        periodStart = startOfDay(periodDate); periodEnd = endOfDay(periodDate);
        periodLabel = format(periodDate, "dd.MM.yy", { locale: de }); break;
    }
    
    if (isAfter(periodEnd, reportEndDate)) periodEnd = reportEndDate;
    if (isBefore(periodStart, reportStartDate)) periodStart = reportStartDate;

    const chartItem: BudgetReportChartDataItem = {
      periodLabel,
      periodActualBudgetProfitLoss: 0,
      periodBestCaseBudgetProfitLoss: 0,
      periodWorstCaseBudgetProfitLoss: 0,
    };

    allTenantBudgetEntries.forEach(entry => {
      if (entry.type === 'Transfer') return; // Ignore transfers for P&L focused chart data

      const occurrences = countOccurrencesInPeriod(entry, periodStart, periodEnd);
      if (occurrences === 0) return;

      const account = accountMap.get(entry.accountId);
      if (!account || (account.mainType !== 'Revenue' && account.mainType !== 'Expense')) return;

      const pnlImpactActual = (entry.type === 'Income' ? entry.amountActual : -entry.amountActual) * occurrences;
      const amountForBestCase = entry.amountBestCase ?? entry.amountActual;
      const amountForWorstCase = entry.amountWorstCase ?? entry.amountActual;
      const pnlImpactBestCase = (entry.type === 'Income' ? amountForBestCase : -amountForBestCase) * occurrences;
      const pnlImpactWorstCase = (entry.type === 'Income' ? amountForWorstCase : -amountForWorstCase) * occurrences;

      chartItem.periodActualBudgetProfitLoss += pnlImpactActual;
      chartItem.periodBestCaseBudgetProfitLoss += pnlImpactBestCase;
      chartItem.periodWorstCaseBudgetProfitLoss += pnlImpactWorstCase;
    });
    reportData.chartData.push(chartItem);
  });

  return reportData;
}
