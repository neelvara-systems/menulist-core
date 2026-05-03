'use client';

/**
 * OBP Action Buttons — Client Component
 * 
 * Renders Call/WhatsApp/Directions buttons with analytics tracking.
 * Extracted from OBPContent (server component) because onClick requires client JS.
 */

import { getSessionId } from '@lib/analytics/session';
import { trackBeforeNavigate } from '@lib/analytics/trackBeforeNavigate';
import { trackOBPAction, trackOBPLinkClick } from '@lib/analytics/unified';
import type { ReactNode } from 'react';
import { LuCalendarCheck, LuMessageSquarePlus, LuPhone, LuShoppingBag } from 'react-icons/lu';
import { TbBrandGoogleFilled, TbBrandWhatsapp, TbMapPinFilled } from 'react-icons/tb';
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
    googleReviewUrl?: string;
    feedbackUrl?: string;
    iconVariant?: 'icons' | 'emoji';
    showCall: boolean;
    showWhatsApp: boolean;
    showDirections: boolean;
    showReservation: boolean;
    showOrder: boolean;
    showGoogleReview: boolean;
    showFeedback: boolean;
    labels: {
        call: string;
        whatsapp: string;
        directions: string;
        reserve: string;
        order: string;
        reviews: string;
        feedback: string;
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
    googleReviewUrl,
    feedbackUrl,
    iconVariant = 'icons',
    showCall,
    showWhatsApp,
    showDirections,
    showReservation,
    showOrder,
    showGoogleReview,
    showFeedback,
    labels,
}: OBPActionsProps) {
    const hasAnyAction = showCall || showWhatsApp || showDirections || (showReservation && !!reservationUrl) || (showOrder && !!orderUrl) || (showGoogleReview && !!googleReviewUrl) || (showFeedback && !!feedbackUrl);
    if (!hasAnyAction) return null;

    const handleAction = (action: 'call' | 'whatsapp' | 'directions' | 'reserve' | 'order' | 'feedback') => {
        if (!trackingEnabled) return Promise.resolve();
        return trackOBPAction(storeId, action, {
            tenantId,
            sessionId: getSessionId(),
            storeTimeZone,
            businessDayEndTime,
            includeLocation,
        });
    };

    const handleGoogleReview = () => {
        if (!trackingEnabled) return Promise.resolve();
        return trackOBPLinkClick(storeId, 'google_review', {
            tenantId,
            sessionId: getSessionId(),
            storeTimeZone,
            businessDayEndTime,
            includeLocation,
        });
    };

    const callHref = phoneNumber ? `tel:${phoneNumber}` : '';
    const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber.replace('+', '')}` : '';
    const renderActionIcon = (emoji: string, icon: ReactNode, className?: string) => (
        <span className={`${styles.actionIcon} ${className || ''} ${iconVariant === 'emoji' ? styles.actionIconEmojiMode : ''}`}>
            {iconVariant === 'emoji' ? <span aria-hidden="true" className={styles.actionEmoji}>{emoji}</span> : icon}
        </span>
    );

    return (
        <div className={styles.actions}>
            {showCall && phoneNumber && (
                <a
                    href={callHref}
                    className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                    onClick={(event) => trackBeforeNavigate({
                        event,
                        href: callHref,
                        track: () => handleAction('call'),
                    })}
                >
                    {renderActionIcon('☎️', <LuPhone aria-hidden="true" size={20} />, styles.actionIconCall)}
                    <span>{labels.call}</span>
                </a>
            )}
            {showDirections && directionsUrl && (
                <a
                    href={directionsUrl}
                    className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => trackBeforeNavigate({
                        event,
                        href: directionsUrl,
                        target: '_blank',
                        track: () => handleAction('directions'),
                    })}
                >
                    {renderActionIcon('📍', <TbMapPinFilled aria-hidden="true" size={19} />, styles.actionIconDirections)}
                    <span>{labels.directions}</span>
                </a>
            )}
            {showWhatsApp && whatsappNumber && (
                <a
                    href={whatsappHref}
                    className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => trackBeforeNavigate({
                        event,
                        href: whatsappHref,
                        target: '_blank',
                        track: () => handleAction('whatsapp'),
                    })}
                >
                    {renderActionIcon('🟢', <TbBrandWhatsapp aria-hidden="true" size={19} />, styles.actionIconWhatsapp)}
                    <span>{labels.whatsapp}</span>
                </a>
            )}
            {showGoogleReview && googleReviewUrl && (
                <a
                    href={googleReviewUrl}
                    className={`${styles.actionButton} ${styles.actionButtonUtility}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => trackBeforeNavigate({
                        event,
                        href: googleReviewUrl,
                        target: '_blank',
                        track: handleGoogleReview,
                    })}
                >
                    {renderActionIcon('⭐', <TbBrandGoogleFilled aria-hidden="true" size={18} />, styles.actionIconGoogle)}
                    <span>{labels.reviews}</span>
                </a>
            )}
            {showReservation && reservationUrl && (
                <a
                    href={reservationUrl}
                    className={`${styles.actionButton} ${styles.actionButtonUtility}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => trackBeforeNavigate({
                        event,
                        href: reservationUrl,
                        target: '_blank',
                        track: () => handleAction('reserve'),
                    })}
                >
                    {renderActionIcon('📅', <LuCalendarCheck aria-hidden="true" size={18} />, styles.actionIconReserve)}
                    <span>{labels.reserve}</span>
                </a>
            )}
            {showOrder && orderUrl && (
                <a
                    href={orderUrl}
                    className={`${styles.actionButton} ${styles.actionButtonUtility}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => trackBeforeNavigate({
                        event,
                        href: orderUrl,
                        target: '_blank',
                        track: () => handleAction('order'),
                    })}
                >
                    {renderActionIcon('🛍️', <LuShoppingBag aria-hidden="true" size={18} />, styles.actionIconOrder)}
                    <span>{labels.order}</span>
                </a>
            )}
            {showFeedback && feedbackUrl && (
                <a
                    href={feedbackUrl}
                    className={`${styles.actionButton} ${styles.actionButtonUtility}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => trackBeforeNavigate({
                        event,
                        href: feedbackUrl,
                        target: '_blank',
                        track: () => handleAction('feedback'),
                    })}
                >
                    {renderActionIcon('💬', <LuMessageSquarePlus aria-hidden="true" size={18} />, styles.actionIconFeedback)}
                    <span>{labels.feedback}</span>
                </a>
            )}
        </div>
    );
}
