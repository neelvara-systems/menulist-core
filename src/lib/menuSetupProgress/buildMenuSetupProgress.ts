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
    project?: (Project & Record<string, unknown>) | null;
    qualitySignals?: QualitySignal[];
    storeDetails?: Partial<StoreDataType> | null;
    translate?: MenuSetupProgressTranslator;
}

type MenuSetupProgressTranslationValues = Record<string, string | number>;
export type MenuSetupProgressTranslator = (
    key: string,
    values?: MenuSetupProgressTranslationValues,
) => string;

const CRITICAL_MENU_SETUP_SIGNAL_IDS = new Set(['prices', 'priceOutliers']);

function getAllItems(files: ProjectFileType[] | undefined) {
    if (!Array.isArray(files) || files.length === 0) return [];
    return files.flatMap((file) => (
        Array.isArray(file?.extractedData?.data?.items)
            ? file.extractedData.data.items.filter((item) => (
                item
                && typeof item === 'object'
                && hasText(item.id)
                && hasDirectStringValue(item.name)
            ))
            : []
    ));
}

function hasText(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function hasDirectStringValue(value: unknown): boolean {
    if (hasText(value)) return true;
    return Boolean(
        value
        && typeof value === 'object'
        && !Array.isArray(value)
        && Object.values(value as Record<string, unknown>).some(hasText),
    );
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

function copy(
    translate: MenuSetupProgressTranslator | undefined,
    key: string,
    fallback: string,
    values?: MenuSetupProgressTranslationValues,
): string {
    return translate ? translate(key, values) : fallback;
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
    translate,
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
    const published = (
        project?.active !== false
        && project?.deleted !== true
        && Boolean(normalizeStarterActivationTimestamp(project?.lastPublishedAt))
    );
    const starterActivation = buildStarterActivationSummary(storeDetails as StoreDataType | null);
    const placementDone = published && (
        !starterActivation.appliesToStarterActivation
        || starterActivation.activated
    );
    const hasPublicLinks = hasDirectStringValue(storeDetails?.socialMedia)
        || hasText(storeDetails?.publicPresence?.whatsappNumber)
        || hasText(storeDetails?.publicPresence?.googleMapsUrl)
        || hasText(storeDetails?.publicPresence?.reservationUrl)
        || hasText(storeDetails?.publicPresence?.orderUrl)
        || hasText(storeDetails?.publicPresence?.googleReviewUrl);
    const hasPublicPhoto = hasText(storeDetails?.publicPresence?.businessCover)
        || (Array.isArray(storeDetails?.publicPresence?.photos) && storeDetails.publicPresence.photos.some(hasText))
        || hasText(storeDetails?.logo)
        || hasText(project?.projectImage);

    const requiredSteps: MenuSetupProgressStep[] = [
        buildStep({
            action: buildAction(
                'open_create_menu',
                hasProjectSource
                    ? copy(translate, 'actions.openMenu', 'Open menu')
                    : copy(translate, 'actions.createMenu', 'Create menu'),
                hasProjectSource ? '/projects' : '/create-menu',
            ),
            description: hasProjectSource
                ? copy(translate, 'steps.sourceAdded.doneDescription', 'Menu source is connected.')
                : copy(translate, 'steps.sourceAdded.nextDescription', 'Add a menu photo, PDF, link, or start manually.'),
            group: 'required',
            id: 'source_added',
            label: copy(translate, 'steps.sourceAdded.label', 'Source added'),
            status: hasProjectSource ? 'done' : 'next',
        }),
        buildStep({
            action: buildAction('open_menu_editor', copy(translate, 'actions.openMenu', 'Open menu'), '/projects'),
            description: hasMenuItems
                ? copy(translate, 'steps.menuImported.doneDescription', `${activeItems.length} visible item${activeItems.length === 1 ? '' : 's'} found.`, { count: activeItems.length })
                : copy(translate, 'steps.menuImported.nextDescription', 'Import or add menu items.'),
            group: 'required',
            id: 'menu_imported',
            label: copy(translate, 'steps.menuImported.label', 'Menu imported'),
            status: hasMenuItems ? 'done' : hasProjectSource ? 'next' : 'blocked',
        }),
        buildStep({
            action: buildAction('open_menu_check', copy(translate, 'actions.reviewDetails', 'Review details'), '/projects'),
            description: keyDetailsChecked
                ? copy(translate, 'steps.keyDetailsChecked.doneDescription', 'Prices and key menu details are clear.')
                : copy(translate, 'steps.keyDetailsChecked.nextDescription', 'Check prices and key details before publishing.'),
            group: 'required',
            id: 'key_details_checked',
            label: copy(translate, 'steps.keyDetailsChecked.label', 'Key details checked'),
            status: keyDetailsChecked ? 'done' : hasMenuItems ? 'needs_attention' : 'blocked',
        }),
        buildStep({
            action: buildAction('open_publish', copy(translate, 'actions.publishMenu', 'Publish menu'), '/projects'),
            description: published
                ? copy(translate, 'steps.menuPublished.doneDescription', 'Public menu has been published.')
                : copy(translate, 'steps.menuPublished.nextDescription', 'Publish when the menu is ready for customers.'),
            group: 'required',
            id: 'menu_published',
            label: copy(translate, 'steps.menuPublished.label', 'Menu published'),
            status: published ? 'done' : keyDetailsChecked ? 'next' : 'blocked',
        }),
        buildStep({
            action: buildAction('open_share', copy(translate, 'actions.openSharingTools', 'Open sharing tools'), '/use-menulist'),
            description: placementDone
                ? copy(translate, 'steps.linkPlaced.doneDescription', 'Official link is ready for customers.')
                : starterActivation.appliesToStarterActivation
                    ? copy(
                        translate,
                        'steps.linkPlaced.progressDescription',
                        `${starterActivation.signalCount} of ${starterActivation.target} placement actions done.`,
                        { count: starterActivation.signalCount, total: starterActivation.target },
                    )
                    : copy(translate, 'steps.linkPlaced.nextDescription', 'Open the share tools when the menu is published.'),
            group: 'required',
            id: 'link_placed',
            label: starterActivation.appliesToStarterActivation
                ? copy(translate, 'steps.linkPlaced.label', 'Link placed')
                : copy(translate, 'steps.linkPlaced.readyLabel', 'Link ready'),
            status: placementDone ? 'done' : published ? 'next' : 'blocked',
        }),
    ];

    const optionalSteps: MenuSetupProgressStep[] = [
        buildStep({
            action: buildAction('open_menu_check', copy(translate, 'actions.prepareDescriptions', 'Prepare descriptions'), '/projects'),
            description: isSignalClear(signals, 'descriptions', hasMenuItems)
                ? copy(translate, 'steps.descriptionsReady.doneDescription', 'Visible items have descriptions.')
                : copy(translate, 'steps.descriptionsReady.nextDescription', 'Generate descriptions for clearer menu items.'),
            group: 'optional',
            id: 'descriptions_ready',
            label: copy(translate, 'steps.descriptionsReady.label', 'Descriptions ready'),
            status: isSignalClear(signals, 'descriptions', hasMenuItems) ? 'done' : 'optional',
        }),
        buildStep({
            action: buildAction('open_menu_check', copy(translate, 'actions.addImages', 'Add images'), '/projects'),
            description: isSignalClear(signals, 'images', hasMenuItems)
                ? copy(translate, 'steps.imagesReady.doneDescription', 'Visible items have images.')
                : copy(translate, 'steps.imagesReady.nextDescription', 'Add or generate item images when useful.'),
            group: 'optional',
            id: 'images_ready',
            label: copy(translate, 'steps.imagesReady.label', 'Images ready'),
            status: isSignalClear(signals, 'images', hasMenuItems) ? 'done' : 'optional',
        }),
        ...(hasTranslationSignals ? [
            buildStep({
                action: buildAction(
                    'open_menu_check',
                    translationWarning
                        ? copy(translate, 'actions.reviewLanguageText', 'Review language text')
                        : copy(translate, 'actions.openMenuCheck', 'Open menu check'),
                    '/projects',
                ),
                description: translationsReady
                    ? copy(translate, 'steps.translationsReady.doneDescription', 'Selected menu languages are complete.')
                    : copy(translate, 'steps.translationsReady.nextDescription', 'Review selected menu languages.'),
                group: 'optional' as const,
                id: 'translations_ready' as const,
                label: copy(translate, 'steps.translationsReady.label', 'Translations ready'),
                status: translationsReady ? 'done' as const : 'optional' as const,
            }),
        ] : []),
        buildStep({
            action: buildAction('open_public_presence', copy(translate, 'actions.updatePublicLinks', 'Update public links'), '/business-settings?section=business-profile&focus=official-page-actions'),
            description: hasPublicLinks
                ? copy(translate, 'steps.publicLinksAdded.doneDescription', 'Public action or social links are available.')
                : copy(translate, 'steps.publicLinksAdded.nextDescription', 'Add useful public links for the official business page.'),
            group: 'optional',
            id: 'obp_links_added',
            label: copy(translate, 'steps.publicLinksAdded.label', 'Public links added'),
            status: hasPublicLinks ? 'done' : 'optional',
        }),
        buildStep({
            action: buildAction('open_public_photos', copy(translate, 'actions.addPublicPhoto', 'Add public photo'), '/business-settings?section=business-profile&focus=official-page-photos'),
            description: hasPublicPhoto
                ? copy(translate, 'steps.publicPhotoAdded.doneDescription', 'Public photo is available.')
                : copy(translate, 'steps.publicPhotoAdded.nextDescription', 'Add a cover, logo, or public photo when ready.'),
            group: 'optional',
            id: 'obp_photo_added',
            label: copy(translate, 'steps.publicPhotoAdded.label', 'Public photo added'),
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
        if (phase === 'running') return copy(translate, 'complete', 'Menu setup is complete.');
        if (nextStep) return nextStep.description;
        return copy(translate, 'ready', 'Menu setup is ready.');
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
