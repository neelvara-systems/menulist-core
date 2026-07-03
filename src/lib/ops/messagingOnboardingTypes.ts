export type MessagingOnboardingOpsStatus = 'healthy' | 'degraded' | 'critical' | 'unknown';

export interface MessagingOnboardingOpsHealth {
  id: string | null;
  status: MessagingOnboardingOpsStatus;
  windowStart: string | null;
  windowEnd: string | null;
  runMetrics: {
    inboundProcessed?: number;
    processed?: number;
    errors?: number;
  };
  metrics: {
    sessionsStarted?: number;
    publishedSessions?: number;
    publishRate?: number;
    processingRuns?: number;
    failedEvents?: number;
    eventsByType?: Record<string, number>;
  };
  costs: {
    currency?: string;
    estimatedAiCostInr?: number;
    estimatedCostPerPublishInr?: number;
    targetCostPerPublishInr?: number;
    alertCostPerPublishInr?: number;
  };
  retention: {
    publishedSourceBytesSampled?: number;
    liveSessionsSampled?: number;
    warnBytes?: number;
    criticalBytes?: number;
  };
  alerts: Array<{
    key: string;
    severity: 'warning' | 'critical';
    title: string;
    message: string;
  }>;
}

export interface MessagingOnboardingOpsAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: string | null;
  acknowledged: boolean;
}

export interface MessagingOnboardingOpsEvent {
  id: string;
  eventType: string;
  provider: string;
  sessionId: string;
  sessionState: string;
  userIdMasked: string;
  timestamp: string | null;
  metadata: Record<string, unknown>;
  error?: {
    code?: string;
    retryable?: boolean;
  };
}

export interface MessagingOnboardingOpsSession {
  id: string;
  provider: string;
  state: string;
  providerDisplayIdMasked: string;
  uploadCount: number;
  processingRuns: number;
  updatedAt: string | null;
  createdAt: string | null;
}

export interface MessagingOnboardingOpsSnapshot {
  generatedAt: string;
  feature: {
    dashboardEnabled: boolean;
    providerMode: 'official_cloud_api';
    accessModel: 'platform_role';
  };
  health: MessagingOnboardingOpsHealth;
  webhookWindow: {
    hours: number;
    recentEventsShown: number;
    invalidSignatures: number;
    inboundQueued: number;
    inboundProcessed: number;
    inboundFailed: number;
    messageSent: number;
    messageSendFailed: number;
    providerMediaDownloadFailed: number;
  };
  inboundQueue: {
    pending: number;
    processing: number;
    failed: number;
  };
  sessionsByState: Record<string, number>;
  recentSessions: MessagingOnboardingOpsSession[];
  recentEvents: MessagingOnboardingOpsEvent[];
  recentAlerts: MessagingOnboardingOpsAlert[];
}
