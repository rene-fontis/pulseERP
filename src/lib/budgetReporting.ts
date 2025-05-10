
import type { TenantChartOfAccounts, Budget, BudgetEntry, AccountGroup, AggregationPeriod, BudgetReportData, BudgetReportAccountEntry, BudgetReportChartDataItem } from '@/types';
import { parseISO, format, getYear, getMonth, isWithinInterval, startOfMonth, endOfMonth, addMonths, addYears, differenceInCalendarMonths, differenceInCalendarDays, getISODay } from 'date-fns';
import { de } from 'date-fns/locale';

function countOccurrencesInPeriod(entry: BudgetEntry, periodStart: Date, periodEnd: Date): number {
  if (!entry.isRecurring || entry.recurrence === 'None' || !entry.startDate) {
    // For non-recurring, check if its single date is within the period
    if (!entry.isRecurring && entry.startDate) {
        const singleEntryDate = parseISO(entry.startDate);
        return isWithinInterval(singleEntryDate, { start: periodStart, end: periodEnd }) ? 1 : 0;
    }
    return 0;
  }

  const entryStartDate = parseISO(entry.startDate);
  const entryOwnEndDate = entry.endDate ? parseISO(entry.endDate) : null;
  let count = 0;
  let currentDate = entryStartDate;

  // Adjust currentDate to be the first occurrence >= periodStart
  while (currentDate < periodStart) {
    if (entryOwnEndDate && currentDate > entryOwnEndDate) return 0; // Entire recurrence is before periodStart and also ended
    switch (entry.recurrence) {
      case 'Monthly': currentDate = addMonths(currentDate, 1); break;
      case 'Bimonthly': currentDate = addMonths(currentDate, 2); break;
      case 'Quarterly': currentDate = addMonths(currentDate, 3); break;
      case 'EveryFourMonths': currentDate = addMonths(currentDate, 4); break;
      case 'Semiannually': currentDate = addMonths(currentDate, 6); break;
      case 'Yearly': currentDate = addYears(currentDate, 1); break;
      default: return 0;
    }
  }
  
  // Now count occurrences within the period
  while (currentDate <= periodEnd) {
    if (entryOwnEndDate && currentDate > entryOwnEndDate) break; 
    count++;
    switch (entry.recurrence) {
      case 'Monthly': currentDate = addMonths(currentDate, 1); break;
      case 'Bimonthly': currentDate = addMonths(currentDate, 2); break;
      case 'Quarterly': currentDate = addMonths(currentDate, 3); break;
      case 'EveryFourMonths': currentDate = addMonths(currentDate, 4); break;
      case 'Semiannually': currentDate = addMonths(currentDate, 6); break;
      case 'Yearly': currentDate = addYears(currentDate, 1); break;
      default: return count;
    }
  }
  return count;
}


export function calculateBudgetReportData(
  chartOfAccounts: TenantChartOfAccounts,
  allBudgets: Budget[],
  allBudgetEntries: BudgetEntry[],
  reportStartDate: Date,
  reportEndDate: Date,
  aggregationPeriod: AggregationPeriod = 'monthly' // Currently mainly for chart, table aggregates over full period
): BudgetReportData {
  
  const tableDataMap = new Map<string, BudgetReportAccountEntry>();

  // Initialize tableDataMap with P&L accounts from CoA
  chartOfAccounts.groups.forEach(group => {
    if (group.mainType === 'Revenue' || group.mainType === 'Expense') {
      group.accounts.forEach(account => {
        tableDataMap.set(account.id, {
          accountId: account.id,
          accountNumber: account.number,
          accountName: account.name,
          mainType: group.mainType,
          actualAmount: 0,
          bestCaseAmount: 0,
          worstCaseAmount: 0,
        });
      });
    }
  });

  allBudgetEntries.forEach(entry => {
    const budget = allBudgets.find(b => b.id === entry.budgetId);
    if (!budget) return; // Entry belongs to a budget not in the list, skip

    const accountEntryForTable = tableDataMap.get(entry.accountId);
    if (!accountEntryForTable) return; // Budget entry for an account not in P&L, skip for table

    const occurrences = countOccurrencesInPeriod(entry, reportStartDate, reportEndDate);
    if (occurrences === 0) return; // Entry not active in this period

    const totalAmountForPeriod = entry.amount * occurrences;
    const amountToAdd = entry.type === 'Income' ? totalAmountForPeriod : -totalAmountForPeriod;
    
    // For table data (total over selected period)
    if (budget.scenario === 'Actual') {
      accountEntryForTable.actualAmount += amountToAdd;
      accountEntryForTable.bestCaseAmount += amountToAdd;
      accountEntryForTable.worstCaseAmount += amountToAdd;
    } else if (budget.scenario === 'Best Case') {
      accountEntryForTable.bestCaseAmount += amountToAdd;
    } else if (budget.scenario === 'Worst Case') {
      accountEntryForTable.worstCaseAmount += amountToAdd;
    }
  });

  const tableData = Array.from(tableDataMap.values());

  // Chart Data Calculation (monthly profit/loss for each scenario)
  const chartData: BudgetReportChartDataItem[] = [];
  let currentChartPeriodStart = startOfMonth(reportStartDate);

  while (currentChartPeriodStart <= reportEndDate) {
    const currentChartPeriodEnd = endOfMonth(currentChartPeriodStart);
    const periodLabel = format(currentChartPeriodStart, "MMM yy", { locale: de });

    let monthlyActualProfitLoss = 0;
    let monthlyBestCaseProfitLoss = 0;
    let monthlyWorstCaseProfitLoss = 0;

    allBudgetEntries.forEach(entry => {
      const budget = allBudgets.find(b => b.id === entry.budgetId);
      if (!budget) return;

      const accountForEntry = chartOfAccounts.groups
        .flatMap(g => g.accounts)
        .find(a => a.id === entry.accountId);
      
      if (!accountForEntry) return;
      
      const groupOfAccount = chartOfAccounts.groups.find(g => g.accounts.some(a => a.id === entry.accountId));
      if(!groupOfAccount || (groupOfAccount.mainType !== 'Revenue' && groupOfAccount.mainType !== 'Expense')) return;


      const occurrencesThisMonth = countOccurrencesInPeriod(entry, currentChartPeriodStart, currentChartPeriodEnd);
      if (occurrencesThisMonth === 0) return;

      const monthlyTotalAmount = entry.amount * occurrencesThisMonth;
      const amountToAddForPL = entry.type === 'Income' ? monthlyTotalAmount : -monthlyTotalAmount;

      if (budget.scenario === 'Actual') {
        monthlyActualProfitLoss += amountToAddForPL;
        monthlyBestCaseProfitLoss += amountToAddForPL;
        monthlyWorstCaseProfitLoss += amountToAddForPL;
      } else if (budget.scenario === 'Best Case') {
        monthlyBestCaseProfitLoss += amountToAddForPL;
      } else if (budget.scenario === 'Worst Case') {
        monthlyWorstCaseProfitLoss += amountToAddForPL;
      }
    });
    
    chartData.push({
      periodLabel,
      actualProfitLoss: monthlyActualProfitLoss,
      bestCaseProfitLoss: monthlyBestCaseProfitLoss,
      worstCaseProfitLoss: monthlyWorstCaseProfitLoss,
    });

    currentChartPeriodStart = addMonths(currentChartPeriodStart, 1);
  }

  return { tableData, chartData };
}
