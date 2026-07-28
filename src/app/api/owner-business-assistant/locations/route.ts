export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { PERMISSIONS } from '@constant/permissions';
import { resolveExactSessionPlatformRole } from '@lib/auth/sessionPlatformRole';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { parseSummaryStores } from '@lib/firestore/parseSummaryStores';
import { getMappedStoreIdsForUser, isPlatformStoreAccessUser } from '@lib/multiOutlet/storeSwitchAccess';
import { OwnerBusinessAssistantScopeSchema } from '@lib/ownerBusinessAssistant/schemas';
import {
  OWNER_BUSINESS_ASSISTANT_DOCS,
  OWNER_BUSINESS_HEALTH_STATUS_LABELS,
} from '@lib/ownerBusinessAssistant/constants';
import {
  applyOwnerBusinessAssistantRateLimit,
  resolveOwnerAssistantSelectedStoreScope,
} from '@lib/ownerBusinessAssistant/server/apiGuards';
import type {
  OwnerBusinessHealthStatus,
  OwnerBusinessMultiLocationStoreSummary,
} from '@lib/ownerBusinessAssistant/types';
import { requireAnyStorePermissionForStore } from '@lib/permissions/server';
import { getSafeZodValidationDetails } from '@lib/security/inputValidation';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';

const buildSessionUserForStoreAccess = (session: any, sId: string | number) => ({
  ...(session?.user || {}),
  platformRole: resolveExactSessionPlatformRole(session) || undefined,
  storeId: session?.user?.storeId || session?.sId || sId,
  storeIds: session?.user?.storeIds || session?.storeIds,
  stores: session?.user?.stores || session?.stores,
});

const STATUS_RANK: Record<OwnerBusinessHealthStatus, number> = {
  needs_review: 0,
  watch: 1,
  stale: 2,
  insufficient_data: 3,
  not_ready: 4,
  stable: 5,
};
const OWNER_BUSINESS_LOCATIONS_PRIVATE_RESPONSE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
} as const;

const privateJson = (body: unknown, init: ResponseInit = {}) => {
  const headers = new Headers(init.headers);
  Object.entries(OWNER_BUSINESS_LOCATIONS_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
    headers.set(name, value);
  });
  return NextResponse.json(body, { ...init, headers });
};

const isOwnerBusinessHealthStatus = (value: unknown): value is OwnerBusinessHealthStatus =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(OWNER_BUSINESS_HEALTH_STATUS_LABELS, value);

const cleanString = (value: unknown, maxLength: number) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
};

const cleanIdentifierString = (value: unknown, maxLength: number) => {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const trimmed = String(value).trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
};

const cleanActionCount = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), 99) : 0;
};

const cleanSourceFactIds = (value: unknown) => (
  Array.isArray(value)
    ? value
      .map((id) => cleanIdentifierString(id, 120))
      .filter((id): id is string => Boolean(id))
      .slice(0, 20)
    : []
);

const normalizeLocationStore = (value: unknown): OwnerBusinessMultiLocationStoreSummary | null => {
  if (!value || typeof value !== 'object') return null;
  const store = value as Record<string, unknown>;
  const sId = cleanIdentifierString(store.sId, 80);
  if (!sId) return null;

  return {
    sId,
    storeName: cleanString(store.storeName, 120),
    status: isOwnerBusinessHealthStatus(store.status) ? store.status : 'not_ready',
    actionCount: cleanActionCount(store.actionCount),
    lastCheckedAt: cleanString(store.lastCheckedAt, 80) || '',
    localDate: cleanString(store.localDate, 40) || '',
    topReason: cleanString(store.topReason, 180),
    sourceFactIds: cleanSourceFactIds(store.sourceFactIds),
  };
};

export const GET = withAuth(async (request: NextRequest, session) => {
  if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH || !FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_MULTI_LOCATION) {
    return privateJson({ error: 'Feature disabled' }, { status: 404 });
  }

  const rateLimit = await applyOwnerBusinessAssistantRateLimit({
    request,
    session,
    feature: 'DATA_READ',
    keyPrefix: 'owner-business-assistant-locations',
  });
  if (rateLimit) return rateLimit;

  const parsedScope = OwnerBusinessAssistantScopeSchema
    .pick({ storeId: true })
    .safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!parsedScope.success) {
    return privateJson({ error: 'Invalid query', details: getSafeZodValidationDetails(parsedScope.error) }, { status: 400 });
  }

  const scope = resolveOwnerAssistantSelectedStoreScope(request, session, parsedScope.data.storeId);
  if ('error' in scope && scope.error) return scope.error;

  const permissionError = await requireAnyStorePermissionForStore(
    request,
    session,
    [PERMISSIONS.VIEW_ANALYTICS],
    'Business Health locations',
    scope.sId,
    scope.tId,
  );
  if (permissionError) return permissionError;

  const [summarySnap, storesSummarySnap] = await Promise.all([
    firestoreAdmin
      .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
      .doc(OWNER_BUSINESS_ASSISTANT_DOCS.getMultiLocation(scope.tId))
      .get(),
    firestoreAdmin
      .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
      .doc('storesSummary')
      .get(),
  ]);

  const sessionUser = buildSessionUserForStoreAccess(session, scope.sId);
  const mappedStoreIds = getMappedStoreIdsForUser(sessionUser);
  const platformUser = isPlatformStoreAccessUser(sessionUser);
  const currentStoreId = Number(scope.sId);
  if (!mappedStoreIds.size && Number.isFinite(currentStoreId) && currentStoreId > 0) {
    mappedStoreIds.add(currentStoreId);
  }

  const rawStores = summarySnap.exists ? summarySnap.data()?.stores || {} : {};
  const storesSummary = storesSummarySnap.exists ? parseSummaryStores(storesSummarySnap.data()) : {};
  const isActiveStore = (storeId: string | number) => {
    const summary = storesSummary[String(storeId)];
    return summary?.active !== false;
  };
  const stores = Object.values(rawStores)
    .map(normalizeLocationStore)
    .filter((store): store is OwnerBusinessMultiLocationStoreSummary => Boolean(store))
    .filter((store) => isActiveStore(store.sId))
    .filter((store) => platformUser || mappedStoreIds.has(Number(store.sId)))
    .sort((left, right) => {
      if (left.status === right.status) return String(left.storeName || left.sId).localeCompare(String(right.storeName || right.sId));
      return STATUS_RANK[left.status] - STATUS_RANK[right.status];
    });

  return privateJson({
    data: {
      generatedAt: summarySnap.exists ? summarySnap.data()?.generatedAt || null : null,
      stores,
    },
    cache: {
      source: 'fresh_firestore',
      metrics: {
        route: '/api/owner-business-assistant/locations',
        cacheSource: 'fresh_firestore',
        packetProfile: 'multi_location_summary',
        firestoreReadCount: 2,
        firestoreWriteCount: 0,
        sourceFactCount: stores.reduce((sum, store) => sum + store.sourceFactIds.length, 0),
      },
    },
  });
});
