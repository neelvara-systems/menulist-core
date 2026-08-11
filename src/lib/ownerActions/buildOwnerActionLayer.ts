import type { StoreDataType } from '@type/platform/store';
import { isPublishedMenuProject } from '@lib/menuPresence/presenceReadiness';
import { normalizeStarterActivationTimestamp } from '@lib/onboarding/starterActivation';

export type OwnerActionTone = 'attention' | 'ready' | 'stable';

export type OwnerActionId =
    | 'set_customer_link'
    | 'set_hours'
    | 'publish_menu'
    | 'place_customer_link'
    | 'open_private_feedback'
    | 'capture_daily_change'
    | 'set_today_status'
    | 'prepare_staff_handoff'
    | 'update_prices';

export type OwnerActionMobileTarget =
    | { type: 'menuTab' }
    | { type: 'shareTab' }
    | { screen: 'domainSettings' | 'feedback' | 'hoursEdit' | 'presenceMonitor' | 'tempStatus' | 'aiMenuManager'; type: 'moreScreen' };

export interface OwnerActionItem {
    description: string;
    desktopHref: string;
    id: OwnerActionId;
    label: string;
    mobileTarget: OwnerActionMobileTarget;
    statusLabel: string;
    tone: OwnerActionTone;
}

export interface OwnerPlacementProof {
    confirmedCount: number;
    latestConfirmedDays: number | null;
    latestConfirmedLabel: string;
    latestConfirmedTimestamp?: string;
    missingLabels: string[];
    stale: boolean;
}

export interface OwnerActionLayerSummary {
    actions: OwnerActionItem[];
    openCount: number;
    placement: OwnerPlacementProof;
    primaryAction: OwnerActionItem;
    statusLabel: string;
    supportingActions: OwnerActionItem[];
}

interface BuildOwnerActionLayerInput {
    now?: Date;
    project?: {
        active?: unknown;
        deleted?: unknown;
        lastPublishedAt?: unknown;
        projectId?: unknown;
    } | null;
    storeDetails?: Partial<StoreDataType> | null;
    translate?: OwnerActionTranslator;
}

type OwnerActionTranslationValues = Record<string, string | number>;
export type OwnerActionTranslator = (key: string, values?: OwnerActionTranslationValues) => string;

const PLACEMENT_SURFACES = [
    { key: 'googleBusiness', label: 'Google' },
    { key: 'instagramBio', label: 'Instagram' },
    { key: 'whatsappProfile', label: 'WhatsApp' },
] as const;

const PLACEMENT_STALE_DAYS = 45;

function hasNonEmptyString(value: unknown): boolean {
    return typeof value === 'string' && value.trim().length > 0;
}

export function hasOwnerWorkingHours(storeDetails?: Partial<StoreDataType> | null): boolean {
    const workingHours = storeDetails?.workingHours;
    return Boolean(
        workingHours
        && typeof workingHours === 'object'
        && !Array.isArray(workingHours)
        && Object.values(workingHours).some((value) => (
            typeof value === 'string' && value.trim().length > 0
        )),
    );
}

export function hasOwnerPublicLink(storeDetails?: Partial<StoreDataType> | null): boolean {
    return hasNonEmptyString(storeDetails?.customDomain)
        || hasNonEmptyString(storeDetails?.subdomain);
}

function getOwnerConfirmedPlacements(storeDetails?: Partial<StoreDataType> | null) {
    return PLACEMENT_SURFACES
        .map((surface) => ({
            ...surface,
            timestamp: normalizeStarterActivationTimestamp(storeDetails?.menuPresence?.[surface.key]),
        }))
        .filter((surface): surface is typeof surface & { timestamp: string } => Boolean(surface.timestamp));
}

export function getOwnerConfirmedPlacementCount(
    storeDetails?: Partial<StoreDataType> | null,
): number {
    return getOwnerConfirmedPlacements(storeDetails).length;
}

function daysSince(timestamp: string | undefined, now: Date): number | null {
    if (!timestamp) return null;
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) return null;
    return Math.max(0, Math.floor((now.getTime() - parsed.getTime()) / 86400000));
}

function copy(
    translate: OwnerActionTranslator | undefined,
    key: string,
    fallback: string,
    values?: OwnerActionTranslationValues,
): string {
    return translate ? translate(key, values) : fallback;
}

