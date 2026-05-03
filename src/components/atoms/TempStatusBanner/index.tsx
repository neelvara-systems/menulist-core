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

import { LuAlarmClock, LuChefHat, LuClock, LuInfo, LuLock, LuUtensils } from 'react-icons/lu';
import styles from './tempStatusBanner.module.scss';

interface TempStatusBannerProps {
    tempStatus?: {
        type: 'closed_today' | 'opening_late' | 'closing_early' | 'kitchen_closed' | 'special_menu' | 'custom';
        message?: string;
        expiresAt: string;
        createdAt: string;
    };
    variant?: 'banner' | 'pill';
}

const TYPE_ICONS = {
    closed_today: LuLock,
    opening_late: LuAlarmClock,
    closing_early: LuClock,
    kitchen_closed: LuChefHat,
    special_menu: LuUtensils,
    custom: LuInfo,
};

export default function TempStatusBanner({ tempStatus, variant = 'banner' }: TempStatusBannerProps) {
    if (!tempStatus) return null;

    // Check expiry (server-side safe — pure date comparison)
    const now = new Date();
    const expiresAt = new Date(tempStatus.expiresAt);
    if (expiresAt.getTime() <= now.getTime()) return null;

    const Icon = TYPE_ICONS[tempStatus.type] || LuInfo;
    const message = tempStatus.message || 'Temporary notice';

    return (
        <div className={`${styles.banner} ${variant === 'pill' ? styles.pill : ''}`}>
            <span className={styles.icon}><Icon aria-hidden="true" size={16} /></span>
            <span className={styles.message}>{message}</span>
        </div>
    );
}
