/**
 * Compliance Page Content — Async Server Component
 *
 * Renders Privacy Policy or Terms & Conditions pages.
 * SSR for verification bot compatibility.
 *
 * @see __docs__/compliance-pages/compliance-pages_impl.md §6
 */

import PublicMenuListAttribution from "@/components/customer/PublicMenuListAttribution";
import { getCachedComplianceOverridesServer } from "@database/compliance/server";
import { getBrandName } from "@lib/businessIdentity/names";
import { composeComplianceContent, extractComplianceInputs, generateComplianceContent } from "@lib/compliance/templates";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import {
    getStoreByCustomDomain,
    getStoreBySubdomain,
} from "@lib/firestore/clientStoreLookup";
import { getTenantFromHeaders as sharedGetTenantFromHeaders } from "@lib/multiTenant/getTenantFromHeaders";
import { resolveMenuListAttributionPolicy } from "@lib/platform/menuListBranding";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { LuChevronLeft } from "react-icons/lu";
import { notFound } from "next/navigation";

// ── Store lookup + tenant headers — shared with other client pages ──

async function getTenantFromHeaders() {
    return sharedGetTenantFromHeaders('CompliancePage');
}

interface CompliancePageContentProps {
    type: 'privacy' | 'terms' | 'refund';
    backHref?: string;
}

const PUBLIC_COMPLIANCE_STORE_DOCUMENT_ID_PATTERN = /^\d+$/;

function normalizePublicComplianceStoreDocumentId(value: unknown): string | null {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const documentId = String(value);
    if (!PUBLIC_COMPLIANCE_STORE_DOCUMENT_ID_PATTERN.test(documentId) || !isValidFirestoreDocumentId(documentId)) return null;

    const numericId = Number(documentId);
    return Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId
        ? documentId
        : null;
}

function logComplianceOverrideReadFailure(
    error: unknown,
    context: {
        storeId?: unknown;
        tenantType?: unknown;
        type: CompliancePageContentProps['type'];
        hasCustomDomain: boolean;
        hasSubdomain: boolean;
    },
): void {
    logRuntimeFailure('public_compliance_override_read_failed', error, {
        ...getBoundedRuntimeStringContext('storeId', context.storeId),
        ...getBoundedRuntimeStringContext('tenantType', context.tenantType),
        ...getBoundedRuntimeStringContext('pageType', context.type),
        hasCustomDomain: context.hasCustomDomain,
        hasSubdomain: context.hasSubdomain,
    });
}

export default async function CompliancePageContent({ type, backHref = '/' }: CompliancePageContentProps) {
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

    const sId = storeData.storeId ?? storeData.id;
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
                activePlanType={storeData?.activePlanType}
                title={titleMap[type] || 'Policy'}
                businessName={getBrandName(storeData, 'Business')}
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

    const complianceStoreDocumentId = normalizePublicComplianceStoreDocumentId(sId);
    if (!complianceStoreDocumentId) {
        logComplianceOverrideReadFailure(new Error('public_compliance_invalid_store_scope'), {
            storeId: sId,
            tenantType,
            type,
            hasCustomDomain: Boolean(customDomain),
            hasSubdomain: Boolean(subdomain),
        });
    } else {
        try {
            const data = await getCachedComplianceOverridesServer(complianceStoreDocumentId);
            if (data) {
                const overrideFieldMap: Record<string, string> = {
                    privacy: 'privacyOverride',
                    terms: 'termsOverride',
                    refund: 'refundOverride',
                };
                const overrideField = overrideFieldMap[type];
                const customContent = overrideField
                    ? data[overrideField as keyof typeof data]
                    : null;
                if (typeof customContent === 'string' && customContent) {
                    content = composeComplianceContent(systemContent, customContent);
                }
            }
        } catch (error) {
            logComplianceOverrideReadFailure(error, {
                storeId: sId,
                tenantType,
                type,
                hasCustomDomain: Boolean(customDomain),
                hasSubdomain: Boolean(subdomain),
            });
            // Firestore error — system content already set as default
        }
    }

    const title = titleMap[type] || 'Policy';
    const businessName = inputs.businessName;
    const logoUrl = storeData?.logo || null;

    return (
        <ComplianceShell
            activePlanType={storeData?.activePlanType}
            title={title}
            businessName={businessName}
            logoUrl={logoUrl}
            backHref={backHref}
        >
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: 14, color: '#333' }}>
                {content}
            </div>
        </ComplianceShell>
    );
}

// ── Shell wrapper ──

function ComplianceShell({
    activePlanType,
    title,
    businessName,
    logoUrl,
    backHref = '/',
    children,
}: {
    activePlanType?: string | null;
    title: string;
    businessName: string;
    logoUrl?: string | null;
    backHref?: string;
    children: React.ReactNode;
}) {
    const showMenuListAttribution = resolveMenuListAttributionPolicy({ activePlanType }).showAttribution;

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
                <div style={{
                    marginBottom: 24,
                    paddingBottom: 20,
                    borderBottom: '1px solid #f0f0f0',
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        marginBottom: 16,
                    }}>
                        <a
                            aria-label="Back"
                            href={backHref}
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid #e5e5e5',
                                color: '#222',
                                textDecoration: 'none',
                                flex: '0 0 auto',
                            }}
                        >
                            <LuChevronLeft size={18} />
                        </a>
                        {logoUrl ? (
                            <img
                                src={logoUrl}
                                alt={`${businessName} logo`}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 999,
                                    objectFit: 'cover',
                                    border: '1px solid #eee',
                                    background: '#fafafa',
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 999,
                                    border: '1px solid #eee',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 18,
                                    fontWeight: 600,
                                    color: '#444',
                                    background: '#f4f4f4',
                                }}
                                aria-hidden="true"
                            >
                                {businessName?.slice(0, 1).toUpperCase() || 'B'}
                            </div>
                        )}
                        <div>
                            <h1 style={{
                                fontSize: 16,
                                fontWeight: 600,
                                color: '#111',
                                margin: 0,
                                lineHeight: 1.2,
                            }}>
                                {businessName}
                            </h1>
                        </div>
                    </div>
                </div>
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
                {showMenuListAttribution ? (
                <footer style={{
                    marginTop: 48,
                    paddingTop: 16,
                    borderTop: '1px solid #eee',
                    textAlign: 'center',
                }}>
                    <PublicMenuListAttribution
                        activePlanType={activePlanType}
                        mode="compact"
                        surfaceLabel="Powered by MenuList"
                    />
                </footer>
                ) : null}
            </div>
        </div>
    );
}
