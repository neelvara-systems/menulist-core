import { Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import {
  OWNER_BUSINESS_ASSISTANT_DOCS,
  OWNER_BUSINESS_ASSISTANT_SNAPSHOT_RETENTION_DAYS,
} from './constants';
import { invalidateOwnerBusinessAssistantContextPackets } from './contextPacketCacheInvalidation';
import type {
  OwnerBusinessAnalyticsIndexDoc,
  OwnerBusinessHealthCurrentDoc,
  OwnerBusinessMultiLocationStoreSummary,
} from './types';

function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map(stripUndefined)
      .filter((entry) => entry !== undefined);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Timestamp) {
    return value;
  }

  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (nested === undefined) continue;
    result[key] = stripUndefined(nested);
  }
  return result;
}

export async function writeOwnerBusinessHealthDocs(params: {
  db: FirebaseFirestore.Firestore;
  tId: string;
  sId: string;
  localDate: string;
  current: OwnerBusinessHealthCurrentDoc;
  analytics?: OwnerBusinessAnalyticsIndexDoc;
  locationSummary?: OwnerBusinessMultiLocationStoreSummary;
}) {
  const currentDocId = OWNER_BUSINESS_ASSISTANT_DOCS.getCurrent(params.tId, params.sId);
  const snapshotDocId = OWNER_BUSINESS_ASSISTANT_DOCS.getSnapshot(params.tId, params.sId, params.localDate);
  const analyticsIndexDocId = OWNER_BUSINESS_ASSISTANT_DOCS.getAnalyticsIndex(params.tId, params.sId);
  const expiresAt = Timestamp.fromMillis(Date.now() + OWNER_BUSINESS_ASSISTANT_SNAPSHOT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const batch = params.db.batch();
  const currentRef = params.db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(currentDocId);
  const snapshotRef = params.db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(snapshotDocId);

  batch.set(currentRef, stripUndefined({
    ...params.current,
    kind: 'ownerBusinessHealthCurrent',
    expiresAt,
  }) as FirebaseFirestore.DocumentData, { merge: true });
  batch.set(snapshotRef, stripUndefined({
    ...params.current,
    kind: 'ownerBusinessHealthSnapshot',
    snapshotForLocalDate: params.localDate,
    expiresAt,
  }) as FirebaseFirestore.DocumentData, { merge: true });

  let writeCount = 2;
  if (params.analytics) {
    const analyticsRef = params.db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(analyticsIndexDocId);
    batch.set(analyticsRef, stripUndefined({
      ...params.analytics,
      kind: 'ownerBusinessAnalyticsIndex',
      expiresAt,
    }) as FirebaseFirestore.DocumentData, { merge: true });
    writeCount++;
  }

  if (params.locationSummary) {
    const multiLocationRef = params.db
      .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
      .doc(OWNER_BUSINESS_ASSISTANT_DOCS.getMultiLocation(params.tId));
    batch.set(multiLocationRef, stripUndefined({
      version: 1,
      kind: 'ownerBusinessHealthMultiLocation',
      tId: params.tId,
      generatedAt: params.current.generatedAt,
      updatedAt: params.current.generatedAt,
      stores: {
        [params.sId]: params.locationSummary,
      },
    }) as FirebaseFirestore.DocumentData, { merge: true });
    writeCount++;
  }

  await batch.commit();
  await invalidateOwnerBusinessAssistantContextPackets({
    tId: params.tId,
    sId: params.sId,
  });
  return {
    currentDocId,
    snapshotDocId,
    analyticsIndexDocId: params.analytics ? analyticsIndexDocId : undefined,
    writeCount,
  };
}
