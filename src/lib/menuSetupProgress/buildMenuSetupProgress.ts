import { computeQualitySignals, type QualitySignal } from '@lib/mce/qualitySignals';
import {
    buildStarterActivationSummary,
    normalizeStarterActivationTimestamp,
} from '@lib/onboarding/starterActivation';
import type { ProjectFileType, Project } from '@template/main-app/projects/types/project.types';
import type { StoreDataType } from '@type/platform/store';

export type MenuSetupProgressPhase =
    | 'start'
    | 'prepare'
    | 'review'
    | 'publish'
    | 'place'
    | 'running';

export type MenuSetupProgressStepStatus =
    | 'done'
    | 'next'
    | 'optional'
    | 'needs_attention'
    | 'blocked';

export type MenuSetupProgressStepId =
    | 'source_added'
    | 'menu_imported'
    | 'key_details_checked'
    | 'menu_published'
    | 'link_placed'
    | 'descriptions_ready'
    | 'images_ready'
    | 'translations_ready'
    | 'obp_links_added'
    | 'obp_photo_added';

export type MenuSetupProgressActionId =
    | 'open_create_menu'
    | 'open_menu_editor'
    | 'open_menu_check'
    | 'open_publish'
    | 'open_share'
    | 'open_public_presence'
    | 'open_public_photos';

export interface MenuSetupProgressAction {
    id: MenuSetupProgressActionId;
    href: string;
    label: string;
}

export interface MenuSetupProgressStep {
    action?: MenuSetupProgressAction;
    description: string;
    done: boolean;
    group: 'required' | 'optional';
    id: MenuSetupProgressStepId;
    label: string;
    status: MenuSetupProgressStepStatus;
}

export interface MenuSetupProgressSummary {
    compactCopy: string;
    nextAction?: MenuSetupProgressAction;
    nextStep?: MenuSetupProgressStep;
    optionalDone: number;
    optionalSteps: MenuSetupProgressStep[];
    optionalTotal: number;
    phase: MenuSetupProgressPhase;
    progressPercent: number;
    requiredDone: number;
    requiredSteps: MenuSetupProgressStep[];
    requiredTotal: number;
    shouldShow: boolean;
    steps: MenuSetupProgressStep[];
}

interface BuildMenuSetupProgressInput {
    project?: (Project & Record<string, any>) | null;
    qualitySignals?: QualitySignal[];
    storeDetails?: Partial<StoreDataType> | null;
}

const CRITICAL_MENU_SETUP_SIGNAL_IDS = new Set(['prices', 'priceOutliers']);

function getAllItems(files: ProjectFileType[] | undefined) {
    if (!Array.isArray(files) || files.length === 0) return [];
    return files.flatMap((file) => (
        Array.isArray(file?.extractedData?.data?.items)
            ? file.extractedData.data.items.filter((item) => item && typeof item === 'object')
            : []
    ));
}

