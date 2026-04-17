/**
 * Compliance Page Content — Async Server Component
 *
 * Renders Privacy Policy or Terms & Conditions pages.
 * SSR for verification bot compatibility.
 *
 * @see __docs__/compliance-pages/compliance-pages_impl.md §6
 */

import { DB_COLLECTIONS } from "@constant/database";
import { extractComplianceInputs, generateComplianceContent } from "@lib/compliance/templates";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { resolveDomain } from "@lib/multiTenant/domainResolver";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    query,
    where,
} from "firebase/firestore";
import { unstable_cache } from "next/cache";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";

// ── Store lookup (same patterns as OBP) ──

const getStoreBySubdomain = cache(
    unstable_cache(
        async (subdomain: string) => {
            const storesRef = collection(firebaseClient, DB_COLLECTIONS.STORES);
            const q = query(
                storesRef,
                where("subdomain", "==", subdomain.toLowerCase()),
                where("active", "==", true),
                limit(1),
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;
            return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        },
        ['compliance-store-subdomain'],
        { revalidate: 60, tags: ['client-stores'] }
    )
);

const getStoreByCustomDomain = cache(
    unstable_cache(
        async (domain: string) => {
            const storesRef = collection(firebaseClient, DB_COLLECTIONS.STORES);
            const q = query(
                storesRef,
                where("customDomain", "==", domain.toLowerCase()),
                where("domainVerified", "==", true),
                where("active", "==", true),
                limit(1),
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;
            return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        },
        ['compliance-store-custom-domain'],
        { revalidate: 60, tags: ['client-stores'] }
    )
);

async function getTenantFromHeaders() {
    const headersList = headers();
    const tenantSubdomain = headersList.get("x-tenant-subdomain");
    const tenantCustomDomain = headersList.get("x-tenant-custom-domain");
    const tenantTypeHeader = headersList.get("x-tenant-type");

    // Multiple fallback headers for host detection (Vercel + standard)
    const requestHost =
        headersList.get("x-forwarded-host") ||      // Standard proxy header
        headersList.get("host") ||                   // Standard host header
        headersList.get("x-vercel-proxied-host") ||  // Vercel specific
        headersList.get("x-vercel-deployment-url") || // Vercel deployment URL
        process.env.VERCEL_URL;                      // Vercel env fallback

    const host = requestHost ? requestHost.split(':')[0].toLowerCase() : null;

    // If still no host, we're in a broken state - log and return nulls
    if (!host) {
        console.error("[CompliancePage] No host header found. Headers:", {
            forwardedHost: headersList.get("x-forwarded-host"),
            host: headersList.get("host"),
            vercelHost: headersList.get("x-vercel-proxied-host"),
            vercelUrl: headersList.get("x-vercel-deployment-url"),
        });
    }

    // Fallback to resolveDomain if headers not set (middleware cache/header issues)
    const resolvedDomain = resolveDomain(host);
    const tenantType = tenantTypeHeader || (resolvedDomain.isClient ? resolvedDomain.type : null);
    const subdomain = tenantSubdomain || resolvedDomain.subdomain || null;
    const customDomain = tenantCustomDomain || resolvedDomain.customDomain || null;

    return { subdomain, customDomain, tenantType };
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
            minHeight: '100vh',
            background: '#fafafa',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>
            <div style={{
                maxWidth: 680,
                margin: '0 auto',
                padding: '40px 20px',
                background: '#fff',
                minHeight: '100vh',
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
                    <span style={{ fontSize: 12, color: '#999' }}>
                        Powered by MenuList
                    </span>
                </footer>
            </div>
        </div>
    );
}


