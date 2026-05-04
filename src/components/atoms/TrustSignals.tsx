/**
 * TrustSignals — Business truth header on customer-facing pages
 *
 * Displays: location · operational status · offering label · freshness.
 * Factual signals, not badges. Builds trust through evidence, not declarations.
 *
 * v2: ChatGPT feedback applied — replaced "OFFICIAL MENU" badge with neutral
 * offering label, switched vague freshness to exact dates, added location +
 * operational status. All data from existing SSR payload. Zero new reads.
 *
 * @see __docs__/menu-trust-signals/menu-trust-signals_impl.md
 */

import { FEATURE_FLAGS } from '@config/features';
import { getStoreStatus } from '@lib/hours';
import { getOfferingLabels } from '@lib/menu-kit/businessTypeLabels';
import { resolveHoursOutput } from '@lib/outputControl';

interface TrustSignalsProps {
    businessType: string;
    lastPublishedAt: any; // Date | Timestamp | { seconds: number } | string | null
    locationArea?: string | null;
    city?: string | null;
    workingHours?: Record<string, string>;
    timeZone?: string;
    /** When hours were last updated — used for confidence-gated rendering */
    hoursLastUpdatedAt?: any;
    theme?: {
        background: string;
        mutedColor: string;
        borderColor: string;
        fontFamily: string;
    };
}

/**
 * Normalize lastPublishedAt to a Date object.
 * Handles Firestore Timestamp, serialized {seconds}, string, and Date.
 */
function normalizeDate(lastPublishedAt: any): Date | null {
    if (!lastPublishedAt) return null;

    let d: Date;
    if (typeof lastPublishedAt?.toDate === 'function') {
        d = lastPublishedAt.toDate();
    } else if (lastPublishedAt?.seconds) {
        d = new Date(lastPublishedAt.seconds * 1000);
    } else if (typeof lastPublishedAt === 'string') {
        d = new Date(lastPublishedAt);
    } else if (lastPublishedAt instanceof Date) {
        d = lastPublishedAt;
    } else {
        return null;
    }

    return isNaN(d.getTime()) ? null : d;
}

/**
 * Format date as "Updated today" or "Updated Mar 12".
 * Returns null if data is missing or stale (>30 days).
 */
function getFreshnessText(lastPublishedAt: any): string | null {
    const date = normalizeDate(lastPublishedAt);
    if (!date) return null;

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 1) return 'Updated today';
    if (diffDays <= 30) {
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const day = date.getDate();
        return `Updated ${month} ${day}`;
    }
    return null; // Stale — hide freshness
}

/**
 * Build location string from area and city.
 * Returns null if neither available.
 */
function getLocationText(area?: string | null, city?: string | null): string | null {
    if (area && city && area !== city) return `${area}, ${city}`;
    if (area) return area;
    if (city) return city;
    return null;
}

const SEPARATOR_STYLE = { color: '#cbd5e1' };
const CONTAINER_STYLE: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '8px 16px 4px',
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '0.3px',
    color: '#64748b',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    lineHeight: 1.4,
};
const META_ROW_STYLE: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
    justifyContent: 'center',
};

export default function TrustSignals({
    businessType,
    lastPublishedAt,
    locationArea,
    city,
    workingHours,
    timeZone,
    hoursLastUpdatedAt,
    theme,
}: TrustSignalsProps) {
    const labels = getOfferingLabels(businessType);
    const offeringLabel = labels.offeringTitle;
    const freshnessText = getFreshnessText(lastPublishedAt);
    const locationText = getLocationText(locationArea, city);

    // Compute operational status — confidence-gated when output control is enabled
    let statusText: string | null = null;
    let statusColor: string = '#64748b'; // default muted
    let statusSecondary: string | null = null;

    if (workingHours && Object.keys(workingHours).length > 0) {
        if (FEATURE_FLAGS.ENABLE_OUTPUT_CONTROL) {
            const hoursOutput = resolveHoursOutput({
                workingHours,
                hoursLastUpdatedAt: hoursLastUpdatedAt,
                timeZone,
            });
            statusText = hoursOutput.statusText;
            statusSecondary = hoursOutput.secondaryText || null;
            statusColor = hoursOutput.styleHint === 'open' ? '#16a34a'
                : hoursOutput.styleHint === 'closed' ? '#dc2626'
                    : '#94a3b8'; // cautious/muted
        } else {
            const status = getStoreStatus(workingHours, timeZone);
            statusText = status.statusText;
            statusSecondary = status.nextChange || null;
            statusColor = status.isOpen ? '#16a34a' : '#dc2626';
        }
    }

    // Build meta line: "Bandra West · Open now"
    const hasMetaLine = locationText || statusText;
    // Build context line: "Restaurant Menu · Updated Mar 17"
    const hasContextLine = offeringLabel || freshnessText;

    if (!hasMetaLine && !hasContextLine) return null;

    const containerStyle: React.CSSProperties = {
        ...CONTAINER_STYLE,
        background: theme?.background || CONTAINER_STYLE.background,
        color: theme?.mutedColor || CONTAINER_STYLE.color,
        borderBottom: theme ? `1px solid ${theme.borderColor}` : undefined,
        fontFamily: theme?.fontFamily || CONTAINER_STYLE.fontFamily,
    };
    const separatorStyle = {
        ...SEPARATOR_STYLE,
        color: theme?.borderColor || SEPARATOR_STYLE.color,
    };

    return (
        <div style={containerStyle}>
            {/* Row 1: Location · Status */}
            {hasMetaLine && (
                <div style={META_ROW_STYLE}>
                    {locationText && <span>{locationText}</span>}
                    {locationText && statusText && <span style={separatorStyle}>·</span>}
                    {statusText && (
                        <span style={{ color: statusColor }}>
                            {statusText}{statusSecondary ? ` · ${statusSecondary}` : ''}
                        </span>
                    )}
                </div>
            )}
            {/* Row 2: Offering Label · Freshness */}
            {hasContextLine && (
                <div style={META_ROW_STYLE}>
                    <span>{offeringLabel}</span>
                    {freshnessText && (
                        <>
                            <span style={separatorStyle}>·</span>
                            <span>{freshnessText}</span>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
