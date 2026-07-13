import { DB_COLLECTIONS } from '@constant/database';
import type { DocumentReference, Firestore } from 'firebase-admin/firestore';

export const MENU_EXTRACTION_ACTIVE_JOB_STATUSES = [
  'pending',
  'processing',
  'preview_ready',
] as const;

export type ActiveMenuExtractionJobMatch = {
  data: Record<string, unknown>;
  id: string;
};

export async function createOrReuseActiveMenuExtractionJob(params: {
  db: Firestore;
  additionalCreates?: ReadonlyArray<{
    data: Record<string, unknown>;
    ref: DocumentReference;
  }>;
  jobData: Record<string, unknown>;
  jobRef?: DocumentReference;
  projectId: string;
}): Promise<{ created: boolean; match: ActiveMenuExtractionJobMatch }> {
  const jobs = params.db.collection(DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS);

  return params.db.runTransaction(async (transaction) => {
    const activeQuery = jobs
      .where('projectId', '==', params.projectId)
      .where('status', 'in', MENU_EXTRACTION_ACTIVE_JOB_STATUSES)
      .limit(1);
    const activeSnapshot = await transaction.get(activeQuery);
    const existing = activeSnapshot.docs[0];
    if (existing) {
      return {
        created: false,
        match: { id: existing.id, data: existing.data() || {} },
      };
    }

    const jobRef = params.jobRef || jobs.doc();
    transaction.create(jobRef, params.jobData);
    for (const additionalCreate of params.additionalCreates || []) {
      transaction.create(additionalCreate.ref, additionalCreate.data);
    }
    return {
      created: true,
      match: { id: jobRef.id, data: params.jobData },
    };
  });
}
