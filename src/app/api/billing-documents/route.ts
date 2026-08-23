import { listMenuListBillingDocuments } from '@lib/billing/billingDocumentServer';
import { listAnswerlatticeBillingDocuments } from '@lib/billing/answerlatticeBillingDocumentServer';
import { canManageAnswerlatticeBillingMutation, canManageBillingMutation } from '@lib/billing/billingAccess';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { resolveStorePermissionSessionScope } from '@lib/permissions/scopeDocumentId';
import { checkRateLimit } from '@lib/rateLimit';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { withAuth } from 'src/middleware/auth';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, session) => {
    const answerlatticeScope = resolveAnswerlatticeSessionScope(session);
    if (answerlatticeScope) {
        if (!(await canManageAnswerlatticeBillingMutation(session, request))) {
            return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
        }
        const rateLimit = await checkRateLimit({
            key: `billing-documents:list:AL:${hashPublicRateLimitValue(`${answerlatticeScope.tenantId}:${answerlatticeScope.storeId}`)}`,
            limit: 60,
            window: 3600,
        });
        if (!rateLimit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
        const documents = await listAnswerlatticeBillingDocuments(answerlatticeScope.tenantId, answerlatticeScope.storeId);
        return NextResponse.json({ documents: documents.map(toBillingDocumentSummary) });
    }
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
        documents: documents.map(toBillingDocumentSummary),
    });
});

const toBillingDocumentSummary = (document: {
    documentId: string; documentNumber: string; documentType: string; issuedAtMillis: number;
    paymentId: string; relatedInvoiceNumber?: string; currency: string;
    totals: { grossAmount: number }; delivery: { status: string };
}) => ({
    documentId: document.documentId,
    documentNumber: document.documentNumber,
    documentType: document.documentType,
    issuedAtMillis: document.issuedAtMillis,
    paymentId: document.paymentId,
    relatedInvoiceNumber: document.relatedInvoiceNumber || null,
    currency: document.currency,
    totalAmount: document.totals.grossAmount,
    deliveryStatus: document.delivery.status,
});
