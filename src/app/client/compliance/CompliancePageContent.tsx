/**
 * Compliance Page Content — Async Server Component
 *
 * Renders Privacy Policy or Terms & Conditions pages.
 * SSR for verification bot compatibility.
 *
 * @see __docs__/compliance-pages/compliance-pages_impl.md §6
 */

import { DB_COLLECTIONS } from "@constant/database";
import PublicMenuListAttribution from "@/components/customer/PublicMenuListAttribution";
import { extractComplianceInputs, generateComplianceContent } from "@lib/compliance/templates";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import {
    getStoreByCustomDomain,
    getStoreBySubdomain,
} from "@lib/firestore/clientStoreLookup";
import { getTenantFromHeaders as sharedGetTenantFromHeaders } from "@lib/multiTenant/getTenantFromHeaders";
import { doc, getDoc } from "firebase/firestore";
import { notFound } from "next/navigation";

// ── Store lookup + tenant headers — shared with other client pages ──

async function getTenantFromHeaders() {
    return sharedGetTenantFromHeaders('CompliancePage');
}

interface CompliancePageContentProps {
    type: 'privacy' | 'terms' | 'refund';
}

export default async function CompliancePageContent({ type }: CompliancePageContentProps) {
    const { subdomain, customDomain, tenantType } = await getTenantFromHeaders();

    // Resolve store
    let storeData: any = null;
    if (tenantType === "subdomain" && subdomain) {
        storeData = await getStoreBySubdomain(subdomain);
    } else if (tenantType === "custom" && customDomain) {
        storeData = await getStoreByCustomDomain(customDomain);
    }

    if (!storeData) {
        notFound();
    }

    const sId = storeData.storeId;
    const inputs = extractComplianceInputs(storeData);

    const titleMap: Record<string, string> = {
        privacy: 'Privacy Policy',
        terms: 'Terms & Conditions',
        refund: 'Refund & Cancellation Policy',
    };

    if (!inputs) {
        // Missing required data (no contact info)
        return (
            <ComplianceShell
                title={titleMap[type] || 'Policy'}
                businessName={storeData.name || 'Business'}
            >
                <p style={{ color: '#666', textAlign: 'center', padding: '40px 0' }}>
                    This page is not yet available.
                </p>
            </ComplianceShell>
        );
    }

    // Overrides-only model: always generate system content from template,
    // then check if a custom override exists in Firestore.
    // System content = pure function (zero drift, zero migration).
    const systemContent = generateComplianceContent(type, inputs);
    let content = systemContent;

    try {
        const docRef = doc(firebaseClient, DB_COLLECTIONS.COMPLIANCE_PAGES, String(sId));
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            const overrideFieldMap: Record<string, string> = {
                privacy: 'privacyOverride',
                terms: 'termsOverride',
                refund: 'refundOverride',
            };
            const overrideField = overrideFieldMap[type];
            if (overrideField && data[overrideField]) {
                content = data[overrideField];
            }
        }
    } catch {
        // Firestore error — system content already set as default
    }

    const title = titleMap[type] || 'Policy';
    const businessName = inputs.businessName;

    return (
        <ComplianceShell title={title} businessName={businessName}>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: 14, color: '#333' }}>
                {content}
            </div>
        </ComplianceShell>
    );
}

// ── Shell wrapper ──

function ComplianceShell({
    title,
    businessName,
    children,
}: {
    title: string;
    businessName: string;
    children: React.ReactNode;
}) {
    return (
        <div style={{
            minHeight: '100dvh',
            background: '#fafafa',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>
            <div style={{
                maxWidth: 680,
                margin: '0 auto',
                padding: '40px 20px',
                background: '#fff',
                minHeight: '100dvh',
            }}>
                {/* Header */}
                <div style={{ marginBottom: 32 }}>
                    <h1 style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: '#666',
                        margin: '0 0 4px',
                    }}>
                        {businessName}
                    </h1>
                    <h2 style={{
                        fontSize: 22,
                        fontWeight: 600,
                        color: '#111',
                        margin: 0,
                    }}>
                        {title}
                    </h2>
                </div>

                {/* Content */}
                {children}

                {/* Footer */}
                <footer style={{
                    marginTop: 48,
                    paddingTop: 16,
                    borderTop: '1px solid #eee',
                    textAlign: 'center',
                }}>
                    <PublicMenuListAttribution mode="compact" surfaceLabel="Powered by MenuList" />
                </footer>
            </div>
        </div>
    );
}
