'use client';

/**
 * OBP Action Buttons — Client Component
 * 
 * Renders Call/WhatsApp/Directions buttons with analytics tracking.
 * Extracted from OBPContent (server component) because onClick requires client JS.
 */

import { getSessionId } from '@lib/analytics/session';
import { trackBeforeNavigate } from '@lib/analytics/trackBeforeNavigate';
import { trackOBPAction } from '@lib/analytics/unified';
import { LuCalendarCheck, LuMapPin, LuMessageCircle, LuPhone, LuShoppingBag } from 'react-icons/lu';
import styles from './obp.module.scss';

interface OBPActionsProps {
    tenantId: number;
    storeId: number;
    trackingEnabled?: boolean;
    includeLocation?: boolean;
    storeTimeZone?: string;
    businessDayEndTime?: string;
    phoneNumber?: string;
    whatsappNumber?: string;
    directionsUrl?: string;
    reservationUrl?: string;
    orderUrl?: string;
    showCall: boolean;
    showWhatsApp: boolean;
    showDirections: boolean;
    showReservation: boolean;
    showOrder: boolean;
    labels: {
        call: string;
        whatsapp: string;
        directions: string;
        reserve: string;
        order: string;
    };
}

export default function OBPActions({
    tenantId,
    storeId,
    trackingEnabled = true,
    includeLocation = true,
    storeTimeZone,
    businessDayEndTime,
    phoneNumber,
    whatsappNumber,
    directionsUrl,
    reservationUrl,
    orderUrl,
    showCall,
    showWhatsApp,
    showDirections,
    showReservation,
    showOrder,
    labels,
}: OBPActionsProps) {
    const hasAnyAction = showCall || showWhatsApp || showDirections || (showReservation && !!reservationUrl) || (showOrder && !!orderUrl);
    if (!hasAnyAction) return null;

    const handleAction = (action: 'call' | 'whatsapp' | 'directions' | 'reserve' | 'order') => {
        if (!trackingEnabled) return Promise.resolve();
        return trackOBPAction(storeId, action, {
            tenantId,
            sessionId: getSessionId(),
            storeTimeZone,
            businessDayEndTime,
            includeLocation,
        });
    };

    const callHref = phoneNumber ? `tel:${phoneNumber}` : '';
    const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber.replace('+', '')}` : '';

    return (
        <div className={styles.actions}>
            {showCall && phoneNumber && (
                <a
                    href={callHref}
                    className={styles.actionButton}
                    onClick={(event) => trackBeforeNavigate({
                        event,
                        href: callHref,
                        track: () => handleAction('call'),
                    })}
                >
                    <span className={styles.actionIcon}><LuPhone aria-hidden="true" size={20} /></span>
                    <span>{labels.call}</span>
                </a>
            )}
            {showWhatsApp && whatsappNumber && (
                <a
                    href={whatsappHref}
                    className={styles.actionButton}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => trackBeforeNavigate({
                        event,
                        href: whatsappHref,
                        target: '_blank',
                        track: () => handleAction('whatsapp'),
                    })}
                >
                    <span className={styles.actionIcon}><LuMessageCircle aria-hidden="true" size={20} /></span>
                    <span>{labels.whatsapp}</span>
                </a>
            )}
            {showDirections && directionsUrl && (
                <a
                    href={directionsUrl}
                    className={styles.actionButton}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => trackBeforeNavigate({
                        event,
                        href: directionsUrl,
                        target: '_blank',
                        track: () => handleAction('directions'),
                    })}
                >
                    <span className={styles.actionIcon}><LuMapPin aria-hidden="true" size={20} /></span>
                    <span>{labels.directions}</span>
                </a>
            )}
            {showReservation && reservationUrl && (
                <a
                    href={reservationUrl}
                    className={styles.actionButton}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => trackBeforeNavigate({
                        event,
                        href: reservationUrl,
                        target: '_blank',
                        track: () => handleAction('reserve'),
                    })}
                >
                    <span className={styles.actionIcon}><LuCalendarCheck aria-hidden="true" size={20} /></span>
                    <span>{labels.reserve}</span>
                </a>
            )}
            {showOrder && orderUrl && (
                <a
                    href={orderUrl}
                    className={styles.actionButton}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => trackBeforeNavigate({
                        event,
                        href: orderUrl,
                        target: '_blank',
                        track: () => handleAction('order'),
                    })}
                >
                    <span className={styles.actionIcon}><LuShoppingBag aria-hidden="true" size={20} /></span>
                    <span>{labels.order}</span>
                </a>
            )}
        </div>
    );
}
