export type CostPostureSourceRecord = Record<string, unknown>;

export type CostPostureTimestampParseFailureHandler = (
  source: string,
  value: unknown,
  error: unknown,
) => void;

export interface CostPostureSignalAggregate {
  count: number;
  realCostPaise: number;
  ownerChargePaise: number;
  providerCalls: number;
  firestoreReadsObserved: number;
  latestAt: string | null;
}

function toValidDate(value: unknown): Date | null {
  return value instanceof Date && Number.isFinite(value.getTime()) ? value : null;
}

export function parseCostPostureDate(
  value: unknown,
  source = 'unknown',
  onFailure?: CostPostureTimestampParseFailureHandler,
): Date | null {
  if (value === null || value === undefined) return null;

  try {
    if (typeof value === 'object') {
      const timestampLike = value as { seconds?: unknown; toDate?: unknown };
      if (typeof timestampLike.toDate === 'function') {
        return toValidDate(timestampLike.toDate());
      }
      if (typeof timestampLike.seconds === 'number' && Number.isFinite(timestampLike.seconds)) {
        return toValidDate(new Date(timestampLike.seconds * 1000));
      }
    }

    if (value instanceof Date) return toValidDate(value);
    if (typeof value === 'number' && Number.isFinite(value)) return toValidDate(new Date(value));
    if (typeof value === 'string' && value.trim() === value && value.length > 0) {
      return toValidDate(new Date(value));
    }
  } catch (error) {
    onFailure?.(source, value, error);
  }

  return null;
}

export function getCostPostureDocumentDate(
  data: CostPostureSourceRecord,
  onFailure?: CostPostureTimestampParseFailureHandler,
): Date | null {
  return parseCostPostureDate(data.createdAt, 'createdAt', onFailure)
    || parseCostPostureDate(data.createdOn, 'createdOn', onFailure)
    || parseCostPostureDate(data.created_at, 'created_at', onFailure)
    || parseCostPostureDate(data.timestamp, 'timestamp', onFailure)
    || parseCostPostureDate(data.modifiedOn, 'modifiedOn', onFailure);
}

export function readNonNegativeFiniteNumber(value: unknown): number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= 0
    && value <= Number.MAX_SAFE_INTEGER
    ? value
    : 0;
}

export function readNonNegativeSafeInteger(value: unknown): number {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
    ? value
    : 0;
}

function readOptionalNonNegativeInteger(value: unknown): number | null {
  return readNonNegativeSafeInteger(value) === value ? value as number : null;
}

function addWithoutOverflow(current: number, value: number): number {
  const next = current + value;
  return Number.isFinite(next) && next <= Number.MAX_SAFE_INTEGER ? next : current;
}

function getLatestIso(current: string | null, candidate: Date): string {
  const candidateIso = candidate.toISOString();
  if (!current) return candidateIso;
  return candidate.getTime() > new Date(current).getTime() ? candidateIso : current;
}

function createEmptyAggregate(): CostPostureSignalAggregate {
  return {
    count: 0,
    realCostPaise: 0,
    ownerChargePaise: 0,
    providerCalls: 0,
    firestoreReadsObserved: 0,
    latestAt: null,
  };
}

export function summarizeExtractionCostRecords(
  records: CostPostureSourceRecord[],
  periodStartMs: number,
  periodEndMs: number,
  onTimestampFailure?: CostPostureTimestampParseFailureHandler,
): CostPostureSignalAggregate {
  const aggregate = createEmptyAggregate();

  records.forEach((data) => {
    const date = getCostPostureDocumentDate(data, onTimestampFailure);
    if (!date || date.getTime() < periodStartMs || date.getTime() > periodEndMs) return;

    aggregate.count += 1;
    aggregate.realCostPaise = addWithoutOverflow(
      aggregate.realCostPaise,
      readNonNegativeFiniteNumber(data.realCostPaise),
    );
    const ownerChargePaise = data.ownerChargePaise !== null && data.ownerChargePaise !== undefined
      ? readNonNegativeFiniteNumber(data.ownerChargePaise)
      : data.ourChargePaise !== null && data.ourChargePaise !== undefined
        ? readNonNegativeFiniteNumber(data.ourChargePaise)
        : readNonNegativeFiniteNumber(data.totalCharge);
    aggregate.ownerChargePaise = addWithoutOverflow(aggregate.ownerChargePaise, ownerChargePaise);
    aggregate.providerCalls = addWithoutOverflow(
      aggregate.providerCalls,
      readOptionalNonNegativeInteger(data.providerCallCount) ?? 1,
    );
    aggregate.latestAt = getLatestIso(aggregate.latestAt, date);
  });

  return aggregate;
}

export function summarizeBusinessHealthCostRecords(
  records: CostPostureSourceRecord[],
  periodStartMs: number,
  periodEndMs: number,
  onTimestampFailure?: CostPostureTimestampParseFailureHandler,
): CostPostureSignalAggregate {
  const aggregate = createEmptyAggregate();

  records.forEach((data) => {
    const date = getCostPostureDocumentDate(data, onTimestampFailure);
    if (!date || date.getTime() < periodStartMs || date.getTime() > periodEndMs) return;

    aggregate.count += 1;
    aggregate.realCostPaise = addWithoutOverflow(
      aggregate.realCostPaise,
      readNonNegativeFiniteNumber(data.realCostPaise),
    );
    aggregate.ownerChargePaise = addWithoutOverflow(
      aggregate.ownerChargePaise,
      readNonNegativeFiniteNumber(data.ownerChargePaise),
    );
    aggregate.providerCalls = addWithoutOverflow(
      aggregate.providerCalls,
      data.providerUsed === true ? 1 : 0,
    );
    aggregate.firestoreReadsObserved = addWithoutOverflow(
      aggregate.firestoreReadsObserved,
      readNonNegativeSafeInteger(data.firestoreReadCount),
    );
    aggregate.latestAt = getLatestIso(aggregate.latestAt, date);
  });

  return aggregate;
}
