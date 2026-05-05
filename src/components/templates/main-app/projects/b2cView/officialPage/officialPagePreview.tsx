import { getBrandName } from '@lib/businessIdentity/names';
import { getNextIntlLocaleForPublicLanguage } from '@lib/localization/publicRenderLanguage';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { StoreDataType } from '@type/platform/store';
import { formatClockTime } from '@util/dateTime';
import type { CSSProperties } from 'react';
import type { IconType } from 'react-icons';
import { LuBadgeCheck, LuCalendarDays, LuClock, LuMapPin, LuMessageSquare, LuMessageSquarePlus, LuPhone, LuShoppingBag, LuStar } from 'react-icons/lu';
import { getOBPTranslations } from '@/app/client/obp/i18n';
import PublicMenuListAttribution from '@/components/customer/PublicMenuListAttribution';
import { DeviceTypes, PageType } from '../types';
import styles from '@/app/client/obp/obp.module.scss';

interface OfficialPagePreviewProps {
    activeDeviceType: DeviceTypes;
    activeLanguage: string;
    hasFeedbackTarget?: boolean;
    setActivePage?: (page: PageType) => void;
    storeDetails: StoreDataType;
}

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
function getLocalizedPresenceText(value: unknown, language: string, fallback = ''): string {
    return getLocalizedText(
        value as any,
        language,
        getPrimaryLocalizedLanguage(value as any, language),
        fallback,
    );
}

function getTodayDayKey(timeZone?: string): string {
    try {
        const weekday = new Intl.DateTimeFormat('en-US', {
            timeZone: timeZone || 'Asia/Kolkata',
            weekday: 'short',
        }).format(new Date()).toLowerCase().slice(0, 3);
        return DAY_KEYS.includes(weekday) ? weekday : DAY_KEYS[new Date().getDay()] || 'mon';
    } catch {
        return DAY_KEYS[new Date().getDay()] || 'mon';
    }
}

function formatHours(hours?: string, closedLabel = 'Closed'): string {
    if (!hours || hours.toLowerCase() === 'closed') return closedLabel;
    const [openTime, closeTime] = hours.split('-').map((part) => part.trim());
    if (!openTime || !closeTime) return hours.replace('-', ' - ');
    return `${formatClockTime(openTime)} - ${formatClockTime(closeTime)}`;
}

function getFullAddress(storeDetails: StoreDataType): string {
    return [
        storeDetails?.addressLine,
        storeDetails?.area,
        storeDetails?.city,
        storeDetails?.state,
    ].filter(Boolean).join(', ');
}

