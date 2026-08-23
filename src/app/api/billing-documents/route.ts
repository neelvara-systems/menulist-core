import { listMenuListBillingDocuments } from '@lib/billing/billingDocumentServer';
import { canManageBillingMutation } from '@lib/billing/billingAccess';
import { resolveStorePermissionSessionScope } from '@lib/permissions/scopeDocumentId';
import { checkRateLimit } from '@lib/rateLimit';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { withAuth } from 'src/middleware/auth';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, session) => {
    if (!(await canManageBillingMutation(session, request, '/api/billing-documents'))) {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }
    const scope = resolveStorePermissionSessionScope(session);
    if (!scope) return NextResponse.json({ error: 'Billing scope is unavailable.' }, { status: 400 });
    const rateLimit = await checkRateLimit({
        key: `billing-documents:list:${hashPublicRateLimitValue(`${scope.tenantScope.documentId}:${scope.storeScope.documentId}`)}`,
        limit: 60,
        window: 3600,
    });
    if (!rateLimit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });

    const documents = await listMenuListBillingDocuments(
        scope.tenantScope.numericId,
        scope.storeScope.numericId,
    );
    return NextResponse.json({
        documents: documents.map((document) => ({
            documentId: document.documentId,
            documentNumber: document.documentNumber,
            documentType: document.documentType,
            issuedAtMillis: document.issuedAtMillis,
            paymentId: document.paymentId,
            relatedInvoiceNumber: document.relatedInvoiceNumber || null,
            currency: document.currency,
            totalAmount: document.totals.grossAmount,
            deliveryStatus: document.delivery.status,
        })),
    });
});
