'use client';

/**
 * TempStatusBanner — Displays temporary status notice on public pages
 * 
 * Used on OBP and digital menu pages to show banners like
 * "Closed today", "Opening late", "Special menu available today".
 * 
 * Uses the shared expiry hook so a mounted customer page hides the banner at
 * the exact expiry boundary without requiring a refresh.
 * 
 * @see __docs__/temp-status-layer/temp-status-layer_impl.md
 */

import { LuAlarmClock, LuChefHat, LuClock, LuInfo, LuLock, LuUtensils } from 'react-icons/lu';
import { useActiveTempStatus } from '@hook/useActiveTempStatus';
import {
    createPublicCustomerTranslator,
    type PublicCustomerMessageKey,
} from '@lib/localization/publicCustomerMessages';
import styles from './tempStatusBanner.module.scss';

interface TempStatusBannerProps {
    activeLanguage?: string;
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

const TYPE_MESSAGE_KEYS: Partial<Record<
    NonNullable<TempStatusBannerProps['tempStatus']>['type'],
    PublicCustomerMessageKey
>> = {
    closed_today: 'menu.tempClosedToday',
    opening_late: 'menu.tempOpeningLate',
    closing_early: 'menu.tempClosingEarly',
    kitchen_closed: 'menu.tempKitchenClosed',
    special_menu: 'menu.tempSpecialMenu',
};

export default function TempStatusBanner({
    activeLanguage,
    tempStatus,
    variant = 'banner',
}: TempStatusBannerProps) {
    const activeStatus = useActiveTempStatus(tempStatus);
    if (!activeStatus) return null;

    const t = createPublicCustomerTranslator(activeLanguage);
    const Icon = TYPE_ICONS[activeStatus.type] || LuInfo;
    const standardMessageKey = TYPE_MESSAGE_KEYS[activeStatus.type];
    const displayMessage = standardMessageKey
        ? t(standardMessageKey)
        : activeStatus.message || t('menu.tempTemporaryNotice');

    return (
        <div className={`${styles.banner} ${variant === 'pill' ? styles.pill : ''}`}>
            <span className={styles.icon}><Icon aria-hidden="true" size={16} /></span>
            <span className={styles.message}>{displayMessage}</span>
        </div>
    );
}
