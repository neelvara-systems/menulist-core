const MAX_ANIMATED_BUBBLE_COUNT = 100;

export const normalizeAnimatedBubbleCount = (count: number): number => {
  if (!Number.isFinite(count)) return 0;
  return Math.min(Math.max(Math.trunc(count), 0), MAX_ANIMATED_BUBBLE_COUNT);
};

export const normalizeAnimationDimension = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(value, 10_000);
};
