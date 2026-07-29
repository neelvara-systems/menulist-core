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
 *   - ≥2 projects → equal image-led cards so multiple menus do not imply a
 *     false primary/secondary hierarchy.
 */

import { getSessionId } from '@lib/analytics/session';
import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from '@lib/analytics/analyticsDiagnostics';
import { withAnalyticsSource } from '@lib/analytics/sourceAttribution';
import { trackBeforeNavigate } from '@lib/analytics/trackBeforeNavigate';
import { trackOBPMenuClick, trackProjectSwitch } from '@lib/analytics/unified';
import { LuBookOpen } from 'react-icons/lu';
import styles from './obp.module.scss';

export interface OBPMenuCTAProjectEntry {
    slug: string;
    name: string;
    label: string;
    projectImage?: string | null;
    url: string;
    isDefault: boolean;
}

type OBPOpenHoursState = 'open' | 'closed' | 'unknown';
const MAX_OBP_MENU_CTA_ENTRY_SOURCE_DIAGNOSTICS = 25;
const reportedOBPMenuCTAEntrySourceFallbackFailures = new Set<string>();

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
    openHoursState?: OBPOpenHoursState;
}

function isAbsoluteOBPMenuCTAUrl(url: string): boolean {
    return /^[a-z][a-z\d+\-.]*:\/\//i.test(url);
}

function logOBPMenuCTAEntrySourceFallbackFailure(error: unknown, url: string): void {
    const failureKey = [
        url.length,
        isAbsoluteOBPMenuCTAUrl(url) ? 'absolute' : 'relative',
        url.includes('?') ? 'query' : 'no-query',
        url.includes('#') ? 'hash' : 'no-hash',
    ].join(':');

    if (reportedOBPMenuCTAEntrySourceFallbackFailures.has(failureKey)) return;
    if (reportedOBPMenuCTAEntrySourceFallbackFailures.size >= MAX_OBP_MENU_CTA_ENTRY_SOURCE_DIAGNOSTICS) return;
    reportedOBPMenuCTAEntrySourceFallbackFailures.add(failureKey);

    logAnalyticsFailure('obp_menu_cta_entry_source_fallback_failed', error, {
        ...getBoundedAnalyticsStringContext('menuUrl', url),
        isAbsoluteUrl: isAbsoluteOBPMenuCTAUrl(url),
        hasQuery: url.includes('?'),
        hasHash: url.includes('#'),
    });
}

function withOBPEntrySource(url: string): string {
    if (!url) return url;
    try {
        return withAnalyticsSource(url, 'obp');
    } catch (error) {
        logOBPMenuCTAEntrySourceFallbackFailure(error, url);
        return url;
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
    includeLocation = false,
    storeTimeZone,
    businessDayEndTime,
    openHoursState = 'unknown',
}: OBPMenuCTAProps) {
    const trackPrimary = () => {
        if (!trackingEnabled) return Promise.resolve();
        return trackOBPMenuClick(storeId, obpSurface, {
            tenantId,
            sessionId: getSessionId(),
            storeTimeZone,
            businessDayEndTime,
            openHoursState,
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
            openHoursState,
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

        return Promise.all([menuClick, projectSwitch]).then(() => undefined);
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

    const [primary] = projects;

    if (projects.length === 1) {
        return (
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
                    ) : (
                        <span className={styles.menuButtonThumbFallback} aria-hidden="true">
                            <LuBookOpen size={20} />
                        </span>
                    )}
                    <span className={styles.menuButtonLabel}>{primary.label}</span>
                </span>
            </a>
        );
    }

    return (
        <div className={styles.projectCards}>
            {projects.map((project, index) => {
                const href = withOBPEntrySource(project.url);
                return (
                    <a
                        key={project.slug}
                        href={href}
                        className={styles.projectCard}
                        onClick={(event) => trackBeforeNavigate({
                            event,
                            href,
                            track: index === 0 ? trackPrimary : () => trackSecondary(project),
                        })}
                    >
                        {project.projectImage ? (
                            <span className={styles.projectCardThumb}>
                                <img alt={project.name} src={project.projectImage} />
                            </span>
                        ) : (
                            <span className={styles.projectCardThumbFallback} aria-hidden="true">
                                <LuBookOpen size={34} />
                            </span>
                        )}
                        <span className={styles.projectCardName}>{project.label}</span>
                    </a>
                );
            })}
        </div>
    );
}
