import { Timestamp } from "firebase/firestore";

const toCanonicalTimestamp = (millis: number): Timestamp | null => (
  Number.isFinite(millis) && millis > 0
    ? Timestamp.fromMillis(millis)
    : null
);

export const normalizeOpsTimestamp = (value: unknown): Timestamp | null => {
  try {
    if (value instanceof Timestamp) return toCanonicalTimestamp(value.toMillis());
    if (value instanceof Date) return toCanonicalTimestamp(value.getTime());
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;

    const timestamp = value as {
      nanoseconds?: unknown;
      seconds?: unknown;
      toMillis?: unknown;
    };
    const toMillis = timestamp.toMillis;
    if (typeof toMillis === "function") {
      return toCanonicalTimestamp(toMillis.call(value));
    }

    const seconds = timestamp.seconds;
    const nanoseconds = timestamp.nanoseconds ?? 0;
    if (
      !Number.isSafeInteger(seconds)
      || Number(seconds) <= 0
      || !Number.isSafeInteger(nanoseconds)
      || Number(nanoseconds) < 0
      || Number(nanoseconds) > 999_999_999
    ) {
      return null;
    }

    const millis = (Number(seconds) * 1000) + Math.floor(Number(nanoseconds) / 1_000_000);
    return Number.isSafeInteger(millis) ? toCanonicalTimestamp(millis) : null;
  } catch {
    return null;
  }
};
