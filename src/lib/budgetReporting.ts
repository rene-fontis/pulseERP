
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
  getISOWeek,
  getISOWeekYear,
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

  // Advance currentDate to be at or after periodStart for recurring entries
  while (isBefore(currentDate, periodStart)) {
    switch (entry.recurrence) {
      case 'Weekly': currentDate = addWeeks(currentDate, 1); break;
      case 'Monthly': currentDate = addMonths(currentDate, 1); break;
      case 'Bimonthly': currentDate = addMonths(currentDate, 2); break;
      case 'Quarterly': currentDate = addMonths(currentDate, 3); break;
      case 'EveryFourMonths': currentDate = addMonths(currentDate, 4); break;
      case 'Semiannually': currentDate = addMonths(currentDate, 6); break;
      case 'Yearly': currentDate = addMonths(currentDate, 12); break;
      default: return 0; // Should not happen if type is correct
    }
     if (entryOwnEndDate && isAfter(currentDate, entryOwnEndDate)) break; // Stop if entry's own end date is reached before period start
  }
  
  // Count occurrences within the period
  while (isBefore(currentDate, periodEnd) || isEqual(currentDate, periodEnd)) {
    if (entryOwnEndDate && isAfter(currentDate, entryOwnEndDate)) {
      break; // Stop if entry's own end date is reached
    }
    // Check if the current occurrence is within the report period
    if (isWithinInterval(currentDate, { start: periodStart, end: periodEnd })) {
      occurrences++;
    }

    // Advance to next occurrence
    switch (entry.recurrence) {
      case 'Weekly': currentDate = addWeeks(currentDate, 1); break;
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
  _allTenantBudgets: Budget[], 
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
    let effectiveMainType = group.mainType;
    if(!group.isFixed && group.parentId){
        const parentGroup = chartOfAccounts.groups.find(pg => pg.id === group.parentId);
        if(parentGroup && parentGroup.isFixed) effectiveMainType = parentGroup.mainType;
    }
    group.accounts.forEach(acc => {
      accountMap.set(acc.id, { ...acc, mainType: effectiveMainType });
    });
  });

  const accountAggregates = new Map<string, BudgetReportAccountEntry>();

  allTenantBudgetEntries.forEach(entry => {
    if (entry.type === 'Transfer') return; 

    const occurrences = countOccurrencesInPeriod(entry, reportStartDate, reportEndDate);
    if (occurrences === 0) return;

    const account = accountMap.get(entry.accountId);
    if (!account || (account.mainType !== 'Revenue' && account.mainType !== 'Expense') ) return; // Only aggregate P&L accounts for table
    
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

  let periodsForChart: {periodStart: Date, periodEnd: Date, periodLabel: string, sortKey: string}[] = [];
  switch (aggregationPeriod) {
    case 'monthly':
        periodsForChart = eachMonthOfInterval({ start: reportStartDate, end: reportEndDate }).map(d => {
            const ps = startOfMonth(d); const pe = endOfMonth(d);
            const pl = format(d, "MMM yy", { locale: de }); const sk = format(d, "yyyy-MM");
            return { periodStart: ps, periodEnd: pe, periodLabel: pl, sortKey: sk };
        });
        break;
    case 'weekly':
        periodsForChart = eachWeekOfInterval({ start: reportStartDate, end: reportEndDate }, { weekStartsOn: 1 }).map(d => {
            const ps = startOfWeek(d, { weekStartsOn: 1}); const pe = endOfWeek(d, { weekStartsOn: 1});
            const year = getISOWeekYear(d); const weekNum = getISOWeek(d);
            const pl = `KW${weekNum} '${String(year).slice(-2)}`; const sk = `${year}-W${String(weekNum).padStart(2, '0')}`;
            return { periodStart: ps, periodEnd: pe, periodLabel: pl, sortKey: sk };
        });
        break;
    case 'daily':
        periodsForChart = eachDayOfInterval({ start: reportStartDate, end: reportEndDate }).map(d => {
            const ps = startOfDay(d); const pe = endOfDay(d);
            const pl = format(d, "dd.MM.yy", { locale: de }); const sk = format(d, "yyyy-MM-dd");
            return { periodStart: ps, periodEnd: pe, periodLabel: pl, sortKey: sk };
        });
        break;
  }


  periodsForChart.forEach(({ periodStart, periodEnd, periodLabel, sortKey }) => {
    let currentPeriodStart = periodStart;
    let currentPeriodEnd = periodEnd;
    if (isAfter(currentPeriodEnd, reportEndDate)) currentPeriodEnd = reportEndDate;
    if (isBefore(currentPeriodStart, reportStartDate)) currentPeriodStart = reportStartDate;

    const chartItem: BudgetReportChartDataItem = {
      periodLabel,
      sortKey,
      periodActualBudgetProfitLoss: 0,
      periodBestCaseBudgetProfitLoss: 0,
      periodWorstCaseBudgetProfitLoss: 0,
    };

    allTenantBudgetEntries.forEach(entry => {
      if (entry.type === 'Transfer') return; 

      const occurrences = countOccurrencesInPeriod(entry, currentPeriodStart, currentPeriodEnd);
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

  reportData.chartData.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  return reportData;
}
