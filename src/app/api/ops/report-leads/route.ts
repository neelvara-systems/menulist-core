export const dynamic = 'force-dynamic';

/**
 * Platform-only report lead triage API.
 *
 * Reads existing public contact enquiries tagged by the shareable report
 * follow-up form. It does not store reports, mutate leads, or create history.
 */

import { DB_COLLECTIONS } from '@constant/database';
import { FEATURE_FLAGS } from '@config/features';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { getBoundedOpsStringContext, logOpsFailure } from '@lib/ops/opsDiagnostics';
import type {
  ReportLeadOpsCost,
  ReportLeadOpsSnapshot,
  ReportLeadReportStatus,
  ReportLeadReportStatusFilter,
  ReportLeadRow,
} from '@lib/ops/reportLeadTypes';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { validateAPIInput } from '@lib/security/inputValidation';
import { getBoundedSecurityRouteContext } from '@lib/security/securityDiagnostics';
import { logger } from '@lib/monitoring/logger';
import { NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';

const REPORT_LEAD_STATUSES: [ReportLeadReportStatus, ...ReportLeadReportStatus[]] = [
  'ready',
  'missing_basics',
  'unclear',
  'not_checked',
  'manual_review_needed',
];
const REPORT_LEAD_STATUS_FILTERS: [ReportLeadReportStatusFilter, ...ReportLeadReportStatusFilter[]] = [
  'all',
  ...REPORT_LEAD_STATUSES,
];
const REPORT_LEAD_OPS_RATE_LIMIT_KEY = 'report-leads-ops';
const REPORT_LEAD_ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const ReportLeadQuerySchema = z.object({
  reportStatus: z.enum(REPORT_LEAD_STATUS_FILTERS).default('all'),
  toolId: z.string().trim().max(80).optional().default('all'),
  limit: z.coerce.number().int().min(5).max(60).default(30),
});

const getOperatorId = (session: any) => session?.uId || session?.user?.id || session?.user?.email || 'platform';

function cleanOpsText(value: unknown, max = 260): string {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function toIso(value: any): string | null {
  if (!value) return null;
  try {
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    if (typeof value.seconds === 'number') return new Date(value.seconds * 1000).toISOString();
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }
  } catch {
    return null;
  }
  return null;
}

function cleanCount(value: unknown): number {
  const numberValue = Number(value || 0);
  if (!Number.isFinite(numberValue)) return 0;
  return Math.max(0, Math.min(999, Math.floor(numberValue)));
}

function cleanReportLeadGeneratedAt(value: unknown): string | null {
  const timestamp = cleanOpsText(value, 80);
  if (!timestamp || !REPORT_LEAD_ISO_TIMESTAMP_PATTERN.test(timestamp)) return null;

  const timestampMs = Date.parse(timestamp);
  if (!Number.isFinite(timestampMs)) return null;

  const normalizedTimestamp = new Date(timestampMs).toISOString();
  return normalizedTimestamp === timestamp ? normalizedTimestamp : null;
}

function cleanSetupJobList(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, 6)
    .map((job, index) => {
      const row = job && typeof job === 'object' ? job as Record<string, unknown> : {};
      const label = cleanOpsText(row.label, 160);
      const reason = cleanOpsText(row.reason, 260);
      return {
        id: cleanOpsText(row.id, 80) || `job_${index + 1}`,
        label,
        reason,
      };
    })
    .filter((job) => job.label.length > 0 && job.reason.length > 0);
}

function normalizeReportStatus(value: unknown): ReportLeadReportStatus {
  const normalized = cleanOpsText(value, 80);
  return REPORT_LEAD_STATUSES.includes(normalized as ReportLeadReportStatus)
    ? normalized as ReportLeadReportStatus
    : 'manual_review_needed';
}

function getSourceContext(data: FirebaseFirestore.DocumentData): Record<string, unknown> {
  return data.sourceContext && typeof data.sourceContext === 'object' && !Array.isArray(data.sourceContext)
    ? data.sourceContext as Record<string, unknown>
    : {};
}

