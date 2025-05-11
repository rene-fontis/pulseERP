
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

  if (entry.recurrence === 'Weekly') {
    console.log(`[countOccurrencesInPeriod DEBUG WEEKLY] Entry: ${entry.description}, ID: ${entry.id}`);
    console.log(`  - Period: ${format(periodStart, 'P')} to ${format(periodEnd, 'P')}`);
    console.log(`  - Entry Dates: Start=${format(entryStartDate, 'P')}, End=${entryOwnEndDate ? format(entryOwnEndDate, 'P') : 'None'}`);
  }

  if (entryOwnEndDate && isBefore(entryOwnEndDate, periodStart)) {
    if (entry.recurrence === 'Weekly') console.log(`  - Ended before period start. Occurrences: 0`);
    return 0;
  }
  if (isAfter(entryStartDate, periodEnd)) {
    if (entry.recurrence === 'Weekly') console.log(`  - Starts after period end. Occurrences: 0`);
    return 0;
  }

  if (!entry.isRecurring || entry.recurrence === 'None') {
    const singleOccurrence = isWithinInterval(entryStartDate, { start: periodStart, end: periodEnd }) ? 1 : 0;
    if (entry.recurrence === 'Weekly') console.log(`  - Non-recurring or 'None'. Occurrences: ${singleOccurrence}`);
    return singleOccurrence;
  }

  let occurrences = 0;
  let currentDate = entryStartDate;
  if (entry.recurrence === 'Weekly') console.log(`  - Initial currentDate: ${format(currentDate, 'P')}`);

  // Advance currentDate to be at or after periodStart for recurring entries
  let advanceLoopCount = 0;
  while (isBefore(currentDate, periodStart)) {
    advanceLoopCount++;
    const prevDate = currentDate;
    switch (entry.recurrence) {
      case 'Weekly': currentDate = addWeeks(currentDate, 1); break;
      case 'Monthly': currentDate = addMonths(currentDate, 1); break;
      case 'Bimonthly': currentDate = addMonths(currentDate, 2); break;
      case 'Quarterly': currentDate = addMonths(currentDate, 3); break;
      case 'EveryFourMonths': currentDate = addMonths(currentDate, 4); break;
      case 'Semiannually': currentDate = addMonths(currentDate, 6); break;
      case 'Yearly': currentDate = addMonths(currentDate, 12); break;
      default:
        if (entry.recurrence === 'Weekly') console.log(`  - Unknown recurrence in advance loop: ${entry.recurrence}. Returning 0.`);
        return 0;
    }
    if (entry.recurrence === 'Weekly') console.log(`  - Advancing: ${format(prevDate, 'P')} -> ${format(currentDate, 'P')}`);
    if (entryOwnEndDate && isAfter(currentDate, entryOwnEndDate)) {
      if (entry.recurrence === 'Weekly') console.log(`  - Ended during advance loop (own end date). Current: ${format(currentDate, 'P')}`);
      break;
    }
    if (advanceLoopCount > 1000) { // Safety break
        if (entry.recurrence === 'Weekly') console.error(`  - Advance loop seems infinite for entry ${entry.id}`);
        return occurrences; // or throw error
    }
  }
  if (entry.recurrence === 'Weekly') console.log(`  - After advance loop, currentDate: ${format(currentDate, 'P')}`);

  // Count occurrences within the period
  let countLoopCount = 0;
  while (isBefore(currentDate, periodEnd) || isEqual(currentDate, periodEnd)) {
    countLoopCount++;
    if (entryOwnEndDate && isAfter(currentDate, entryOwnEndDate)) {
      if (entry.recurrence === 'Weekly') console.log(`  - Ended during count loop (own end date). Current: ${format(currentDate, 'P')}`);
      break;
    }

    // Check if the current occurrence is within the report period
    if (isWithinInterval(currentDate, { start: periodStart, end: periodEnd })) {
      occurrences++;
      if (entry.recurrence === 'Weekly') console.log(`  - COUNTED (${occurrences}): ${format(currentDate, 'P')}`);
    } else {
      // This case should ideally not be hit if currentDate is already advanced past periodEnd by the while condition,
      // but could happen if currentDate aligns with periodStart but is not technically "within" due to time parts (startOfDay helps).
      if (entry.recurrence === 'Weekly') console.log(`  - SKIPPED (not in interval): ${format(currentDate, 'P')}`);
    }
    
    const prevDate = currentDate;
    switch (entry.recurrence) {
      case 'Weekly': currentDate = addWeeks(currentDate, 1); break;
      case 'Monthly': currentDate = addMonths(currentDate, 1); break;
      case 'Bimonthly': currentDate = addMonths(currentDate, 2); break;
      case 'Quarterly': currentDate = addMonths(currentDate, 3); break;
      case 'EveryFourMonths': currentDate = addMonths(currentDate, 4); break;
      case 'Semiannually': currentDate = addMonths(currentDate, 6); break;
      case 'Yearly': currentDate = addMonths(currentDate, 12); break;
      default:
        if (entry.recurrence === 'Weekly') console.log(`  - Unknown recurrence in count loop: ${entry.recurrence}. Returning current occurrences: ${occurrences}.`);
        return occurrences;
    }
    if (entry.recurrence === 'Weekly') console.log(`  - Iterating: ${format(prevDate, 'P')} -> ${format(currentDate, 'P')}`);
     if (isEqual(currentDate, prevDate)) { // Safety break for non-advancing dates
        if (entry.recurrence === 'Weekly') console.error(`  - Date did not advance in count loop for entry ${entry.id}. Current: ${format(currentDate, 'P')}`);
        break;
    }
    if (countLoopCount > 1000) { // Safety break
        if (entry.recurrence === 'Weekly') console.error(`  - Count loop seems infinite for entry ${entry.id}`);
        return occurrences; // or throw error
    }
  }
  if (entry.recurrence === 'Weekly') console.log(`  - Final occurrences for ${entry.description}: ${occurrences}`);
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
  
  console.log(`[calculateBudgetReportData] Calculating tableData for report period: ${format(reportStartDate, 'P')} to ${format(reportEndDate, 'P')}`);
  allTenantBudgetEntries.forEach(entry => {
    if (entry.type === 'Transfer') return;

    if (entry.recurrence === 'Weekly') { // Added specific logging for weekly entries here as well
      console.log(`[calculateBudgetReportData - tableData loop] Processing weekly entry: ${entry.description}, Amount: ${entry.amountActual}`);
    }
    const occurrences = countOccurrencesInPeriod(entry, reportStartDate, reportEndDate);
    if (entry.recurrence === 'Weekly') {
        console.log(`[calculateBudgetReportData - tableData loop] Occurrences for weekly entry "${entry.description}" over FULL report period: ${occurrences}`);
    }

    if (occurrences === 0) return;

    const account = accountMap.get(entry.accountId);
    if (!account || (account.mainType !== 'Revenue' && account.mainType !== 'Expense') ) return;
    
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
    // Ensure the aggregated period does not exceed the overall report boundaries
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
