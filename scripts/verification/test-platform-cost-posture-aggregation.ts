import assert from 'node:assert/strict';
import {
  parseCostPostureDate,
  readNonNegativeFiniteNumber,
  readNonNegativeSafeInteger,
  summarizeBusinessHealthCostRecords,
  summarizeExtractionCostRecords,
} from '../../src/lib/ops/costPostureAggregation';

const periodStartMs = Date.parse('2026-07-01T00:00:00.000Z');
const periodEndMs = Date.parse('2026-07-31T23:59:59.999Z');

function testExtractionAggregation(): void {
  const aggregate = summarizeExtractionCostRecords([
    {
      createdAt: new Date('2026-07-10T12:00:00.000Z'),
      totalCharge: 125.5,
    },
    {
      createdAt: { seconds: Date.parse('2026-07-20T12:00:00.000Z') / 1000 },
      ourChargePaise: 180,
      providerCallCount: 3,
      realCostPaise: 75,
      totalCharge: 999,
    },
    {
      createdAt: new Date('2026-07-25T12:00:00.000Z'),
      ownerChargePaise: 220,
      ourChargePaise: 180,
      providerCallCount: 0,
      realCostPaise: 90,
      totalCharge: 999,
    },
    {
      createdAt: new Date('2026-06-30T23:59:59.999Z'),
      realCostPaise: 500,
      totalCharge: 500,
    },
    {
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      realCostPaise: 500,
      totalCharge: 500,
    },
    {
      realCostPaise: 500,
      totalCharge: 500,
    },
    {
      createdAt: new Date('2026-07-30T12:00:00.000Z'),
      ownerChargePaise: -20,
      providerCallCount: -2,
      realCostPaise: '400',
      totalCharge: 400,
    },
  ], periodStartMs, periodEndMs);

  assert.deepEqual(aggregate, {
    count: 4,
    realCostPaise: 165,
    ownerChargePaise: 525.5,
    providerCalls: 5,
    firestoreReadsObserved: 0,
    latestAt: '2026-07-30T12:00:00.000Z',
  });
  assert.equal(aggregate.realCostPaise, 165, 'totalCharge must never substitute for provider cost');
}

function testBusinessHealthAggregation(): void {
  const aggregate = summarizeBusinessHealthCostRecords([
    {
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
      firestoreReadCount: 2,
      ownerChargePaise: 100,
      providerUsed: true,
      realCostPaise: 40,
    },
    {
      createdAt: new Date('2026-07-15T00:00:00.000Z'),
      firestoreReadCount: Number.POSITIVE_INFINITY,
      ownerChargePaise: '200',
      providerUsed: 'true',
      realCostPaise: -1,
    },
    {
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      firestoreReadCount: 20,
      ownerChargePaise: 200,
      providerUsed: true,
      realCostPaise: 80,
    },
  ], periodStartMs, periodEndMs);

  assert.deepEqual(aggregate, {
    count: 2,
    realCostPaise: 40,
    ownerChargePaise: 100,
    providerCalls: 1,
    firestoreReadsObserved: 2,
    latestAt: '2026-07-15T00:00:00.000Z',
  });
}

function testTimestampFailures(): void {
  const failures: string[] = [];
  const throwingTimestamp = {
    toDate() {
      throw new Error('invalid timestamp');
    },
  };

  assert.equal(parseCostPostureDate(throwingTimestamp, 'createdAt', (source) => failures.push(source)), null);
  assert.deepEqual(failures, ['createdAt']);
  assert.equal(parseCostPostureDate(' 2026-07-01T00:00:00.000Z '), null);
  assert.equal(parseCostPostureDate(Number.NaN), null);
}

function testNumericBoundary(): void {
  assert.equal(readNonNegativeFiniteNumber(1.25), 1.25);
  assert.equal(readNonNegativeFiniteNumber(0), 0);
  assert.equal(readNonNegativeFiniteNumber(-1), 0);
  assert.equal(readNonNegativeFiniteNumber('1'), 0);
  assert.equal(readNonNegativeFiniteNumber(Number.POSITIVE_INFINITY), 0);
  assert.equal(readNonNegativeFiniteNumber(Number.MAX_SAFE_INTEGER + 1), 0);
  assert.equal(readNonNegativeSafeInteger(2), 2);
  assert.equal(readNonNegativeSafeInteger(2.5), 0);
  assert.equal(readNonNegativeSafeInteger('2'), 0);

  const overflowAggregate = summarizeExtractionCostRecords([
    { createdAt: new Date('2026-07-10T00:00:00.000Z'), realCostPaise: Number.MAX_SAFE_INTEGER },
    { createdAt: new Date('2026-07-11T00:00:00.000Z'), realCostPaise: 1 },
  ], periodStartMs, periodEndMs);
  assert.equal(overflowAggregate.realCostPaise, Number.MAX_SAFE_INTEGER);
}

testExtractionAggregation();
testBusinessHealthAggregation();
testTimestampFailures();
testNumericBoundary();

console.log('Platform Cost Posture aggregation tests passed');
