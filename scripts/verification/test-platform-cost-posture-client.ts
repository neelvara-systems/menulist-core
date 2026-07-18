import assert from 'node:assert/strict';
import { getPlatformCostPosture } from '../../src/database/ops/costPosture';
import type { PlatformCostPostureData } from '../../src/lib/ops/costPostureTypes';

const originalFetch = globalThis.fetch;

const validData: PlatformCostPostureData = {
  generatedAt: '2026-07-31T23:59:59.999Z',
  periodDays: 30,
  periodStart: '2026-07-01T23:59:59.999Z',
  status: 'setup_required',
  billingExport: {
    status: 'pending',
    dataset: 'menulist.cloud_billing_export',
    docHref: '/__docs__/production-readiness/launch-prerequisites.md',
    details: 'Pending setup.',
    blocksBillForecast: true,
  },
  safeMode: {
    active: false,
    reason: null,
    alertsMuted: false,
    alertsMutedUntil: null,
  },
  totals: {
    knownInternalCostPaise: 10,
    knownOwnerChargePaise: 20,
    providerCalls: 1,
    firestoreReadsObserved: 2,
  },
  signals: [],
  alerts: [],
  guardrails: [],
  sourceCoverage: [],
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json' },
    status,
  });
}

async function expectFixedFailure(action: () => Promise<unknown>): Promise<void> {
  await assert.rejects(action, (error: unknown) => {
    assert(error instanceof Error);
    assert.equal(error.message, 'Failed to load platform cost posture');
    return true;
  });
}

async function run(): Promise<void> {
  try {
    const controller = new AbortController();
    let capturedUrl = '';
    let capturedSignal: AbortSignal | null | undefined;
    globalThis.fetch = (async (input, init) => {
      capturedUrl = String(input);
      capturedSignal = init?.signal;
      return jsonResponse({ data: validData });
    }) as typeof fetch;

    const result = await getPlatformCostPosture(30, { signal: controller.signal });
    assert.equal(result.periodDays, 30);
    assert.equal(capturedUrl, '/api/platform/cost-posture?days=30');
    assert.equal(capturedSignal, controller.signal);

    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      return jsonResponse({ data: validData });
    }) as typeof fetch;
    await expectFixedFailure(() => getPlatformCostPosture(0));
    await expectFixedFailure(() => getPlatformCostPosture(Number.NaN));
    await expectFixedFailure(() => getPlatformCostPosture(1.5));
    assert.equal(fetchCalls, 0, 'invalid client lookbacks must fail before network access');

    globalThis.fetch = (async () => jsonResponse({
      data: { ...validData, periodDays: 7 },
    })) as typeof fetch;
    await expectFixedFailure(() => getPlatformCostPosture(30));

    globalThis.fetch = (async () => jsonResponse({
      data: {
        ...validData,
        totals: { ...validData.totals, knownInternalCostPaise: -1 },
      },
    })) as typeof fetch;
    await expectFixedFailure(() => getPlatformCostPosture(30));

    globalThis.fetch = (async () => jsonResponse({
      data: {
        ...validData,
        safeMode: { ...validData.safeMode, alertsMutedUntil: 'not-a-date' },
      },
    })) as typeof fetch;
    await expectFixedFailure(() => getPlatformCostPosture(30));

    globalThis.fetch = (async () => jsonResponse({
      data: {
        ...validData,
        generatedAt: '2026-07-01T00:00:00.000Z',
        periodStart: '2026-07-02T00:00:00.000Z',
      },
    })) as typeof fetch;
    await expectFixedFailure(() => getPlatformCostPosture(30));

    globalThis.fetch = (async () => jsonResponse({ error: 'private details' }, 500)) as typeof fetch;
    await expectFixedFailure(() => getPlatformCostPosture(30));
  } finally {
    globalThis.fetch = originalFetch;
  }
}

void run().then(() => {
  console.log('Platform Cost Posture client contract tests passed');
});
