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

interface OBPActionsProps {
    tenantId: number;
    storeId: number;
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
        trackOBPAction(storeId, action, {
            tenantId,
            sessionId: getSessionId(),
        }).catch(() => { });
    };

    return (
        <div className={styles.actions}>
            {showCall && phoneNumber && (
                <a
                    href={`tel:${phoneNumber}`}
                    className={styles.actionButton}
                    onClick={() => handleAction('call')}
                >
                    <span className={styles.actionIcon}>📞</span>
                    Call
                </a>
            )}
            {showWhatsApp && whatsappNumber && (
                <a
                    href={`https://wa.me/${whatsappNumber.replace('+', '')}`}
                    className={styles.actionButton}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleAction('whatsapp')}
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
                    onClick={() => handleAction('directions')}
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
                    onClick={() => handleAction('reserve')}
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
                    onClick={() => handleAction('order')}
                >
                    <span className={styles.actionIcon}>🛒</span>
                    Order
                </a>
            )}
        </div>
    );
}
