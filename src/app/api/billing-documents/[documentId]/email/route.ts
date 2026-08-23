import {
    getMenuListBillingDocument,
    requestMenuListBillingDocumentDelivery,
} from '@lib/billing/billingDocumentServer';
import { canManageBillingMutation } from '@lib/billing/billingAccess';
import { resolveStorePermissionSessionScope } from '@lib/permissions/scopeDocumentId';
import { checkRateLimit } from '@lib/rateLimit';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { withAuth } from 'src/middleware/auth';
import { NextResponse } from 'next/server';

export const POST = withAuth(async (request, session, params) => {
    if (!(await canManageBillingMutation(session, request, '/api/billing-documents/[documentId]/email'))) {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }
    const scope = resolveStorePermissionSessionScope(session);
    const documentId = typeof params?.documentId === 'string' ? params.documentId : '';
    if (!scope || !documentId) return NextResponse.json({ error: 'Billing document not found.' }, { status: 404 });
    const rateLimit = await checkRateLimit({
        key: `billing-documents:email:${hashPublicRateLimitValue(`${scope.tenantScope.documentId}:${scope.storeScope.documentId}`)}`,
        limit: 5,
        window: 3600,
    });
    if (!rateLimit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });

    const document = await getMenuListBillingDocument(documentId);
    if (
        !document
        || document.tenantId !== scope.tenantScope.numericId
        || document.storeId !== scope.storeScope.numericId
    ) {
        return NextResponse.json({ error: 'Billing document not found.' }, { status: 404 });
    }
    const delivery = await requestMenuListBillingDocumentDelivery(document, ['email']);
    return NextResponse.json({ delivery });
});
