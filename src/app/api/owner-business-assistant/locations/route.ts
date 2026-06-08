export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { PERMISSIONS } from '@constant/permissions';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { parseSummaryStores } from '@lib/firestore/parseSummaryStores';
import { getMappedStoreIdsForUser, isPlatformStoreAccessUser } from '@lib/multiOutlet/storeSwitchAccess';
import { OWNER_BUSINESS_ASSISTANT_DOCS } from '@lib/ownerBusinessAssistant/constants';
import {
  applyOwnerBusinessAssistantRateLimit,
  ensureOwnerAssistantTenantAccess,
  getOwnerAssistantSessionScope,
} from '@lib/ownerBusinessAssistant/server/apiGuards';
import type { OwnerBusinessMultiLocationStoreSummary } from '@lib/ownerBusinessAssistant/types';
import { requireAnyStorePermission } from '@lib/permissions/server';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';

const buildSessionUserForStoreAccess = (session: any, sId: string | number) => ({
  ...(session?.user || {}),
  platformRole: session?.platformRole || session?.user?.platformRole,
  storeId: session?.user?.storeId || session?.sId || sId,
  storeIds: session?.user?.storeIds || session?.storeIds,
  stores: session?.user?.stores || session?.stores,
});

export const GET = withAuth(async (request: NextRequest, session) => {
  if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH) {
    return NextResponse.json({ error: 'Feature disabled' }, { status: 404 });
  }

  const rateLimit = await applyOwnerBusinessAssistantRateLimit({
    request,
    session,
    feature: 'DATA_READ',
    keyPrefix: 'owner-business-assistant-locations',
  });
  if (rateLimit) return rateLimit;

  const permissionError = await requireAnyStorePermission(request, session, [PERMISSIONS.VIEW_ANALYTICS], 'Business Health locations');
  if (permissionError) return permissionError;

  const { tId, sId } = getOwnerAssistantSessionScope(session);
  const accessError = ensureOwnerAssistantTenantAccess(request, session, tId, sId);
  if (accessError) return accessError;

  const [summarySnap, storesSummarySnap] = await Promise.all([
    firestoreAdmin
      .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
      .doc(OWNER_BUSINESS_ASSISTANT_DOCS.getMultiLocation(tId))
      .get(),
    firestoreAdmin
      .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
      .doc('storesSummary')
      .get(),
  ]);

  const sessionUser = buildSessionUserForStoreAccess(session, sId);
  const mappedStoreIds = getMappedStoreIdsForUser(sessionUser);
  const platformUser = isPlatformStoreAccessUser(sessionUser);
  const currentStoreId = Number(sId);
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
    .filter((store: any): store is OwnerBusinessMultiLocationStoreSummary => Boolean(store?.sId))
    .filter((store) => isActiveStore(store.sId))
    .filter((store) => platformUser || mappedStoreIds.has(Number(store.sId)))
    .sort((left, right) => {
      if (left.status === right.status) return String(left.storeName || left.sId).localeCompare(String(right.storeName || right.sId));
      const rank: Record<string, number> = { needs_review: 0, watch: 1, stale: 2, insufficient_data: 3, not_ready: 4, stable: 5 };
      return (rank[left.status] ?? 9) - (rank[right.status] ?? 9);
    });

  return NextResponse.json({
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