function formatPlacementAge(
    timestamp: string | undefined,
    now: Date,
    translate?: OwnerActionTranslator,
): string {
    const days = daysSince(timestamp, now);
    if (days === null) return copy(translate, 'placement.notConfirmed', 'Not confirmed yet');
    if (days === 0) return copy(translate, 'placement.today', 'Confirmed today');
    if (days === 1) return copy(translate, 'placement.yesterday', 'Confirmed yesterday');
    return copy(translate, 'placement.daysAgo', `Confirmed ${days} days ago`, { count: days });
}

function action(input: OwnerActionItem): OwnerActionItem {
    return input;
}

export function buildOwnerActionLayer({
    now = new Date(),
    project,
    storeDetails,
    translate,
}: BuildOwnerActionLayerInput): OwnerActionLayerSummary {
    const hasProject = hasNonEmptyString(project?.projectId);
    const menuPublished = isPublishedMenuProject(project);
    const menuVisible = project ? project.active !== false && project.deleted !== true : true;
    const publicLinkReady = hasOwnerPublicLink(storeDetails);
    const hoursReady = hasOwnerWorkingHours(storeDetails);
    const feedbackReady = storeDetails ? storeDetails.feedbackEnabled !== false : false;
    const confirmedPlacements = getOwnerConfirmedPlacements(storeDetails);
    const latestConfirmedTimestamp = confirmedPlacements
        .map((surface) => surface.timestamp)
        .sort((a, b) => b.localeCompare(a))[0];
    const latestConfirmedDays = daysSince(latestConfirmedTimestamp, now);
    const placement: OwnerPlacementProof = {
        confirmedCount: confirmedPlacements.length,
        latestConfirmedDays,
        latestConfirmedLabel: formatPlacementAge(latestConfirmedTimestamp, now, translate),
        latestConfirmedTimestamp,
        missingLabels: PLACEMENT_SURFACES
            .filter((surface) => !confirmedPlacements.some((confirmed) => confirmed.key === surface.key))
            .map((surface) => surface.label),
        stale: latestConfirmedDays !== null && latestConfirmedDays > PLACEMENT_STALE_DAYS,
    };

    const setCustomerLink = action({
        description: copy(translate, 'items.setCustomerLink.description', 'Create the customer link before sharing QR, staff replies, or public profiles.'),
        desktopHref: '/business-settings?section=search-discovery&focus=customer-link',
        id: 'set_customer_link',
        label: copy(translate, 'items.setCustomerLink.label', 'Set customer link'),
        mobileTarget: { type: 'moreScreen', screen: 'domainSettings' },
        statusLabel: publicLinkReady
            ? copy(translate, 'status.ready', 'Ready')
            : copy(translate, 'status.missing', 'Missing'),
        tone: publicLinkReady ? 'stable' : 'attention',
    });
    const setHours = action({
        description: copy(translate, 'items.setHours.description', 'Keep public open and closed status clear before customers visit.'),
        desktopHref: '/business-settings?section=hours&focus=working-hours',
        id: 'set_hours',
        label: copy(translate, 'items.setHours.label', 'Set hours'),
        mobileTarget: { type: 'moreScreen', screen: 'hoursEdit' },
        statusLabel: hoursReady
            ? copy(translate, 'status.set', 'Set')
            : copy(translate, 'status.missing', 'Missing'),
        tone: hoursReady ? 'stable' : 'attention',
    });
    const publishMenu = action({
        description: menuVisible
            ? copy(translate, 'items.publishMenu.descriptionVisible', 'Publish the current menu before wide sharing.')
            : copy(translate, 'items.publishMenu.descriptionHidden', 'Make the menu visible before customers use the link.'),
        desktopHref: '/projects',
        id: 'publish_menu',
        label: menuVisible
            ? copy(translate, 'items.publishMenu.labelPublish', 'Publish menu')
            : copy(translate, 'items.publishMenu.labelOpen', 'Open menu'),
        mobileTarget: { type: 'menuTab' },
        statusLabel: menuPublished && menuVisible
            ? copy(translate, 'status.live', 'Live')
            : copy(translate, 'status.notLive', 'Not live'),
        tone: menuPublished && menuVisible ? 'stable' : 'attention',
    });
    const placeCustomerLink = action({
        description: placement.confirmedCount > 0
            ? copy(translate, 'items.placeCustomerLink.descriptionPlaced', 'Keep Google, Instagram, and WhatsApp pointing to the same source.')
            : copy(translate, 'items.placeCustomerLink.descriptionUnplaced', 'Add the same customer link to Google, Instagram, WhatsApp, QR, and print.'),
        desktopHref: '/use-menulist',
        id: 'place_customer_link',
        label: placement.stale
            ? copy(translate, 'items.placeCustomerLink.labelConfirm', 'Confirm link placement')
            : copy(translate, 'items.placeCustomerLink.labelPlace', 'Place customer link'),
        mobileTarget: { type: 'moreScreen', screen: 'presenceMonitor' },
        statusLabel: copy(
            translate,
            'status.confirmedCount',
            `${placement.confirmedCount}/3 confirmed`,
            { count: placement.confirmedCount, total: PLACEMENT_SURFACES.length },
        ),
        tone: placement.confirmedCount === 0 || placement.stale ? 'attention' : 'ready',
    });
    const openPrivateFeedback = action({
        description: copy(translate, 'items.openPrivateFeedback.description', 'Use private feedback before guest issues turn into public reviews.'),
        desktopHref: '/feedback',
        id: 'open_private_feedback',
        label: copy(translate, 'items.openPrivateFeedback.label', 'Open private feedback'),
        mobileTarget: { type: 'moreScreen', screen: 'feedback' },
        statusLabel: feedbackReady
            ? copy(translate, 'status.on', 'On')
            : copy(translate, 'status.off', 'Off'),
        tone: feedbackReady ? 'ready' : 'attention',
    });
    const captureDailyChange = action({
        description: copy(translate, 'items.captureDailyChange.description', 'Tell MenuList what changed today and approve the prepared menu card.'),
        desktopHref: '/menu-manager',
        id: 'capture_daily_change',
        label: copy(translate, 'items.captureDailyChange.label', 'Tell MenuList what changed'),
        mobileTarget: { type: 'moreScreen', screen: 'aiMenuManager' },
        statusLabel: copy(translate, 'status.dailyChanges', 'Daily changes'),
        tone: 'ready',
    });
    const setTodayStatus = action({
        description: copy(translate, 'items.setTodayStatus.description', 'Set closed today, opening late, kitchen closed, or special menu notice.'),
        desktopHref: '/business-settings?section=hours&focus=temp-status',
        id: 'set_today_status',
        label: copy(translate, 'items.setTodayStatus.label', 'Set today status'),
        mobileTarget: { type: 'moreScreen', screen: 'tempStatus' },
        statusLabel: copy(translate, 'status.hoursException', 'Hours exception'),
        tone: 'ready',
    });
    const prepareStaffHandoff = action({
        description: copy(translate, 'items.prepareStaffHandoff.description', 'Give staff the menu link, QR, and customer reply lines from one place.'),
        desktopHref: '/use-menulist',
        id: 'prepare_staff_handoff',
        label: copy(translate, 'items.prepareStaffHandoff.label', 'Prepare staff handoff'),
        mobileTarget: { type: 'shareTab' },
        statusLabel: copy(translate, 'status.staffUse', 'Staff use'),
        tone: 'ready',
    });
    const updatePrices = action({
        description: copy(translate, 'items.updatePrices.description', 'Use Menu Manager for price changes, then approve before publishing.'),
        desktopHref: '/menu-manager',
        id: 'update_prices',
        label: copy(translate, 'items.updatePrices.label', 'Update prices'),
        mobileTarget: { type: 'moreScreen', screen: 'aiMenuManager' },
        statusLabel: copy(translate, 'status.menuPrices', 'Menu prices'),
        tone: 'ready',
    });

    const priorityActions = [
        hasProject && menuPublished && menuVisible ? null : publishMenu,
        hoursReady ? null : setHours,
        publicLinkReady ? null : setCustomerLink,
        placement.confirmedCount > 0 && !placement.stale ? null : placeCustomerLink,
        feedbackReady ? null : openPrivateFeedback,
    ].filter(Boolean) as OwnerActionItem[];
    const primaryAction = priorityActions[0] || captureDailyChange;
    const actions = [
        setCustomerLink,
        setHours,
        publishMenu,
        placeCustomerLink,
        openPrivateFeedback,
        captureDailyChange,
        setTodayStatus,
        prepareStaffHandoff,
        updatePrices,
    ];
    const supportingActions = actions
        .filter((item) => item.id !== primaryAction.id)
        .filter((item) => (
            item.id === 'place_customer_link'
            || item.id === 'open_private_feedback'
            || item.id === 'capture_daily_change'
            || item.id === 'set_today_status'
            || item.id === 'prepare_staff_handoff'
            || item.id === 'update_prices'
        ));

    return {
        actions,
        openCount: priorityActions.length,
        placement,
        primaryAction,
        statusLabel: priorityActions.length
            ? copy(translate, 'status.openCount', `${priorityActions.length} open`, { count: priorityActions.length })
            : copy(translate, 'status.stable', 'Stable'),
        supportingActions,
    };
}
