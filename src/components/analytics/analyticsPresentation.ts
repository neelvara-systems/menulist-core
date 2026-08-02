export const normalizeAnalyticsPercentage = (value: number, total: number): number => {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.min(Math.max((value / total) * 100, 0), 100);
};