function hasText(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function hasStringValue(value: unknown): boolean {
    if (hasText(value)) return true;
    if (Array.isArray(value)) return value.some(hasStringValue);
    if (value && typeof value === 'object') {
        return Object.values(value as Record<string, unknown>).some(hasStringValue);
    }
    return false;
}

function getSignal(signals: QualitySignal[], id: string): QualitySignal | null {
    return signals.find((signal) => signal.id === id) || null;
}

function isSignalClear(signals: QualitySignal[], id: string, hasMenuItems: boolean): boolean {
    if (!hasMenuItems) return false;
    const signal = getSignal(signals, id);
    return !signal || signal.status === 'ok';
}

function buildAction(id: MenuSetupProgressActionId, label: string, href: string): MenuSetupProgressAction {
    return { id, href, label };
}

function buildStep(input: Omit<MenuSetupProgressStep, 'done'>): MenuSetupProgressStep {
    return {
        ...input,
        done: input.status === 'done',
    };
}

function resolveQualitySignals(project: BuildMenuSetupProgressInput['project'], qualitySignals?: QualitySignal[]) {
    if (qualitySignals) return qualitySignals;
    if (!Array.isArray(project?.files)) return [];

    return computeQualitySignals(project.files, project.languages, {
        projectPublicContent: project,
        showCategoryIcons: project?.config?.design?.menu?.showCategoryIcons ?? true,
        showItemPrices: project?.config?.design?.menu?.showItemPrices ?? true,
    });
}

export function buildMenuSetupProgress({
    project,
    qualitySignals,
    storeDetails,
}: BuildMenuSetupProgressInput): MenuSetupProgressSummary {
    const signals = resolveQualitySignals(project, qualitySignals);
    const files = Array.isArray(project?.files) ? project.files : [];
    const allItems = getAllItems(files);
    const activeItems = allItems.filter((item) => item.active !== false);
    const hasProjectSource = hasText(project?.projectId);
    const hasMenuItems = activeItems.length > 0;
    const criticalWarnings = signals.filter((signal) => (
        signal.status === 'warning' && CRITICAL_MENU_SETUP_SIGNAL_IDS.has(signal.id)
    ));
    const keyDetailsChecked = hasMenuItems && criticalWarnings.length === 0;
    const translationSignals = signals.filter((signal) => signal.id === 'translations' || signal.id === 'projectContent');
    const hasTranslationSignals = translationSignals.length > 0;
    const translationsReady = hasMenuItems && hasTranslationSignals && translationSignals.every((signal) => signal.status === 'ok');
    const translationWarning = translationSignals.find((signal) => signal.status === 'warning');
    const published = Boolean(normalizeStarterActivationTimestamp(project?.lastPublishedAt));
    const starterActivation = buildStarterActivationSummary(storeDetails as StoreDataType | null);
    const placementDone = published && (
        !starterActivation.appliesToStarterActivation
        || starterActivation.activated
    );
    const hasPublicLinks = hasStringValue(storeDetails?.socialMedia)
        || hasText(storeDetails?.publicPresence?.whatsappNumber)
        || hasText(storeDetails?.publicPresence?.googleMapsUrl)
        || hasText(storeDetails?.publicPresence?.reservationUrl)
        || hasText(storeDetails?.publicPresence?.orderUrl)
        || hasText(storeDetails?.publicPresence?.googleReviewUrl);
    const hasPublicPhoto = hasText(storeDetails?.publicPresence?.businessCover)
        || (Array.isArray(storeDetails?.publicPresence?.photos) && storeDetails.publicPresence.photos.some(hasText))
        || hasText((storeDetails as any)?.logo)
        || hasText(project?.projectImage);

    const requiredSteps: MenuSetupProgressStep[] = [
        buildStep({
            action: buildAction('open_create_menu', hasProjectSource ? 'Open menu' : 'Create menu', hasProjectSource ? '/projects' : '/create-menu'),
            description: hasProjectSource ? 'Menu source is connected.' : 'Add a menu photo, PDF, link, or start manually.',
            group: 'required',
            id: 'source_added',
            label: 'Source added',
            status: hasProjectSource ? 'done' : 'next',
        }),
        buildStep({
            action: buildAction('open_menu_editor', 'Open menu', '/projects'),
            description: hasMenuItems ? `${activeItems.length} visible item${activeItems.length === 1 ? '' : 's'} found.` : 'Import or add menu items.',
            group: 'required',
            id: 'menu_imported',
            label: 'Menu imported',
            status: hasMenuItems ? 'done' : hasProjectSource ? 'next' : 'blocked',
        }),
        buildStep({
            action: buildAction('open_menu_check', 'Review details', '/projects'),
            description: keyDetailsChecked
                ? 'Prices and key menu details are clear.'
                : criticalWarnings[0]?.label || 'Check prices and key details before publishing.',
            group: 'required',
            id: 'key_details_checked',
            label: 'Key details checked',
            status: keyDetailsChecked ? 'done' : hasMenuItems ? 'needs_attention' : 'blocked',
        }),
        buildStep({
            action: buildAction('open_publish', 'Publish menu', '/projects'),
            description: published ? 'Public menu has been published.' : 'Publish when the menu is ready for customers.',
            group: 'required',
            id: 'menu_published',
            label: 'Menu published',
            status: published ? 'done' : keyDetailsChecked ? 'next' : 'blocked',
        }),
        buildStep({
            action: buildAction('open_share', 'Open sharing tools', '/use-menulist'),
            description: placementDone
                ? 'Official link is ready for customers.'
                : starterActivation.appliesToStarterActivation
                    ? `${starterActivation.signalCount} of ${starterActivation.target} placement actions done.`
                    : 'Open the share tools when the menu is published.',
            group: 'required',
            id: 'link_placed',
            label: starterActivation.appliesToStarterActivation ? 'Link placed' : 'Link ready',
            status: placementDone ? 'done' : published ? 'next' : 'blocked',
        }),
    ];

    const optionalSteps: MenuSetupProgressStep[] = [
        buildStep({
            action: buildAction('open_menu_check', 'Prepare descriptions', '/projects'),
            description: isSignalClear(signals, 'descriptions', hasMenuItems)
                ? 'Visible items have descriptions.'
                : getSignal(signals, 'descriptions')?.label || 'Generate descriptions for clearer menu items.',
            group: 'optional',
            id: 'descriptions_ready',
            label: 'Descriptions ready',
            status: isSignalClear(signals, 'descriptions', hasMenuItems) ? 'done' : 'optional',
        }),
        buildStep({
            action: buildAction('open_menu_check', 'Add images', '/projects'),
            description: isSignalClear(signals, 'images', hasMenuItems)
                ? 'Visible items have images.'
                : getSignal(signals, 'images')?.label || 'Add or generate item images when useful.',
            group: 'optional',
            id: 'images_ready',
            label: 'Images ready',
            status: isSignalClear(signals, 'images', hasMenuItems) ? 'done' : 'optional',
        }),
        ...(hasTranslationSignals ? [
            buildStep({
                action: buildAction('open_menu_check', translationWarning ? 'Review language text' : 'Open menu check', '/projects'),
                description: translationsReady
                    ? 'Selected menu languages are complete.'
                    : translationWarning?.label || 'Review selected menu languages.',
                group: 'optional' as const,
                id: 'translations_ready' as const,
                label: 'Translations ready',
                status: translationsReady ? 'done' as const : 'optional' as const,
            }),
        ] : []),
        buildStep({
            action: buildAction('open_public_presence', 'Update public links', '/business-settings?section=business-profile&focus=official-page-actions'),
            description: hasPublicLinks ? 'Public action or social links are available.' : 'Add useful public links for the official business page.',
            group: 'optional',
            id: 'obp_links_added',
            label: 'Public links added',
            status: hasPublicLinks ? 'done' : 'optional',
        }),
        buildStep({
            action: buildAction('open_public_photos', 'Add public photo', '/business-settings?section=business-profile&focus=official-page-photos'),
            description: hasPublicPhoto ? 'Public photo is available.' : 'Add a cover, logo, or public photo when ready.',
            group: 'optional',
            id: 'obp_photo_added',
            label: 'Public photo added',
            status: hasPublicPhoto ? 'done' : 'optional',
        }),
    ];

    const requiredDone = requiredSteps.filter((step) => step.done).length;
    const optionalDone = optionalSteps.filter((step) => step.done).length;
    const nextStep = requiredSteps.find((step) => !step.done);
    const nextAction = nextStep?.action;
    const requiredTotal = requiredSteps.length;
    const progressPercent = requiredTotal ? Math.round((requiredDone / requiredTotal) * 100) : 0;

    const phase: MenuSetupProgressPhase = (() => {
        if (!hasProjectSource) return 'start';
        if (!hasMenuItems) return 'prepare';
        if (!keyDetailsChecked) return 'review';
        if (!published) return 'publish';
        if (!placementDone) return 'place';
        return 'running';
    })();

    const compactCopy = (() => {
        if (phase === 'running') return 'Menu setup is complete.';
        if (nextStep) return nextStep.description;
        return 'Menu setup is ready.';
    })();

    const shouldShow = phase !== 'running';

    return {
        compactCopy,
        nextAction,
        nextStep,
        optionalDone,
        optionalSteps,
        optionalTotal: optionalSteps.length,
        phase,
        progressPercent,
        requiredDone,
        requiredSteps,
        requiredTotal,
        shouldShow,
        steps: [...requiredSteps, ...optionalSteps],
    };
}
