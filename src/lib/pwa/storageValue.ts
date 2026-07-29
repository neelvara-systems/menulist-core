export function parseCanonicalPwaTimestamp(
  value: unknown,
  now = Date.now(),
): number | null {
  if (
    typeof value !== 'string'
    || !/^[1-9]\d*$/.test(value)
    || !Number.isSafeInteger(now)
    || now < 0
  ) return null;
  const timestamp = Number(value);
  return Number.isSafeInteger(timestamp) && timestamp <= now ? timestamp : null;
}

export function parseCanonicalPwaCount(
  value: unknown,
  maximum: number,
): number | null {
  if (
    typeof value !== 'string'
    || !/^(?:0|[1-9]\d*)$/.test(value)
    || !Number.isSafeInteger(maximum)
    || maximum < 0
  ) return null;
  const count = Number(value);
  return Number.isSafeInteger(count) && count <= maximum ? count : null;
}
