/**
 * G-09 (§11 + D-12 PUBLIC-ROUTING-DOCTRINE): visible breadcrumb on project pages.
 *
 * Server component. Renders "Business → (Store →) Project" above the menu so
 * the "up" path is always visible — same hierarchy the JSON-LD BreadcrumbList
 * already exposes to search engines.
 *
 *   - Single-store tenant → Business → Project  (2 nodes)
 *   - Multi-store tenant  → Business → Store → Project  (3 nodes)
 *
 * Non-interactive styling — minimal, low-weight — so it stays an affordance,
 * not a competing UI. Uses relative hrefs so it works on subdomain and
 * custom-domain tenants without building origin strings.
 */

import Link from 'next/link';

interface MenuBreadcrumbProps {
    /** Master-tenant brand display name (always shown as the root node). */
    businessName: string;
    /** Outlet display name — omit for single-store tenants. */
    outletName?: string;
    /** Outlet canonical slug — required when outletName is supplied. */
    outletSlug?: string;
    /** Current project name — rendered as the terminal (non-link) node. */
    projectName: string;
}

const linkStyle: React.CSSProperties = {
    color: 'inherit',
    textDecoration: 'none',
    opacity: 0.7,
};

const separatorStyle: React.CSSProperties = {
    opacity: 0.4,
    userSelect: 'none',
};

const currentStyle: React.CSSProperties = {
    opacity: 1,
    fontWeight: 500,
};

export default function MenuBreadcrumb({
    businessName,
    outletName,
    outletSlug,
    projectName,
}: MenuBreadcrumbProps) {
    const showOutletNode = Boolean(outletName && outletSlug);

    return (
        <nav
            aria-label="Breadcrumb"
            style={{
                padding: '10px 16px',
                fontSize: 13,
                lineHeight: 1.4,
                color: '#333',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexWrap: 'wrap',
            }}
        >
            {/* Business node — always links to OBP root */}
            <Link href="/" style={linkStyle} prefetch={false}>
                {businessName}
            </Link>

            {showOutletNode && (
                <>
                    <span style={separatorStyle} aria-hidden="true">/</span>
                    <Link href={`/${outletSlug}`} style={linkStyle} prefetch={false}>
                        {outletName}
                    </Link>
                </>
            )}

            <span style={separatorStyle} aria-hidden="true">/</span>
            <span aria-current="page" style={currentStyle}>
                {projectName}
            </span>
        </nav>
    );
}
