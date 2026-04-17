'use client';

/**
 * OBP Menu CTA — Client Component for "View Menu" button with conversion tracking.
 * 
 * Fires OBP_MENU_CLICK event when customer clicks "View Menu" from OBP.
 * This measures OBP→menu conversion rate — the key OBP effectiveness metric.
 * Uses native <a> tag for navigation (no client-side routing needed).
 */

import { getSessionId } from '@lib/analytics/session';
import { trackOBPMenuClick } from '@lib/analytics/unified';
import styles from './obp.module.scss';

interface OBPMenuCTAProps {
    menuUrl: string;
    accentColor: string;
    tenantId: number;
    storeId: number;
}

export default function OBPMenuCTA({ menuUrl, accentColor, tenantId, storeId }: OBPMenuCTAProps) {
    const handleClick = () => {
        trackOBPMenuClick(storeId, {
            tenantId,
            sessionId: getSessionId(),
        }).catch(() => { });
    };

    return (
        <a
            href={menuUrl}
            className={styles.menuButton}
            style={{ background: accentColor }}
            onClick={handleClick}
        >
            View Menu
        </a>
    );
}
