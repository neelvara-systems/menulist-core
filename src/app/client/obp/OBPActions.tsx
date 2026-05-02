'use client';

/**
 * OBP Action Buttons — Client Component
 * 
 * Renders Call/WhatsApp/Directions buttons with analytics tracking.
 * Extracted from OBPContent (server component) because onClick requires client JS.
 */

import { getSessionId } from '@lib/analytics/session';
import { trackOBPAction } from '@lib/analytics/unified';
import styles from './obp.module.scss';
import { trackBeforeNavigate } from './trackBeforeNavigate';

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
                    <span className={styles.actionIcon}>📞</span>
                    Call
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
                    <span className={styles.actionIcon}>💬</span>
                    WhatsApp
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
                    <span className={styles.actionIcon}>📍</span>
                    Directions
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
                    <span className={styles.actionIcon}>📅</span>
                    Reserve
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
                    <span className={styles.actionIcon}>🛒</span>
                    Order
                </a>
            )}
        </div>
    );
}
