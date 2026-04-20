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
    /**
     * Current project name — rendered as the terminal (non-link) node.
     *
     * T2-N-05 / D-12 PUBLIC-ROUTING-DOCTRINE: when omitted AND outletName
     * is supplied, the breadcrumb becomes Business → Outlet (2 nodes, outlet
     * marked as current). This is the outlet-OBP variant used on
     * `/{outletSlug}` to show the brand-level "up" path.
     */
    projectName?: string;
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
    const hasProject = Boolean(projectName);

    // Outlet-OBP variant (T2-N-05): when no projectName is provided and we
    // have an outlet, the outlet itself is the terminal node.
    const outletIsTerminal = showOutletNode && !hasProject;

    return (
        <nav
            aria-label="Breadcrumb"
            // T4-N-02 / §4 PUBLIC-ROUTING-DOCTRINE: `dir="auto"` lets the
            // browser derive reading direction from the first strong
            // character in each node's text content. Arabic/Hebrew brand
            // names render in their native direction WITHOUT hard-coding
            // an RTL check here — the separator is already a direction-
            // neutral `/`, and flex containers honor the parent `dir`
            // attribute for node ordering. One-line fix covers both
            // LTR and RTL locales.
            dir="auto"
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
                    {outletIsTerminal ? (
                        <span aria-current="page" style={currentStyle}>
                            {outletName}
                        </span>
                    ) : (
                        <Link href={`/${outletSlug}`} style={linkStyle} prefetch={false}>
                            {outletName}
                        </Link>
                    )}
                </>
            )}

            {hasProject && (
                <>
                    <span style={separatorStyle} aria-hidden="true">/</span>
                    <span aria-current="page" style={currentStyle}>
                        {projectName}
                    </span>
                </>
            )}
        </nav>
    );
}
