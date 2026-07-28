export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import {
  getCurrentPlatformUser,
  resolveCurrentSessionUserDocumentId,
} from '@lib/auth/currentPlatformUser';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { getBoundedOpsStringContext, logOpsFailure } from '@lib/ops/opsDiagnostics';
import type {
  WebsiteEnquiryKind,
  WebsiteEnquiryKindFilter,
  WebsiteEnquiryOpsCost,
  WebsiteEnquiryOpsSnapshot,
  WebsiteEnquiryRow,
  WebsiteEnquiryTopic,
  WebsiteEnquiryTopicFilter,
} from '@lib/ops/websiteEnquiryTypes';
import { normalizePublicContactSourcePath } from '@lib/publicContact/contactBoundary';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getBoundedSecurityRouteContext } from '@lib/security/securityDiagnostics';
import { validateAPIInput } from '@lib/security/inputValidation';
import { logger } from '@lib/monitoring/logger';
import { NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';

const KINDS: [WebsiteEnquiryKind, ...WebsiteEnquiryKind[]] = ['general', 'report'];
const KIND_FILTERS: [WebsiteEnquiryKindFilter, ...WebsiteEnquiryKindFilter[]] = ['all', ...KINDS];
const TOPICS: [WebsiteEnquiryTopic, ...WebsiteEnquiryTopic[]] = [
  'general',
  'demo',
  'multi-location',
  'pricing',
  'other',
];
const TOPIC_FILTERS: [WebsiteEnquiryTopicFilter, ...WebsiteEnquiryTopicFilter[]] = ['all', ...TOPICS];
const WEBSITE_ENQUIRY_OPS_RATE_LIMIT_KEY = 'website-enquiries-ops';
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

const WebsiteEnquiryQuerySchema = z.object({
  kind: z.enum(KIND_FILTERS).default('all'),
  topic: z.enum(TOPIC_FILTERS).default('all'),
  limit: z.coerce.number().int().min(5).max(60).default(40),
});

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

function getSourceContext(data: FirebaseFirestore.DocumentData): Record<string, unknown> {
  return data.sourceContext && typeof data.sourceContext === 'object' && !Array.isArray(data.sourceContext)
    ? data.sourceContext as Record<string, unknown>
    : {};
}

function getKind(data: FirebaseFirestore.DocumentData): WebsiteEnquiryKind {
  const sourceContext = getSourceContext(data);
  return data.sourceKind === 'shareable_tool_report'
    || sourceContext.sourceKind === 'shareable_tool_report'
    ? 'report'
    : 'general';
}

function getTopic(value: unknown): WebsiteEnquiryTopic {
  const normalized = cleanOpsText(value, 40);
  return TOPICS.includes(normalized as WebsiteEnquiryTopic)
    ? normalized as WebsiteEnquiryTopic
    : 'general';
}

function serializeEnquiry(
  doc: FirebaseFirestore.QueryDocumentSnapshot,
): WebsiteEnquiryRow | null {
  const data = doc.data();
  if (cleanOpsText(data.source, 80) !== 'menulist_public_contact') return null;

  const sourceContext = getSourceContext(data);
  return {
    id: doc.id,
    kind: getKind(data),
    status: cleanOpsText(data.status || 'new', 40) || 'new',
    contactName: cleanOpsText(data.name, 120) || null,
    workEmail: cleanOpsText(data.workEmail, 180) || null,
    phoneNumber: cleanOpsText(data.phoneNumber, 40) || null,
    helpTopic: getTopic(data.helpTopic),
    sourcePath: normalizePublicContactSourcePath(data.sourcePath),
    sourceToolId: cleanOpsText(data.sourceToolId || sourceContext.toolId, 80) || null,
    message: cleanOpsText(data.message, 2000),
    createdAt: toIso(data.createdOn || data.createdAt),
    modifiedAt: toIso(data.modifiedOn || data.updatedAt),
  };
}

async function checkWebsiteEnquiryOpsRateLimit(operatorId: string) {
  const rateLimitConfig = getRateLimitForFeature('DATA_READ');
  const operatorRateLimitHash = hashPublicRateLimitValue(operatorId);
  const rateLimit = await checkRateLimit({
    key: `${WEBSITE_ENQUIRY_OPS_RATE_LIMIT_KEY}:${operatorRateLimitHash}`,
    failClosedOnProviderError: process.env.NODE_ENV === 'production',
    ...rateLimitConfig,
  });

  if (rateLimit.allowed) return null;

  const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
  return NextResponse.json(
    { error: 'Too many website enquiry requests. Please try again later.' },
    {
      headers: {
        'Cache-Control': 'no-store',
        'Retry-After': String(retryAfter),
      },
      status: 429,
    },
  );
}

export const GET = withAuth(async (request, session) => {
  if (!FEATURE_FLAGS.ENABLE_WEBSITE_CONTACT_ENQUIRY_OPS_DASHBOARD) {
    return NextResponse.json(
      { error: 'Website enquiry dashboard is disabled' },
      { headers: NO_STORE_HEADERS, status: 404 },
    );
  }

  const query = validateAPIInput(
    WebsiteEnquiryQuerySchema,
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  if (query.success === false) {
    logger.security('Website Enquiry Ops Query Validation Failed', {
      ...getBoundedSecurityRouteContext(session, request),
      endpoint: request.nextUrl.pathname,
      error: query.error,
    }, 'medium');
    return NextResponse.json(
      { error: 'Invalid query parameters' },
      { headers: NO_STORE_HEADERS, status: 400 },
    );
  }

  const operatorId = resolveCurrentSessionUserDocumentId(session);
  if (!operatorId) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { headers: NO_STORE_HEADERS, status: 403 },
    );
  }
  const rateLimitResponse = await checkWebsiteEnquiryOpsRateLimit(operatorId);
  if (rateLimitResponse) return rateLimitResponse;

  const { kind, topic, limit } = query.data;
  const scanLimit = Math.min(Math.max(limit * 3, 60), 120);
  const cost: WebsiteEnquiryOpsCost = {
    authReads: 1,
    enquiryReads: 0,
    writes: 0,
    scanLimit,
    note: 'Manual refresh only. No realtime listener or write. The route reads one current platform-user record and a bounded recent enquiry query.',
  };

  try {
    const currentPlatformUser = await getCurrentPlatformUser(session);
    if (!currentPlatformUser) {
      logger.security('Authorization Failed - Website Enquiry Current Platform Role', {
        ...getBoundedSecurityRouteContext(session, request),
        endpoint: request.nextUrl.pathname,
      }, 'high');
      return NextResponse.json(
        { error: 'Forbidden' },
        { headers: NO_STORE_HEADERS, status: 403 },
      );
    }

    const snapshot = await firestoreAdmin
      .collection(DB_COLLECTIONS.LANDING_PAGE_ENQUIRIES)
      .orderBy('createdOn', 'desc')
      .limit(scanLimit)
      .get();
    cost.enquiryReads = snapshot.size;

    const menuListEnquiries = snapshot.docs
      .map(serializeEnquiry)
      .filter((enquiry): enquiry is WebsiteEnquiryRow => Boolean(enquiry));
    const filteredEnquiries = menuListEnquiries
      .filter((enquiry) => kind === 'all' || enquiry.kind === kind)
      .filter((enquiry) => topic === 'all' || enquiry.helpTopic === topic)
      .slice(0, limit);

    const body: WebsiteEnquiryOpsSnapshot = {
      generatedAt: new Date().toISOString(),
      feature: {
        dashboardEnabled: true,
        accessModel: 'platform_role',
        realtimeListeners: false,
        scanMayBeIncomplete: snapshot.size >= scanLimit,
      },
      filters: { kind, topic, limit, scanLimit },
      counts: {
        scannedEnquiries: snapshot.size,
        menuListEnquiriesInScan: menuListEnquiries.length,
        shown: filteredEnquiries.length,
        new: filteredEnquiries.filter((enquiry) => enquiry.status === 'new').length,
        general: filteredEnquiries.filter((enquiry) => enquiry.kind === 'general').length,
        report: filteredEnquiries.filter((enquiry) => enquiry.kind === 'report').length,
      },
      enquiries: filteredEnquiries,
      cost,
    };

    return NextResponse.json(body, {
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    logOpsFailure('website_enquiry_ops_route_failed', error, {
      ...getBoundedOpsStringContext('userId', operatorId),
      ...getBoundedOpsStringContext('requestPath', request.nextUrl.pathname),
      ...getBoundedOpsStringContext('kind', kind),
      ...getBoundedOpsStringContext('topic', topic),
      limit,
      scanLimit,
    });
    return NextResponse.json(
      { error: 'Failed to load website enquiries' },
      { headers: NO_STORE_HEADERS, status: 500 },
    );
  }
}, { requiredPlatformRole: 'PLATFORM' });
