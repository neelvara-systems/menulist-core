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
import { normalizeOBPExternalHttpsUrl, normalizeOBPGoogleMapsUrl, normalizeOBPReviewUrl } from '@lib/obp/publicLinks';
import { buildTelHref, buildWhatsAppPhoneParam } from '@lib/phone/phoneNumber';
import { useState, type ReactNode } from 'react';
import { LuCalendarCheck, LuMessageSquarePlus, LuPhone, LuShoppingBag } from 'react-icons/lu';
import { TbBrandGoogleFilled, TbBrandWhatsapp, TbMapPinFilled } from 'react-icons/tb';
import styles from './obp.module.scss';

export type OBPActionPlaceholder = 'call' | 'whatsapp' | 'directions' | 'reserve' | 'order' | 'reviews' | 'feedback';
type OBPOpenHoursState = 'open' | 'closed' | 'unknown';

interface OBPActionsProps {
    tenantId: number;
    storeId: number;
    trackingEnabled?: boolean;
    includeLocation?: boolean;
    storeTimeZone?: string;
    businessDayEndTime?: string;
    openHoursState?: OBPOpenHoursState;
    countryCode?: string;
    dialCode?: string;
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
    placeholderActions?: OBPActionPlaceholder[];
    placeholderMessage?: string;
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
    includeLocation = false,
    storeTimeZone,
    businessDayEndTime,
    openHoursState = 'unknown',
    countryCode,
    dialCode,
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
    placeholderActions = [],
    placeholderMessage,
    labels,
}: OBPActionsProps) {
    const [placeholderNotice, setPlaceholderNotice] = useState('');
    const safeDirectionsUrl = normalizeOBPGoogleMapsUrl(directionsUrl);
    const safeReservationUrl = normalizeOBPExternalHttpsUrl(reservationUrl);
    const safeOrderUrl = normalizeOBPExternalHttpsUrl(orderUrl);
    const safeGoogleReviewUrl = normalizeOBPReviewUrl(googleReviewUrl);
    const hasAnyAction = showCall || showWhatsApp || (showDirections && !!safeDirectionsUrl) || (showReservation && !!safeReservationUrl) || (showOrder && !!safeOrderUrl) || (showGoogleReview && !!safeGoogleReviewUrl) || (showFeedback && !!feedbackUrl) || placeholderActions.length > 0;
    if (!hasAnyAction) return null;

    const handleAction = (action: 'call' | 'whatsapp' | 'directions' | 'reserve' | 'order' | 'feedback') => {
        if (!trackingEnabled) return Promise.resolve();
        return trackOBPAction(storeId, action, {
            tenantId,
            sessionId: getSessionId(),
            storeTimeZone,
            businessDayEndTime,
            openHoursState,
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
            openHoursState,
            includeLocation,
        });
    };

    const callHref = buildTelHref({ countryCode, dialCode, phoneNumber }) || '';
    const whatsappDigits = buildWhatsAppPhoneParam({ countryCode, dialCode, phoneNumber: whatsappNumber });
    const whatsappHref = whatsappDigits ? `https://wa.me/${whatsappDigits}` : '';
    const renderActionIcon = (emoji: string, icon: ReactNode, className?: string) => (
        <span className={`${styles.actionIcon} ${className || ''} ${iconVariant === 'emoji' ? styles.actionIconEmojiMode : ''}`}>
            {iconVariant === 'emoji' ? <span aria-hidden="true" className={styles.actionEmoji}>{emoji}</span> : icon}
        </span>
    );
    const handlePlaceholderClick = (label: string) => {
        setPlaceholderNotice(placeholderMessage || `${label} is not set yet.`);
    };
    const renderPlaceholderIcon = (action: OBPActionPlaceholder) => {
        switch (action) {
            case 'call':
                return renderActionIcon('☎️', <LuPhone aria-hidden="true" size={20} />, styles.actionIconCall);
            case 'whatsapp':
                return renderActionIcon('🟢', <TbBrandWhatsapp aria-hidden="true" size={19} />, styles.actionIconWhatsapp);
            case 'directions':
                return renderActionIcon('📍', <TbMapPinFilled aria-hidden="true" size={19} />, styles.actionIconDirections);
            case 'reviews':
                return renderActionIcon('⭐', <TbBrandGoogleFilled aria-hidden="true" size={18} />, styles.actionIconGoogle);
            case 'reserve':
                return renderActionIcon('📅', <LuCalendarCheck aria-hidden="true" size={18} />, styles.actionIconReserve);
            case 'order':
                return renderActionIcon('🛍️', <LuShoppingBag aria-hidden="true" size={18} />, styles.actionIconOrder);
            case 'feedback':
                return renderActionIcon('💬', <LuMessageSquarePlus aria-hidden="true" size={18} />, styles.actionIconFeedback);
            default:
                return null;
        }
    };
    const renderedRealActions = new Set<OBPActionPlaceholder>([
        ...(showCall && phoneNumber ? ['call' as const] : []),
        ...(showWhatsApp && whatsappNumber ? ['whatsapp' as const] : []),
        ...(showDirections && safeDirectionsUrl ? ['directions' as const] : []),
        ...(showReservation && safeReservationUrl ? ['reserve' as const] : []),
        ...(showOrder && safeOrderUrl ? ['order' as const] : []),
        ...(showGoogleReview && safeGoogleReviewUrl ? ['reviews' as const] : []),
        ...(showFeedback && feedbackUrl ? ['feedback' as const] : []),
    ]);
    const placeholderLabels: Record<OBPActionPlaceholder, string> = {
        call: labels.call,
        whatsapp: labels.whatsapp,
        directions: labels.directions,
        reserve: labels.reserve,
        order: labels.order,
        reviews: labels.reviews,
        feedback: labels.feedback,
    };
    const visiblePlaceholderActions = placeholderActions.filter((action) => !renderedRealActions.has(action));

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
            {showDirections && safeDirectionsUrl && (
                <a
                    href={safeDirectionsUrl}
                    className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => trackBeforeNavigate({
                        event,
                        href: safeDirectionsUrl,
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
            {showGoogleReview && safeGoogleReviewUrl && (
                <a
                    href={safeGoogleReviewUrl}
                    className={`${styles.actionButton} ${styles.actionButtonUtility}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => trackBeforeNavigate({
                        event,
                        href: safeGoogleReviewUrl,
                        target: '_blank',
                        track: handleGoogleReview,
                    })}
                >
                    {renderActionIcon('⭐', <TbBrandGoogleFilled aria-hidden="true" size={18} />, styles.actionIconGoogle)}
                    <span>{labels.reviews}</span>
                </a>
            )}
            {showReservation && safeReservationUrl && (
                <a
                    href={safeReservationUrl}
                    className={`${styles.actionButton} ${styles.actionButtonUtility}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => trackBeforeNavigate({
                        event,
                        href: safeReservationUrl,
                        target: '_blank',
                        track: () => handleAction('reserve'),
                    })}
                >
                    {renderActionIcon('📅', <LuCalendarCheck aria-hidden="true" size={18} />, styles.actionIconReserve)}
                    <span>{labels.reserve}</span>
                </a>
            )}
            {showOrder && safeOrderUrl && (
                <a
                    href={safeOrderUrl}
                    className={`${styles.actionButton} ${styles.actionButtonUtility}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => trackBeforeNavigate({
                        event,
                        href: safeOrderUrl,
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
            {visiblePlaceholderActions.map((action) => {
                const label = placeholderLabels[action];
                return (
                    <button
                        key={`placeholder-${action}`}
                        type="button"
                        className={`${styles.actionButton} ${styles.actionButtonUtility} ${styles.actionButtonPlaceholder}`}
                        aria-label={`${label}. ${placeholderMessage || 'Not set yet.'}`}
                        onClick={() => handlePlaceholderClick(label)}
                    >
                        {renderPlaceholderIcon(action)}
                        <span>{label}</span>
                    </button>
                );
            })}
            {placeholderNotice ? (
                <div className={styles.placeholderNotice} role="status">
                    {placeholderNotice}
                </div>
            ) : null}
        </div>
    );
}
