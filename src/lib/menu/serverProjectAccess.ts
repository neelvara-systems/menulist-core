import { DB_COLLECTIONS } from '@constant/database';
import { admin } from '@lib/firebase/firebaseAdmin';
import { isPlatformEntityBlocked } from '@lib/platform/entityBlock';
import {
    normalizeMultiOutletNumericDocumentId,
    normalizeMultiOutletProjectId,
} from '@lib/multiOutlet/projectIdBoundary';
import { getOutletSessionScope } from '@lib/multiOutlet/outletSessionScope';

export async function getSessionProjectAccessBlockReason({
    projectId,
    session,
}: {
    projectId: unknown;
    session: unknown;
}): Promise<string | null> {
    const sessionScope = getOutletSessionScope(session);
    const tenantScope = normalizeMultiOutletNumericDocumentId(sessionScope?.tenantDocumentId);
    const storeScope = normalizeMultiOutletNumericDocumentId(sessionScope?.storeDocumentId);
    const projectScope = normalizeMultiOutletProjectId(projectId);

    if (!tenantScope || !storeScope) return 'Store access is required';
    if (
        !projectScope
        || projectScope.tId !== tenantScope.numericId
        || projectScope.sId !== storeScope.numericId
    ) {
        return 'Project not found';
    }

    const projectSnapshot = await admin.firestore()
        .doc(`${DB_COLLECTIONS.PROJECTS}/${tenantScope.documentId}/${storeScope.documentId}/${projectScope.projectId}`)
        .get();
    const project = projectSnapshot.data();
    if (
        !projectSnapshot.exists
        || project?.deleted === true
        || isPlatformEntityBlocked(project)
    ) {
        return 'Project not found';
    }

    return null;
}