function isShareableReportLead(data: FirebaseFirestore.DocumentData): boolean {
  const sourceContext = getSourceContext(data);
  return data.sourceKind === 'shareable_tool_report'
    || sourceContext.sourceKind === 'shareable_tool_report';
}

function buildSuggestedReply(lead: Omit<ReportLeadRow, 'suggestedReply'>): string {
  const business = lead.businessName || 'your business';
  const gaps = [
    lead.missingCount > 0 ? `${lead.missingCount} missing` : null,
    lead.unclearCount > 0 ? `${lead.unclearCount} unclear` : null,
    lead.notCheckedCount > 0 ? `${lead.notCheckedCount} not checked` : null,
  ].filter(Boolean).join(', ') || 'the checked rows';
  const setupJobs = lead.setupJobList.length > 0
    ? [
      'The report gaps become this setup job list:',
      ...lead.setupJobList.map((job) => `- ${job.label}: ${job.reason}`),
      '',
    ]
    : [];

  return [
    `Thanks for sending the MenuList tool report for ${business}.`,
    '',
    `The report points to ${gaps}. The useful next step is to create or clean up one current customer link, then use that link wherever customers already look.`,
    '',
    ...setupJobs,
    setupJobs.length > 0
      ? 'We can turn that job list into owner-confirmed MenuList setup work.'
      : 'We can help clean up the menu/service facts, hours, action links, QR/share readiness, and public page setup inside MenuList.',
    '',
    'This report did not inspect external platforms unless the tool explicitly said it did.',
  ].join('\n');
}

function serializeLead(doc: FirebaseFirestore.QueryDocumentSnapshot): ReportLeadRow | null {
  const data = doc.data();
  if (!isShareableReportLead(data)) return null;

  const sourceContext = getSourceContext(data);
  const sourceToolId = cleanOpsText(data.sourceToolId || sourceContext.toolId || 'unknown-tool', 80) || 'unknown-tool';
  const sourceReportStatus = normalizeReportStatus(data.sourceReportStatus || sourceContext.reportStatus);
  const primaryNumber = data.sourcePrimaryNumber ?? sourceContext.primaryNumber;
  const setupJobList = cleanSetupJobList(sourceContext.setupJobList);

  const baseLead: Omit<ReportLeadRow, 'suggestedReply'> = {
    id: doc.id,
    status: cleanOpsText(data.status || 'new', 40) || 'new',
    sourceToolId,
    sourceReportStatus,
    sourcePrimaryNumber: primaryNumber === null || primaryNumber === undefined ? null : cleanCount(primaryNumber),
    businessName: cleanOpsText(sourceContext.businessName, 140) || null,
    businessContext: cleanOpsText(sourceContext.businessContext, 160) || null,
    reportGeneratedAt: cleanReportLeadGeneratedAt(sourceContext.reportGeneratedAt),
    missingCount: cleanCount(sourceContext.missingCount),
    unclearCount: cleanCount(sourceContext.unclearCount),
    notCheckedCount: cleanCount(sourceContext.notCheckedCount),
    setupJobList,
    contactName: cleanOpsText(data.name, 120) || null,
    workEmail: cleanOpsText(data.workEmail, 180) || null,
    phoneNumber: cleanOpsText(data.phoneNumber, 40) || null,
    helpTopic: cleanOpsText(data.helpTopic, 80) || null,
    sourcePath: cleanOpsText(data.sourcePath, 240) || null,
    messagePreview: cleanOpsText(data.message, 900),
    createdAt: toIso(data.createdOn || data.createdAt),
    modifiedAt: toIso(data.modifiedOn || data.updatedAt),
  };

  return {
    ...baseLead,
    suggestedReply: buildSuggestedReply(baseLead),
  };
}

