import { DateRange, PresetRangeKey } from '../types/stock';
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  subWeeks,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  format,
} from 'date-fns';

export function getPresetDateRange(preset: PresetRangeKey, baseDate: Date = new Date()): DateRange {
  let start: Date;
  let end: Date;
  let label = "Custom Range";

  switch (preset) {
    case "today":
      start = startOfDay(baseDate);
      end = endOfDay(baseDate);
      label = "Today";
      break;
    case "yesterday":
      const yesterday = subDays(baseDate, 1);
      start = startOfDay(yesterday);
      end = endOfDay(yesterday);
      label = "Yesterday";
      break;
    case "this_week":
      start = startOfWeek(baseDate, { weekStartsOn: 1 });
      end = endOfWeek(baseDate, { weekStartsOn: 1 });
      label = "This Week";
      break;
    case "last_week":
      const lastWeek = subWeeks(baseDate, 1);
      start = startOfWeek(lastWeek, { weekStartsOn: 1 });
      end = endOfWeek(lastWeek, { weekStartsOn: 1 });
      label = "Last Week";
      break;
    case "31_days_ago":
      start = startOfDay(subDays(baseDate, 31));
      end = endOfDay(baseDate);
      label = "31 Days Ago";
      break;
    case "this_month":
      start = startOfMonth(baseDate);
      end = endOfMonth(baseDate);
      label = "This Month";
      break;
    case "last_month":
      const lastMonth = subMonths(baseDate, 1);
      start = startOfMonth(lastMonth);
      end = endOfMonth(lastMonth);
      label = "Last Month";
      break;
    case "this_year":
      start = startOfYear(baseDate);
      end = endOfYear(baseDate);
      label = "This Year";
      break;
    case "custom":
    default:
      start = startOfMonth(baseDate);
      end = endOfMonth(baseDate);
      label = "Custom";
      break;
  }

  return {
    startDate: format(start, "yyyy-MM-dd'T'HH:mm:ss"),
    endDate: format(end, "yyyy-MM-dd'T'HH:mm:ss"),
    label,
  };
}

export function formatDateTime(isoString?: string): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "-";
    return format(d, "yyyy-MM-dd HH:mm:ss");
  } catch {
    return isoString;
  }
}

export function formatDateOnly(isoString?: string): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "-";
    return format(d, "yyyy-MM-dd");
  } catch {
    return isoString;
  }
}

export function formatDisplayRange(startDate: string, endDate: string): string {
  try {
    return `${format(new Date(startDate), "yyyy-MM-dd HH:mm")} - ${format(new Date(endDate), "yyyy-MM-dd HH:mm")}`;
  } catch {
    return `${startDate} - ${endDate}`;
  }
}
