/**
 * TempStatusBanner — Displays temporary status notice on public pages
 * 
 * Used on OBP and digital menu pages to show banners like
 * "Closed today", "Opening late", "Special menu available today".
 * 
 * Server-safe: No client hooks. Expiry check is pure date comparison.
 * 
 * @see __docs__/temp-status-layer/temp-status-layer_impl.md
 */

import styles from './tempStatusBanner.module.scss';

interface TempStatusBannerProps {
    tempStatus?: {
        type: 'closed_today' | 'opening_late' | 'closing_early' | 'kitchen_closed' | 'special_menu' | 'custom';
        message?: string;
        expiresAt: string;
        createdAt: string;
    };
}

const TYPE_ICONS: Record<string, string> = {
    closed_today: '🔒',
    opening_late: '🕐',
    closing_early: '🕕',
    kitchen_closed: '🍳',
    special_menu: '🍽️',
    custom: 'ℹ️',
};

export default function TempStatusBanner({ tempStatus }: TempStatusBannerProps) {
    if (!tempStatus) return null;

    // Check expiry (server-side safe — pure date comparison)
    const now = new Date();
    const expiresAt = new Date(tempStatus.expiresAt);
    if (expiresAt.getTime() <= now.getTime()) return null;

    const icon = TYPE_ICONS[tempStatus.type] || 'ℹ️';
    const message = tempStatus.message || 'Temporary notice';

    return (
        <div className={styles.banner}>
            <span className={styles.icon}>{icon}</span>
            <span className={styles.message}>{message}</span>
        </div>
    );
}