async function checkReportLeadOpsRateLimit(session: any) {
  const rateLimitConfig = getRateLimitForFeature('DATA_READ');
  const operatorId = getOperatorId(session);
  const operatorRateLimitHash = hashPublicRateLimitValue(operatorId);

  const rateLimit = await checkRateLimit({
    key: `${REPORT_LEAD_OPS_RATE_LIMIT_KEY}:${operatorRateLimitHash}`,
    ...rateLimitConfig,
  });

  if (rateLimit.allowed) return null;

  const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
  return NextResponse.json(
    {
      error: 'Too many report lead requests. Please try again later.',
      retryAfter,
      resetAt: rateLimit.resetAt,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(rateLimitConfig.limit),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(rateLimit.resetAt),
      },
      status: 429,
    },
  );
}

function getCounts(scannedEnquiries: number, reportLeadsInScan: number, leads: ReportLeadRow[]) {
  return {
    scannedEnquiries,
    reportLeadsInScan,
    shown: leads.length,
    ready: leads.filter((lead) => lead.sourceReportStatus === 'ready').length,
    missingBasics: leads.filter((lead) => lead.sourceReportStatus === 'missing_basics').length,
    unclear: leads.filter((lead) => lead.sourceReportStatus === 'unclear').length,
    notChecked: leads.filter((lead) => lead.sourceReportStatus === 'not_checked').length,
    manualReviewNeeded: leads.filter((lead) => lead.sourceReportStatus === 'manual_review_needed').length,
  };
}

export const GET = withAuth(async (request, session) => {
  if (!FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS || !FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_REPORT_LEAD_OPS_DASHBOARD) {
    return NextResponse.json({ error: 'Report lead ops dashboard is disabled' }, { status: 404 });
  }

  const query = validateAPIInput(ReportLeadQuerySchema, Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (query.success === false) {
    logger.security('Report Lead Ops Query Validation Failed', {
      ...getBoundedSecurityRouteContext(session, request),
      endpoint: request.nextUrl.pathname,
      error: query.error,
    }, 'medium');
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
  }

  const rateLimitResponse = await checkReportLeadOpsRateLimit(session);
  if (rateLimitResponse) return rateLimitResponse;

  const { reportStatus, toolId, limit } = query.data;
  const scanLimit = Math.min(Math.max(limit * 4, 40), 120);
  const cost: ReportLeadOpsCost = {
    enquiryReads: 0,
    writes: 0,
    scanLimit,
    note: 'Manual refresh only. No realtime listener. Reads recent landingPageEnquiries and filters report leads in memory to avoid new indexes.',
  };

  try {
    const snapshot = await firestoreAdmin
      .collection(DB_COLLECTIONS.LANDING_PAGE_ENQUIRIES)
      .orderBy('createdOn', 'desc')
      .limit(scanLimit)
      .get();

    cost.enquiryReads = snapshot.size;

    const reportLeadRows = snapshot.docs
      .map(serializeLead)
      .filter((lead): lead is ReportLeadRow => Boolean(lead));

    const filteredRows = reportLeadRows
      .filter((lead) => reportStatus === 'all' || lead.sourceReportStatus === reportStatus)
      .filter((lead) => toolId === 'all' || lead.sourceToolId === toolId)
      .slice(0, limit);

    const body: ReportLeadOpsSnapshot = {
      generatedAt: new Date().toISOString(),
      feature: {
        dashboardEnabled: true,
        accessModel: 'platform_role',
        realtimeListeners: false,
      },
      filters: {
        reportStatus,
        toolId,
        limit,
        scanLimit,
      },
      counts: getCounts(snapshot.size, reportLeadRows.length, filteredRows),
      leads: filteredRows,
      cost,
    };

    return NextResponse.json(body, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    logOpsFailure('report_lead_ops_route_failed', error, {
      ...getBoundedOpsStringContext('userId', getOperatorId(session)),
      ...getBoundedOpsStringContext('requestPath', request.nextUrl.pathname),
      ...getBoundedOpsStringContext('reportStatus', reportStatus),
      ...getBoundedOpsStringContext('toolId', toolId),
      limit,
      scanLimit,
    });
    return NextResponse.json({ error: 'Failed to load report leads' }, { status: 500 });
  }
}, { requiredPlatformRole: 'PLATFORM' });
