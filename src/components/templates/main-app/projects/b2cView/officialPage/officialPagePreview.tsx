import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { StoreDataType } from '@type/platform/store';
import { formatClockTime } from '@util/dateTime';
import type { CSSProperties } from 'react';
import { LuBadgeCheck, LuCalendarDays, LuClock, LuMapPin, LuMessageSquare, LuPhone, LuShoppingBag, LuStar } from 'react-icons/lu';
import { DeviceTypes, PageType } from '../types';
import styles from '@/app/client/obp/obp.module.scss';

interface OfficialPagePreviewProps {
    activeDeviceType: DeviceTypes;
    activeLanguage: string;
    setActivePage?: (page: PageType) => void;
    storeDetails: StoreDataType;
}

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS: Record<string, string> = {
    mon: 'Monday',
    tue: 'Tuesday',
    wed: 'Wednesday',
    thu: 'Thursday',
    fri: 'Friday',
    sat: 'Saturday',
    sun: 'Sunday',
};

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
        return DAY_ORDER.includes(weekday) ? weekday : DAY_ORDER[new Date().getDay()] || 'mon';
    } catch {
        return DAY_ORDER[new Date().getDay()] || 'mon';
    }
}

function formatHours(hours?: string): string {
    if (!hours || hours.toLowerCase() === 'closed') return 'Closed';
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
    setActivePage,
    storeDetails,
}: OfficialPagePreviewProps) {
    const publicPresence = storeDetails?.publicPresence || {};
    const accentColor = publicPresence.accentColor || '#111111';
    const language = activeLanguage || String(storeDetails?.defaultLanguage || 'en');
    const storeName = getLocalizedPresenceText(publicPresence.displayName, language, storeDetails?.name || 'Official Page');
    const descriptor = getLocalizedPresenceText(publicPresence.descriptor, language, '');
    const knownFor = getLocalizedPresenceText(publicPresence.knownFor, language, '');
    const specialNote = getLocalizedPresenceText(publicPresence.specialNote, language, '');
    const firstLetter = storeName.trim().charAt(0).toUpperCase() || 'M';
    const photos = (publicPresence.photos || []).filter(Boolean).slice(0, 3);
    const fullAddress = getFullAddress(storeDetails);
    const todayKey = getTodayDayKey(storeDetails?.timeZone);
    const todayHours = formatHours(storeDetails?.workingHours?.[todayKey]);
    const isClosed = todayHours === 'Closed';
    const isDesktop = activeDeviceType === 'desktop';
    const quickActions = [
        publicPresence.showCall !== false && storeDetails?.phoneNumber ? { label: 'Call', Icon: LuPhone } : null,
        publicPresence.showDirections !== false && (publicPresence.googleMapsUrl || fullAddress) ? { label: 'Directions', Icon: LuMapPin } : null,
        publicPresence.showWhatsApp !== false && (publicPresence.whatsappNumber || storeDetails?.phoneNumber) ? { label: 'WhatsApp', Icon: LuMessageSquare } : null,
        publicPresence.showGoogleReview !== false && publicPresence.googleReviewUrl ? { label: 'Reviews', Icon: LuStar } : null,
        publicPresence.showReservation !== false && publicPresence.reservationUrl ? { label: 'Reserve', Icon: LuCalendarDays } : null,
        publicPresence.showOrder !== false && publicPresence.orderUrl ? { label: 'Order', Icon: LuShoppingBag } : null,
    ].filter(Boolean) as Array<{ label: string; Icon: typeof LuPhone }>;

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
                {photos.length > 0 ? (
                    <div className={styles.photoStrip}>
                        {photos.map((photo, index) => (
                            <button className={styles.photoButton} key={`${photo}-${index}`} type="button">
                                <img alt={`${storeName} photo ${index + 1}`} src={photo} />
                            </button>
                        ))}
                    </div>
                ) : null}

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
                            {isClosed ? <LuClock aria-hidden="true" size={14} /> : <span className={`${styles.statusDot} ${styles.statusDotOpen}`} />}
                            {isClosed ? 'Closed' : `Open · Today ${todayHours}`}
                        </div>
                        <span className={styles.officialBadge}>
                            <LuBadgeCheck aria-hidden="true" size={14} />
                            Official Page
                        </span>
                    </div>

                    {(knownFor || publicPresence.establishedYear) ? (
                        <p className={styles.identityMeta}>
                            {[knownFor ? `Known for: ${knownFor}` : null, publicPresence.establishedYear ? `Serving since ${publicPresence.establishedYear}` : null].filter(Boolean).join(' · ')}
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
                        View Menu
                    </button>
                </div>

                {quickActions.length > 0 ? (
                    <div className={styles.actions}>
                        {quickActions.map(({ label, Icon }) => (
                            <span className={styles.actionButton} key={label}>
                                <span className={styles.actionIcon}><Icon aria-hidden="true" size={16} /></span>
                                {label}
                            </span>
                        ))}
                    </div>
                ) : null}

                {specialNote ? (
                    <section className={styles.note}>
                        <h2 className={styles.groupTitle}>Special note</h2>
                        <p className={styles.noteText}>{specialNote}</p>
                    </section>
                ) : null}

                {(fullAddress || todayHours) ? (
                    <section className={`${styles.info} ${styles.locationInfo}`} aria-label="Location">
                        <h2 className={styles.groupTitle}>
                            <span className={styles.groupTitleIcon}><LuMapPin aria-hidden="true" size={16} /></span>
                            Location
                        </h2>
                        {fullAddress ? <p className={styles.locationAddress}>{fullAddress}</p> : null}
                        <div className={styles.infoRow}>
                            <span className={styles.infoIcon}><LuClock aria-hidden="true" size={16} /></span>
                            <span>Open today: {todayHours}</span>
                        </div>
                    </section>
                ) : null}

                {storeDetails?.workingHours ? (
                    <section className={`${styles.info} ${styles.utilityInfo}`} aria-label="Business Hours">
                        <h2 className={styles.groupTitle}>
                            <span className={styles.groupTitleIcon}><LuCalendarDays aria-hidden="true" size={16} /></span>
                            Business Hours
                        </h2>
                        <div className={styles.hoursList}>
                            {DAY_ORDER.map((day) => (
                                <div className={`${styles.hoursRow} ${todayKey === day ? styles.hoursRowToday : ''}`} key={day}>
                                    <span className={styles.hoursDay}>{DAY_LABELS[day]}</span>
                                    <span className={`${styles.hoursTime} ${formatHours(storeDetails.workingHours?.[day]) === 'Closed' ? styles.hoursClosed : ''}`}>
                                        {formatHours(storeDetails.workingHours?.[day])}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null}

                <footer className={styles.footer}>
                    <div className={styles.freshnessBadge}>Info verified today</div>
                    <div className={styles.policyLinks}>
                        {publicPresence.showPrivacyLink !== false ? <span>Privacy</span> : null}
                        {publicPresence.showTermsLink !== false ? <span>Terms</span> : null}
                        {publicPresence.showRefundLink !== false ? <span>Refund</span> : null}
                    </div>
                </footer>
            </div>
        </main>
    );
}
