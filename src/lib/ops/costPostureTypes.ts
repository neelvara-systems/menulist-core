export type PlatformCostPostureStatus = 'healthy' | 'watch' | 'action_required' | 'setup_required';

export type PlatformCostSourceStatus = 'available' | 'empty' | 'error' | 'setup_required';

export type PlatformCostGuardrailStatus = 'ok' | 'watch' | 'action_required' | 'setup_required';

export interface PlatformBillingExportStatus {
  status: 'pending' | 'configured' | 'unknown';
  dataset: string;
  docHref: string;
  details: string;
  blocksBillForecast: boolean;
}

export interface PlatformSafeModeStatus {
  active: boolean;
  reason: string | null;
  alertsMuted: boolean;
  alertsMutedUntil: string | null;
}

export interface PlatformCostTotals {
  knownInternalCostPaise: number;
  knownOwnerChargePaise: number;
  providerCalls: number;
  firestoreReadsObserved: number;
}

export interface PlatformCostSignal {
  id: string;
  label: string;
  description: string;
  coverage: string;
  periodLabel: string;
  count: number;
  realCostPaise: number;
  ownerChargePaise: number;
  providerCalls: number;
  firestoreReadsObserved: number;
  latestAt: string | null;
  source: string;
  linkHref: string;
}

export interface PlatformCostAlert {
  id: string;
  title: string;
  severity: string;
  type: string;
  message: string;
  timestamp: string | null;
}

export interface PlatformCostGuardrail {
  id: string;
  label: string;
  status: PlatformCostGuardrailStatus;
  detail: string;
  actionHref: string | null;
}

export interface PlatformCostSourceCoverage {
  id: string;
  label: string;
  status: PlatformCostSourceStatus;
  readLimit: number;
  documentsConsidered: number;
  detail: string;
}

export interface PlatformCostPostureData {
  generatedAt: string;
  periodDays: number;
  periodStart: string;
  status: PlatformCostPostureStatus;
  billingExport: PlatformBillingExportStatus;
  safeMode: PlatformSafeModeStatus;
  totals: PlatformCostTotals;
  signals: PlatformCostSignal[];
  alerts: PlatformCostAlert[];
  guardrails: PlatformCostGuardrail[];
  sourceCoverage: PlatformCostSourceCoverage[];
}

export interface PlatformCostPostureApiResponse {
  data: PlatformCostPostureData;
}
