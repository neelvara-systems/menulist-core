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
    logoUrl?: string | null;
    variant?: 'breadcrumb' | 'identity';
    theme?: {
        background: string;
        textColor: string;
        headingColor: string;
        mutedColor?: string;
        accentColor?: string;
        borderColor: string;
        fontFamily: string;
    };
}

const baseLinkStyle: React.CSSProperties = {
    color: 'inherit',
    textDecoration: 'none',
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
    logoUrl,
    variant = 'breadcrumb',
    theme,
}: MenuBreadcrumbProps) {
    const showOutletNode = Boolean(outletName && outletSlug);
    const hasProject = Boolean(projectName);
    const linkStyle: React.CSSProperties = {
        ...baseLinkStyle,
        color: theme?.textColor || 'inherit',
        opacity: 0.76,
    };
    const activeStyle: React.CSSProperties = {
        ...currentStyle,
        color: theme?.headingColor || 'inherit',
    };

    // Outlet-OBP variant (T2-N-05): when no projectName is provided and we
    // have an outlet, the outlet itself is the terminal node.
    const outletIsTerminal = showOutletNode && !hasProject;
    const businessInitial = businessName?.trim()?.charAt(0)?.toUpperCase() || 'M';

    if (variant === 'identity') {
        const logoBoxStyle: React.CSSProperties = {
            width: 44,
            height: 44,
            borderRadius: 12,
            flex: '0 0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            border: `1px solid ${theme?.borderColor || 'rgba(0, 0, 0, 0.1)'}`,
            background: theme?.background || 'transparent',
            color: theme?.headingColor || 'inherit',
            fontSize: 18,
            fontWeight: 700,
            lineHeight: 1,
        };

        return (
            <nav
                aria-label="Business identity"
                dir="auto"
                style={{
                    padding: '10px 16px',
                    color: theme?.textColor || '#333',
                    background: theme?.background || 'transparent',
                    borderBottom: theme ? `1px solid ${theme.borderColor}` : undefined,
                    fontFamily: theme?.fontFamily || undefined,
                }}
            >
                <div
                    style={{
                        width: '100%',
                        maxWidth: 1200,
                        margin: '0 auto',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        minWidth: 0,
                    }}
                >
                    <Link href="/" style={{ ...baseLinkStyle, ...logoBoxStyle }} prefetch={false} aria-label={`${businessName} home`}>
                        {logoUrl ? (
                            <img
                                src={logoUrl}
                                alt={`${businessName} logo`}
                                width={44}
                                height={44}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    padding: 4,
                                    display: 'block',
                                    boxSizing: 'border-box',
                                }}
                            />
                        ) : (
                            <span aria-hidden="true">{businessInitial}</span>
                        )}
                    </Link>

                    <div
                        style={{
                            minWidth: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                        }}
                    >
                        <Link
                            href="/"
                            style={{
                                ...baseLinkStyle,
                                color: theme?.headingColor || 'inherit',
                                display: 'block',
                                fontSize: 16,
                                fontWeight: 700,
                                lineHeight: 1.25,
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                            prefetch={false}
                        >
                            {businessName}
                        </Link>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                minWidth: 0,
                                color: theme?.mutedColor || theme?.textColor || 'inherit',
                                fontSize: 12,
                                lineHeight: 1.35,
                                opacity: 0.78,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {showOutletNode && (
                                outletIsTerminal ? (
                                    <span aria-current="page" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {outletName}
                                    </span>
                                ) : (
                                    <Link
                                        href={`/${outletSlug}`}
                                        style={{
                                            ...baseLinkStyle,
                                            color: 'inherit',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                        prefetch={false}
                                    >
                                        {outletName}
                                    </Link>
                                )
                            )}
                            {showOutletNode && hasProject && (
                                <span style={{ opacity: 0.35 }} aria-hidden="true">·</span>
                            )}
                            {hasProject && (
                                <span
                                    aria-current="page"
                                    style={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {projectName}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </nav>
        );
    }

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
                color: theme?.textColor || '#333',
                background: theme?.background || 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexWrap: 'wrap',
                borderBottom: theme ? `1px solid ${theme.borderColor}` : undefined,
                fontFamily: theme?.fontFamily || undefined,
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
                        <span aria-current="page" style={activeStyle}>
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
                    <span aria-current="page" style={activeStyle}>
                        {projectName}
                    </span>
                </>
            )}
        </nav>
    );
}
