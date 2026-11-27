import { z } from 'zod';

/** Item page chart ranges. Ranges longer than hot history also read archived history. */
export const historyRanges = ['7d', '30d', '90d', '1y', 'all'] as const;
export type HistoryRange = (typeof historyRanges)[number];
export const historyRangeSchema = z.enum(historyRanges).catch('7d');
export const historyRangeDays: Record<HistoryRange, number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
  all: null,
};
export const historyRangeLabels: Record<HistoryRange, string> = {
  '7d': '7D',
  '30d': '30D',
  '90d': '90D',
  '1y': '1Y',
  all: 'All',
};
