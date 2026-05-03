'use client';

/**
 * OBP Menu CTA — Client Component.
 *
 * Fires OBP_MENU_CLICK when the customer clicks any menu CTA from OBP
 * (primary or secondary). Measures OBP → menu conversion, the key OBP
 * effectiveness metric.
 *
 * Uses native <a> tag for navigation (no client-side routing needed).
 *
 * G-06 (§11 + D-03 PUBLIC-ROUTING-DOCTRINE): per-project-count rendering.
 *   - 0 projects → "View Menu" fallback (safety rail; hasMenu gating in
 *     OBPContent normally prevents this branch)
 *   - 1 project  → single big CTA reading "View [projectName]"
 *   - ≥2 projects → default project as big CTA "View [defaultName]" +
 *     secondary projects as smaller cards below
 */

import { getSessionId } from '@lib/analytics/session';
import { withAnalyticsSource } from '@lib/analytics/sourceAttribution';
import { trackBeforeNavigate } from '@lib/analytics/trackBeforeNavigate';
import { trackOBPMenuClick, trackProjectSwitch } from '@lib/analytics/unified';
import styles from './obp.module.scss';

export interface OBPMenuCTAProjectEntry {
    slug: string;
    name: string;
    label: string;
    projectImage?: string | null;
    url: string;
    isDefault: boolean;
}

interface OBPMenuCTAProps {
    /** Fallback URL for the "View Menu" safety rail when projects is empty. */
    menuUrl: string;
    fallbackLabel: string;
    accentColor: string;
    tenantId: number;
    storeId: number;
    /** Ordered projects (default first). When length ≥ 2 the secondary list renders below the primary CTA. */
    projects?: OBPMenuCTAProjectEntry[];
    /**
     * T2-N-02 / A-07 PUBLIC-ROUTING-DOCTRINE: which OBP surface rendered this
     * CTA. 'brand' for the tenant root (`/`), 'outlet' for `/{outletSlug}`.
     * Forwarded to `trackOBPMenuClick` so multi-outlet conversion can be
     * broken down by surface in the owner dashboard.
     */
    obpSurface?: 'brand' | 'outlet';
    trackingEnabled?: boolean;
    includeLocation?: boolean;
    storeTimeZone?: string;
    businessDayEndTime?: string;
}

function withOBPEntrySource(url: string): string {
    if (!url) return url;
    try {
        const sourcedUrl = withAnalyticsSource(url, 'obp');
        const parsed = new URL(sourcedUrl, typeof window !== 'undefined' ? window.location.origin : 'https://menulist.ai');
        parsed.searchParams.set('utm_medium', 'obp');
        return sourcedUrl.startsWith('/') ? `${parsed.pathname}${parsed.search}${parsed.hash}` : parsed.toString();
    } catch {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}src=obp&source=obp&utm_source=obp&utm_medium=obp&entry_source=obp`;
    }
}

export default function OBPMenuCTA({
    menuUrl,
    fallbackLabel,
    accentColor,
    tenantId,
    storeId,
    projects = [],
    obpSurface = 'brand',
    trackingEnabled = true,
    includeLocation = true,
    storeTimeZone,
    businessDayEndTime,
}: OBPMenuCTAProps) {
    const trackPrimary = () => {
        if (!trackingEnabled) return Promise.resolve();
        return trackOBPMenuClick(storeId, obpSurface, {
            tenantId,
            sessionId: getSessionId(),
            storeTimeZone,
            businessDayEndTime,
            includeLocation,
        });
    };

    const trackSecondary = (project: OBPMenuCTAProjectEntry) => {
        if (!trackingEnabled) return Promise.resolve();
        // Primary OBP→menu conversion metric.
        const menuClick = trackOBPMenuClick(storeId, obpSurface, {
            tenantId,
            sessionId: getSessionId(),
            storeTimeZone,
            businessDayEndTime,
            includeLocation,
        });
        // G-10: also tag this as a customer-side project switch so the
        // dashboard can tell cross-project exploration apart from straight
        // default-project opens.
        const projectSwitch = trackProjectSwitch(
            storeId,
            project.slug,
            null, // OBP is a fresh entry point; there is no "from" project.
            'obp_secondary_card',
            { tenantId, sessionId: getSessionId(), storeTimeZone, businessDayEndTime, includeLocation },
        );

        return Promise.allSettled([menuClick, projectSwitch]).then(() => undefined);
    };

    // Safety rail: no projects list → render classic "View Menu" button.
    if (projects.length === 0) {
        return (
            <a
                href={withOBPEntrySource(menuUrl)}
                className={styles.menuButton}
                style={{ background: accentColor }}
                onClick={(event) => trackBeforeNavigate({
                    event,
                    href: withOBPEntrySource(menuUrl),
                    track: trackPrimary,
                })}
            >
                {fallbackLabel}
            </a>
        );
    }

    const [primary, ...secondary] = projects;

    return (
        <>
            <a
                href={withOBPEntrySource(primary.url)}
                className={styles.menuButton}
                style={{ background: accentColor }}
                onClick={(event) => trackBeforeNavigate({
                    event,
                    href: withOBPEntrySource(primary.url),
                    track: trackPrimary,
                })}
            >
                <span className={styles.menuButtonContent}>
                    {primary.projectImage ? (
                        <span className={styles.menuButtonThumb}>
                            <img alt={primary.name} src={primary.projectImage} />
                        </span>
                    ) : null}
                    <span className={styles.menuButtonLabel}>{primary.label}</span>
                </span>
            </a>
            {secondary.length > 0 && (
                <div className={styles.secondaryProjects}>
                    {secondary.map((p) => (
                        <a
                            key={p.slug}
                            href={withOBPEntrySource(p.url)}
                            className={styles.secondaryProjectCard}
                            onClick={(event) => trackBeforeNavigate({
                                event,
                                href: withOBPEntrySource(p.url),
                                track: () => trackSecondary(p),
                            })}
                        >
                            {p.projectImage ? (
                                <span className={styles.secondaryProjectThumb}>
                                    <img alt={p.name} src={p.projectImage} />
                                </span>
                            ) : null}
                            <span className={styles.secondaryProjectName}>{p.label}</span>
                        </a>
                    ))}
                </div>
            )}
        </>
    );
}