export default function OfficialPagePreview({
    activeDeviceType,
    activeLanguage,
    hasFeedbackTarget = false,
    setActivePage,
    storeDetails,
}: OfficialPagePreviewProps) {
    const publicPresence = storeDetails?.publicPresence || {};
    const accentColor = publicPresence.accentColor || '#111111';
    const language = activeLanguage || String(storeDetails?.defaultLanguage || 'en');
    const t = getOBPTranslations(getNextIntlLocaleForPublicLanguage(language));
    const storeName = getBrandName(storeDetails, 'Official Page');
    const descriptor = getLocalizedPresenceText(publicPresence.descriptor, language, '');
    const knownFor = getLocalizedPresenceText(publicPresence.knownFor, language, '');
    const specialNote = getLocalizedPresenceText(publicPresence.specialNote, language, '');
    const iconVariant = publicPresence.iconVariant || 'icons';
    const firstLetter = storeName.trim().charAt(0).toUpperCase() || 'M';
    const photos = (publicPresence.photos || []).filter(Boolean).slice(0, 3);
    const fullAddress = getFullAddress(storeDetails);
    const todayKey = getTodayDayKey(storeDetails?.timeZone);
    const rawTodayHours = storeDetails?.workingHours?.[todayKey];
    const todayHours = formatHours(rawTodayHours, t('publicClosed'));
    const isClosed = !rawTodayHours || rawTodayHours.toLowerCase() === 'closed';
    const isDesktop = activeDeviceType === 'desktop';
    const hasGoogleReview = Boolean(publicPresence.googleReviewUrl && publicPresence.googleRating);
    const officialPageLabel = t('publicOfficialPagePoweredBy').split('·')[0]?.trim() || t('publicOfficialPagePoweredBy');
    const renderPreviewIcon = (Icon: IconType, emoji: string, size = 16) => (
        iconVariant === 'emoji'
            ? <span aria-hidden="true" className={styles.actionEmoji}>{emoji}</span>
            : <Icon aria-hidden="true" size={size} />
    );
    const quickActions = [
        publicPresence.showCall !== false && storeDetails?.phoneNumber ? { label: t('publicActionCall'), Icon: LuPhone, emoji: '☎️' } : null,
        publicPresence.showDirections !== false && (publicPresence.googleMapsUrl || fullAddress) ? { label: t('publicActionDirections'), Icon: LuMapPin, emoji: '📍' } : null,
        publicPresence.showWhatsApp !== false && (publicPresence.whatsappNumber || storeDetails?.phoneNumber) ? { label: t('publicActionWhatsApp'), Icon: LuMessageSquare, emoji: '🟢' } : null,
        publicPresence.showGoogleReview !== false && publicPresence.googleReviewUrl ? { label: t('publicActionReviews'), Icon: LuStar, emoji: '⭐' } : null,
        publicPresence.showReservation !== false && publicPresence.reservationUrl ? { label: t('publicActionReserve'), Icon: LuCalendarDays, emoji: '📅' } : null,
        publicPresence.showOrder !== false && publicPresence.orderUrl ? { label: t('publicActionOrder'), Icon: LuShoppingBag, emoji: '🛍️' } : null,
        publicPresence.showFeedback !== false && storeDetails?.feedbackEnabled !== false && hasFeedbackTarget ? { label: t('publicActionFeedback'), Icon: LuMessageSquarePlus, emoji: '💬' } : null,
    ].filter(Boolean) as Array<{ label: string; Icon: IconType; emoji: string }>;

    return (
        <main
            className={styles.page}
            data-obp-page="true"
            style={{
                '--obp-accent': accentColor,
                minHeight: '100%',
            } as CSSProperties}
        >
            <div
                className={styles.shell}
                style={{
                    maxWidth: isDesktop ? 720 : undefined,
                    paddingInline: isDesktop ? 24 : undefined,
                }}
            >
                <section className={styles.identity} aria-label={storeName}>
                    <div className={styles.identityHeader}>
                        {storeDetails?.logo ? (
                            <img
                                alt={storeName}
                                className={styles.logo}
                                height={72}
                                src={storeDetails.logo}
                                width={72}
                            />
                        ) : (
                            <div className={styles.logoFallback} style={{ background: accentColor }}>
                                {firstLetter}
                            </div>
                        )}
                        <div className={styles.identityText}>
                            <h1 className={styles.name}>{storeName}</h1>
                            {descriptor ? <p className={styles.descriptor}>{descriptor}</p> : null}
                            <div className={styles.identityPills}>
                                {[storeDetails?.area || storeDetails?.city, storeDetails?.businessType].filter(Boolean).slice(0, 3).map((pill) => (
                                    <span className={styles.identityPill} key={String(pill)}>{pill}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className={styles.trustRow}>
                        <div className={`${styles.statusBadge} ${isClosed ? styles.statusClosed : styles.statusOpen}`}>
                            {isClosed ? renderPreviewIcon(LuClock, '🕒', 14) : <span className={`${styles.statusDot} ${styles.statusDotOpen}`} />}
                            {isClosed ? t('publicClosed') : t('publicOpenToday', { hours: todayHours })}
                        </div>
                        <span className={styles.officialBadge}>
                            {renderPreviewIcon(LuBadgeCheck, '✅', 14)}
                            {officialPageLabel}
                        </span>
                        <span className={styles.freshnessBadge}>{t('publicInfoVerifiedToday')}</span>
                        {hasGoogleReview ? (
                            <span className={styles.reviewLink}>
                                {publicPresence.googleReviewCount
                                    ? t('publicGoogleRatingWithCount', { rating: publicPresence.googleRating, count: publicPresence.googleReviewCount })
                                    : t('publicGoogleRating', { rating: publicPresence.googleRating })}
                            </span>
                        ) : null}
                    </div>

                    {(knownFor || publicPresence.establishedYear) ? (
                        <p className={styles.identityMeta}>
                            {[knownFor ? t('publicKnownForPrefix', { value: knownFor }) : null, publicPresence.establishedYear ? t('publicServingSince', { year: publicPresence.establishedYear }) : null].filter(Boolean).join(' · ')}
                        </p>
                    ) : null}
                </section>

                <div className={styles.primaryCta}>
                    <button
                        className={styles.menuButton}
                        onClick={() => setActivePage?.(PageType.MENU)}
                        style={{ background: accentColor }}
                        type="button"
                    >
                        {t('publicViewMenu')}
                    </button>
                </div>

                {quickActions.length > 0 ? (
                    <div className={styles.actions}>
                        {quickActions.map(({ label, Icon, emoji }) => (
                            <span className={styles.actionButton} key={label}>
                                <span className={`${styles.actionIcon} ${iconVariant === 'emoji' ? styles.actionIconEmojiMode : ''}`}>
                                    {renderPreviewIcon(Icon, emoji)}
                                </span>
                                {label}
                            </span>
                        ))}
                    </div>
                ) : null}

                {photos.length > 0 ? (
                    <div className={styles.photoStrip}>
                        {photos.map((photo, index) => (
                            <button className={styles.photoButton} key={`${photo}-${index}`} type="button">
                                <img alt={`${storeName} ${t('publicPhotoLabel', { index: index + 1 })}`} src={photo} />
                            </button>
                        ))}
                    </div>
                ) : null}

                {specialNote ? (
                    <section className={styles.note}>
                        <h2 className={styles.groupTitle}>{t('publicSpecialNote')}</h2>
                        <p className={styles.noteText}>{specialNote}</p>
                    </section>
                ) : null}

                {(fullAddress || todayHours) ? (
                    <section className={`${styles.info} ${styles.locationInfo}`} aria-label="Location">
                        <h2 className={styles.groupTitle}>
                            <span className={styles.groupTitleIcon}>{renderPreviewIcon(LuMapPin, '📍')}</span>
                            {t('publicLocation')}
                        </h2>
                        {fullAddress ? <p className={styles.locationAddress}>{fullAddress}</p> : null}
                        <div className={styles.infoRow}>
                            <span className={styles.infoIcon}>{renderPreviewIcon(LuClock, '🕒')}</span>
                            <span>{isClosed ? t('publicClosedToday') : t('publicOpenToday', { hours: todayHours })}</span>
                        </div>
                    </section>
                ) : null}

                {storeDetails?.workingHours ? (
                    <section className={`${styles.info} ${styles.utilityInfo}`} aria-label="Business Hours">
                        <h2 className={styles.groupTitle}>
                            <span className={styles.groupTitleIcon}>{renderPreviewIcon(LuCalendarDays, '📅')}</span>
                            {t('publicBusinessHours')}
                        </h2>
                        <div className={styles.hoursList}>
                            {DAY_ORDER.map((day) => (
                                <div className={`${styles.hoursRow} ${todayKey === day ? styles.hoursRowToday : ''}`} key={day}>
                                    <span className={styles.hoursDay}>{t(`publicDays.${day}`)}</span>
                                    <span className={`${styles.hoursTime} ${formatHours(storeDetails.workingHours?.[day], t('publicClosed')) === t('publicClosed') ? styles.hoursClosed : ''}`}>
                                        {formatHours(storeDetails.workingHours?.[day], t('publicClosed'))}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null}

                <footer className={styles.footer}>
                    <PublicMenuListAttribution
                        mode="compact"
                        surfaceLabel={t('publicOfficialPagePoweredBy')}
                        rightsLabel={t('publicAllRightsReserved')}
                        ctaLabel={null}
                        mutedColor="#bbb"
                    />
                    <div className={styles.policyLinks}>
                        {publicPresence.showPrivacyLink !== false ? <span>{t('publicPrivacy')}</span> : null}
                        {publicPresence.showTermsLink !== false ? <span>{t('publicTerms')}</span> : null}
                        {publicPresence.showRefundLink !== false ? <span>{t('publicRefund')}</span> : null}
                    </div>
                </footer>
            </div>
        </main>
    );
}
