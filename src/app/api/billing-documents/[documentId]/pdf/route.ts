import { getMenuListBillingDocument } from '@lib/billing/billingDocumentServer';
import { renderMenuListBillingDocumentPdf } from '@lib/billing/billingDocumentPdf';
import { getAnswerlatticeBillingDocument } from '@lib/billing/answerlatticeBillingDocumentServer';
import { renderAnswerlatticeBillingDocumentPdf } from '@lib/billing/answerlatticeBillingDocumentPdf';
import { canManageAnswerlatticeBillingMutation, canManageBillingMutation } from '@lib/billing/billingAccess';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { resolveStorePermissionSessionScope } from '@lib/permissions/scopeDocumentId';
import { checkRateLimit } from '@lib/rateLimit';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { withAuth } from 'src/middleware/auth';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, session, params) => {
    const documentId = typeof params?.documentId === 'string' ? params.documentId : '';
    const answerlatticeScope = resolveAnswerlatticeSessionScope(session);
    if (answerlatticeScope) {
        if (!(await canManageAnswerlatticeBillingMutation(session, request))) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
        const rateLimit = await checkRateLimit({
            key: `billing-documents:pdf:AL:${hashPublicRateLimitValue(`${answerlatticeScope.tenantId}:${answerlatticeScope.storeId}`)}`,
            limit: 60,
            window: 3600,
        });
        if (!rateLimit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
        const document = documentId ? await getAnswerlatticeBillingDocument(documentId) : null;
        if (!document || document.tenantId !== answerlatticeScope.tenantId || document.storeId !== answerlatticeScope.storeId) return NextResponse.json({ error: 'Billing document not found.' }, { status: 404 });
        return billingDocumentPdfResponse(renderAnswerlatticeBillingDocumentPdf(document), document.documentNumber);
    }
    if (!(await canManageBillingMutation(session, request, '/api/billing-documents/[documentId]/pdf'))) {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }
    const scope = resolveStorePermissionSessionScope(session);
    if (!scope || !documentId) return NextResponse.json({ error: 'Billing document not found.' }, { status: 404 });
    const rateLimit = await checkRateLimit({
        key: `billing-documents:pdf:${hashPublicRateLimitValue(`${scope.tenantScope.documentId}:${scope.storeScope.documentId}`)}`,
        limit: 60,
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
    return billingDocumentPdfResponse(renderMenuListBillingDocumentPdf(document), document.documentNumber);
});

const billingDocumentPdfResponse = (pdf: Uint8Array, documentNumber: string) => (
    new NextResponse(Buffer.from(pdf), {
        status: 200,
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${documentNumber}.pdf"`,
            'Cache-Control': 'private, no-store, max-age=0',
            'X-Content-Type-Options': 'nosniff',
        },
    })
);
