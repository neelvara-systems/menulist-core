'use client'

import { FEATURE_FLAGS } from '@config/features';
import { getSpecialMenuCapabilities } from '@config/specialMenuConfig';
import { addProject, assertProjectDeleteSucceeded, assertProjectUpdateSucceeded, deleteProject, duplicateProject, getProjectDataWithoutLoader, setProjectActive, updateProjectMetadata, updateProjectWithoutLoader, updateSpecialMenuProject } from '@database/projects';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { withAnalyticsSource } from '@lib/analytics/sourceAttribution';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { generateProjectImageCandidate } from '@lib/image/projectImageGeneration';
import { getMediaProfileAcceptAttribute } from '@lib/media/imageProfiles';
import { isDataUrl } from '@lib/media/mediaStorage';
import {
    getProjectOwnerScopeFromProjectId,
    getProjectOwnerScopeKey,
    normalizeProjectOwnerScope,
    projectOwnerScopesMatch,
    type ProjectOwnerScope,
} from '@lib/menu/projectOwnerScope';
import { prepareMediaImage, type MediaImageCropIntent, type PreparedMediaImage } from '@lib/media/prepareMediaImage';
import MediaImageCard from '@/components/shared/media/MediaImageCard';
import MediaImageAdjustModal from '@/components/shared/media/MediaImageAdjustModal';
import { applyLocalizedProjectDraftMap, getLocalizedProjectValue, getProjectLanguageLabel, getProjectManagedLanguages, getProjectPreferredLanguage, hasMissingProjectPublicDraftContent } from '@lib/localization/projectContent';
import { CANONICAL_SOURCE_LANGUAGE } from '@lib/localization/languagePolicy';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { buildQrCodeFilename } from '@lib/utils/qrCode';
import { generateProjectUrl } from '@lib/utils/slugify';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import translateProjectPublicContent from '@services/ai/projectPublicContent/translateProjectPublicContent';
import { DEFAULT_OUTLET_POLICY, type OutletPolicy } from '@type/multiOutlet.types';
import {
    formatDateTime,
    fromNativeDateInputValue,
    fromNativeDateTimeInputValue,
    toNativeDateInputValue,
    toNativeDateTimeInputValue,
    type IntlFormatter,
} from '@util/dateTime';
import { ProjectSelectorList } from '../../shared/ProjectSelector';
import { theme } from 'antd';
import { useFormatter, useTranslations } from 'next-intl';
import { useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { LuArchiveRestore, LuCopy, LuExternalLink, LuPalette, LuPen, LuPower, LuQrCode, LuRotateCcw, LuSparkles, LuTrash2, LuX } from 'react-icons/lu';
import MobileQrCodeSheet from './MobileQrCodeSheet';
import MobileLocalizedLanguageSelector from './MobileLocalizedLanguageSelector';
import { useMobileProjects } from '../providers/MobileProjectsProvider';
import {
    getBoundedMobileProjectStringContext,
    getMobileProjectLogContext,
    getMobileProjectStoreLogContext,
    logMobileProjectFailure,
    type MobileProjectLogContext,
} from '../utils/mobileProjectDiagnostics';
import { openMobilePublicLink } from '../utils/openMobilePublicLink';
import { Button, Card, Dialog, DotLoading, Flex, Input, List, Popup, Switch, Tag, Text, TextArea, Title, Toast } from '../antd';

type ProjectSheetProject = {
    active?: boolean;
    deleted?: boolean;
    description?: string | Record<string, string>;
    isDefault?: boolean;
    isSpecialMenu?: boolean;
    languages?: string[];
    name: string | Record<string, string>;
    projectImage?: string | null;
    projectId: string;
    specialMenuBaseProjectId?: string;
    specialMenuEndsAt?: string;
    specialMenuMode?: 'replace' | 'overlay';
    specialMenuStartsAt?: string;
    specialMenuStatus?: 'scheduled' | 'active' | 'expired' | 'cancelled';
};

interface MobileProjectSelectorSheetProps {
    currentProjectId?: string | null;
    currentProjectName?: string | Record<string, string> | null;
    onClose: () => void;
    onOpenDesignEditor?: () => void;
    onProjectsChanged: (preferredProjectId?: string | null) => Promise<void> | void;
    visible: boolean;
}

type FormMode = 'create' | 'edit' | 'duplicate' | null;
type QrSheetState = {
    filename: string;
    helperText: string;
    title: string;
    url: string;
};
type ActionItem = {
    description?: string;
    icon: ReactNode;
    iconBackground?: string;
    key: string;
    label: string;
    labelStyle?: CSSProperties;
    onClick: () => void;
};

const MOBILE_PROJECT_SELECTOR_COPY_UNAVAILABLE = 'mobile_project_selector_copy_unavailable';
const MOBILE_PROJECT_SELECTOR_COPY_FALLBACK_FAILED = 'mobile_project_selector_copy_fallback_failed';

const toSpecialMenuInputValue = (
    value: string | null | undefined,
    allowTimeScheduling: boolean,
    timeZone?: string,
): string => (
    allowTimeScheduling
        ? toNativeDateTimeInputValue(value, timeZone)
        : toNativeDateInputValue(value, timeZone)
);

const fromSpecialMenuInputValue = (
    value: string,
    allowTimeScheduling: boolean,
    timeZone?: string,
): string => (
    allowTimeScheduling
        ? fromNativeDateTimeInputValue(value, timeZone)
        : fromNativeDateInputValue(value, timeZone)
);

const hasMobileProjectSelectorClipboardWrite = (): boolean => (
    typeof navigator !== 'undefined'
    && Boolean(navigator.clipboard)
    && typeof navigator.clipboard.writeText === 'function'
);

const hasMobileProjectSelectorCopyFallback = (): boolean => (
    typeof document !== 'undefined'
    && typeof document.createElement === 'function'
    && typeof document.execCommand === 'function'
    && Boolean(document.body)
);

const copyMobileProjectSelectorText = async (value: string): Promise<void> => {
    let clipboardWriteError: unknown;

    if (hasMobileProjectSelectorClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(value);
            return;
        } catch (error) {
            clipboardWriteError = error;
            // Continue to the acknowledged textarea fallback before showing failure copy.
        }
    }

    if (!hasMobileProjectSelectorCopyFallback()) {
        throw clipboardWriteError || new Error(MOBILE_PROJECT_SELECTOR_COPY_UNAVAILABLE);
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
        const copied = document.execCommand('copy');
        if (!copied) {
            throw new Error(MOBILE_PROJECT_SELECTOR_COPY_FALLBACK_FAILED);
        }
    } finally {
        document.body.removeChild(textarea);
    }
};

const getResolvedSpecialMenuStatus = (
    project: Pick<ProjectSheetProject, 'isSpecialMenu' | 'specialMenuEndsAt' | 'specialMenuStatus'> | null | undefined
) => {
    if (!project?.isSpecialMenu) return null;
    if (project.specialMenuStatus === 'cancelled') return 'cancelled';
    if (project.specialMenuStatus === 'expired') return 'expired';

    const endsAtMs = project.specialMenuEndsAt ? new Date(project.specialMenuEndsAt).getTime() : null;
    if (endsAtMs != null && Number.isFinite(endsAtMs) && endsAtMs <= Date.now()) {
        return 'expired';
    }

    return project.specialMenuStatus || 'scheduled';
};

const formatScheduleDateTime = (value: string | null | undefined, formatter: IntlFormatter) => {
    if (!value) return null;
    const label = formatDateTime(value, 'datetime', formatter);
    return label === 'N/A' ? null : label;
};

const resolveProjectName = (name: string | Record<string, string> | undefined, fallback = 'Untitled') => {
    return getLocalizedText(name, undefined, getPrimaryLocalizedLanguage(name, 'en'), fallback);
};

const resolveProjectDescription = (
    description: string | Record<string, string> | undefined,
    fallback = ''
) => {
    return getLocalizedText(description, undefined, getPrimaryLocalizedLanguage(description, 'en'), fallback);
};

const normalizeTextValue = (value: unknown) => {
    return typeof value === 'string' ? value : '';
};

const hasAnyDraftValue = (draftsByLanguage: Record<string, string>) => (
    Object.values(draftsByLanguage).some((value) => value.trim().length > 0)
);

const buildLocalizedDrafts = (
    value: string | Record<string, string> | undefined,
    languages: string[],
): Record<string, string> => (
    Object.fromEntries(
        languages.map((languageCode) => [
            languageCode,
            getLocalizedProjectValue(value, languageCode, ''),
        ])
    )
);

const pickBestDraftLanguage = (
    preferredLanguage: string,
    languages: string[],
    draftsByLanguage: Record<string, string>,
) => {
    if ((draftsByLanguage[preferredLanguage] || '').trim()) {
        return preferredLanguage;
    }

    const firstPopulatedLanguage = languages.find((languageCode) => (
        (draftsByLanguage[languageCode] || '').trim().length > 0
    ));

    return firstPopulatedLanguage || preferredLanguage;
};

export default function MobileProjectSelectorSheet({
    currentProjectId,
    currentProjectName,
    onClose,
    onOpenDesignEditor,
    onProjectsChanged,
    visible,
}: MobileProjectSelectorSheetProps) {
    const { token } = theme.useToken();
    const formatter = useFormatter();
    const t = useTranslations('MobileProjectSelector');
    const tShare = useTranslations('MobileShare');
    const { tenantDetails, storeDetails, userPermissions, isMasterUser } = useContext(PlatformGlobalDataContext);
    const currentProjectScope = useMemo(
        () => normalizeProjectOwnerScope(storeDetails?.tenantId, storeDetails?.storeId),
        [storeDetails?.storeId, storeDetails?.tenantId],
    );
    const currentProjectScopeKey = getProjectOwnerScopeKey(currentProjectScope);
    const currentProjectScopeRef = useRef<ProjectOwnerScope | null>(currentProjectScope);
    currentProjectScopeRef.current = currentProjectScope;
    const specialMenuCapabilities = useMemo(
        () => getSpecialMenuCapabilities(storeDetails?.businessType, storeDetails?.businessCategory),
        [storeDetails?.businessCategory, storeDetails?.businessType],
    );
    const labels = useOfferingLabels();
    const { isLoading, projectsById, projectsList, removeCachedProject, upsertCachedProject } = useMobileProjects();
    const [managingProjectId, setManagingProjectId] = useState<string | null>(null);
    const [formMode, setFormMode] = useState<FormMode>(null);
    const [formScope, setFormScope] = useState<ProjectOwnerScope | null>(null);
    const [formProjectId, setFormProjectId] = useState<string | null>(null);
    const [formLanguages, setFormLanguages] = useState<string[]>([storeDetails?.defaultLanguage || CANONICAL_SOURCE_LANGUAGE]);
    const [formSelectedLanguage, setFormSelectedLanguage] = useState<string>(storeDetails?.defaultLanguage || CANONICAL_SOURCE_LANGUAGE);
    const [formNameDrafts, setFormNameDrafts] = useState<Record<string, string>>({});
    const [formDescriptionDrafts, setFormDescriptionDrafts] = useState<Record<string, string>>({});
    const [initialFormNameDrafts, setInitialFormNameDrafts] = useState<Record<string, string>>({});
    const [initialFormDescriptionDrafts, setInitialFormDescriptionDrafts] = useState<Record<string, string>>({});
    const [formProjectImage, setFormProjectImage] = useState<string | null>(null);
    const [formProjectImageDraft, setFormProjectImageDraft] = useState<{
        crop?: MediaImageCropIntent;
        fileName?: string;
        prepared?: PreparedMediaImage;
        sourceDataUrl?: string;
    } | null>(null);
    const [isProjectImageAdjustOpen, setIsProjectImageAdjustOpen] = useState(false);
    const [formIsDefault, setFormIsDefault] = useState(false);
    const [formActive, setFormActive] = useState(true);
    const [formStartsAt, setFormStartsAt] = useState('');
    const [formEndsAt, setFormEndsAt] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeneratingProjectImage, setIsGeneratingProjectImage] = useState(false);
    const [isTranslatingPublicContent, setIsTranslatingPublicContent] = useState(false);
    const [qrSheet, setQrSheet] = useState<QrSheetState | null>(null);
    const [isQrSheetOpen, setIsQrSheetOpen] = useState(false);
    const mutationInFlightRef = useRef<string | null>(null);
    const beginMutation = useCallback((
        operation: string,
        expectedScope: ProjectOwnerScope | null,
    ): string | null => {
        if (
            !projectOwnerScopesMatch(expectedScope, currentProjectScopeRef.current)
            || mutationInFlightRef.current
        ) {
            return null;
        }
        const token = `${operation}:${getProjectOwnerScopeKey(expectedScope)}:${Date.now()}`;
        mutationInFlightRef.current = token;
        return token;
    }, []);
    const isCurrentMutation = useCallback((
        token: string,
        expectedScope: ProjectOwnerScope,
    ): boolean => (
        mutationInFlightRef.current === token
        && projectOwnerScopesMatch(expectedScope, currentProjectScopeRef.current)
    ), []);
    const endMutation = useCallback((token: string | null): void => {
        if (token && mutationInFlightRef.current === token) {
            mutationInFlightRef.current = null;
        }
    }, []);

    useEffect(() => {
        setManagingProjectId(null);
        setFormMode(null);
        setFormProjectId(null);
        setFormScope(null);
        setIsSubmitting(false);
        setIsGeneratingProjectImage(false);
        setIsTranslatingPublicContent(false);
        setIsProjectImageAdjustOpen(false);
    }, [currentProjectScopeKey]);
    const sheetCardStyle = {
        borderRadius: Number(token.borderRadiusLG || token.borderRadius) + 4,
        borderColor: token.colorBorderSecondary,
    };
    const stickyHeaderStyle = {
        position: 'sticky' as const,
        top: 0,
        zIndex: 2,
        background: token.colorBgElevated,
        paddingTop: 12,
        paddingBottom: 8,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        marginBottom: 4,
    };
    const actionIconContainerStyle = {
        width: 32,
        height: 32,
        minWidth: 32,
        borderRadius: Number(token.borderRadiusSM || token.borderRadius),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center' as const,
        background: token.colorFillTertiary,
    };

    const projects = projectsList as ProjectSheetProject[];
    const outletPolicy = useMemo<OutletPolicy | null>(() => {
        if (isMasterUser || storeDetails?.isMaster !== false) return null;
        return {
            ...DEFAULT_OUTLET_POLICY,
            ...(userPermissions?.outletPolicy || {}),
        };
    }, [isMasterUser, storeDetails?.isMaster, userPermissions]);
    const canCreateLocalProjects = !outletPolicy || outletPolicy.allowLocalProjects !== false;
    const canDeactivateLinkedProjects = !outletPolicy || outletPolicy.allowProjectDeactivate !== false;
    const canTranslatePublicContent = userPermissions?.canGenerateDescriptions === true;
    const orderedProjects = useMemo(() => {
        return [...projects].sort((a, b) => {
            const aSpecial = a.isSpecialMenu === true ? 1 : 0;
            const bSpecial = b.isSpecialMenu === true ? 1 : 0;
            if (aSpecial !== bSpecial) return bSpecial - aSpecial;
            return 0;
        });
    }, [projects]);

    const managingProject = useMemo(
        () => orderedProjects.find((project) => project.projectId === managingProjectId) || null,
        [managingProjectId, orderedProjects]
    );
    const hasMultipleFormLanguages = useMemo(
        () => new Set(formLanguages.filter(Boolean)).size > 1,
        [formLanguages]
    );
    const hasMissingFormPublicDrafts = useMemo(() => (
        hasMissingProjectPublicDraftContent({
            descriptionDrafts: formDescriptionDrafts,
            languages: formLanguages,
            nameDrafts: formNameDrafts,
        })
    ), [formDescriptionDrafts, formLanguages, formNameDrafts]);
    const managingProjectSpecialMenuStatus = useMemo(
        () => getResolvedSpecialMenuStatus(managingProject),
        [managingProject]
    );
    const managingProjectSpecialMenuSummary = useMemo(() => {
        if (!managingProject?.isSpecialMenu) return null;

        const startsAtLabel = formatScheduleDateTime(managingProject.specialMenuStartsAt, formatter);
        const endsAtLabel = formatScheduleDateTime(managingProject.specialMenuEndsAt, formatter);

        if (managingProjectSpecialMenuStatus === 'expired') {
            return endsAtLabel
                ? `This menu currently does not display to customers because it ended at ${endsAtLabel}.`
                : 'This menu currently does not display to customers because it has ended.';
        }

        if (managingProjectSpecialMenuStatus === 'cancelled') {
            return 'This menu currently does not display to customers because it was cancelled.';
        }

        if (managingProjectSpecialMenuStatus === 'active') {
            return endsAtLabel
                ? `This menu is currently visible to customers and will end at ${endsAtLabel}.`
                : 'This menu is currently visible to customers.';
        }

        return startsAtLabel
            ? `This menu currently does not display to customers. It is scheduled to start at ${startsAtLabel}.`
            : 'This menu currently does not display to customers. It is scheduled to start later.';
    }, [formatter, managingProject, managingProjectSpecialMenuStatus]);
    const formSourceProject = useMemo(
        () => projects.find((project) => project.projectId === formProjectId) || null,
        [formProjectId, projects]
    );
    const formReferenceLanguage = useMemo(
        () => getProjectPreferredLanguage({
            description: formSourceProject?.description,
            languages: formLanguages,
            name: formSourceProject?.name,
        }, storeDetails),
        [formLanguages, formSourceProject?.description, formSourceProject?.name, storeDetails]
    );
    const formName = formNameDrafts[formSelectedLanguage] || '';
    const formDescription = formDescriptionDrafts[formSelectedLanguage] || '';
    const currentDefaultProject = useMemo(
        () => projects.find((project) => project.isDefault === true) || null,
        [projects]
    );
    const currentDefaultProjectName = currentDefaultProject
        ? resolveProjectName(currentDefaultProject.name, '')
        : null;
    const resolvedCurrentProjectName = currentProjectName
        ? resolveProjectName(currentProjectName, '')
        : null;
    const buildProjectSelectorMutationLogContext = (
        flow: string,
        project?: ProjectSheetProject | null,
        metadata: MobileProjectLogContext = {},
    ): MobileProjectLogContext => {
        const resolvedProjectId = project?.projectId || formProjectId;
        return {
            surface: 'mobile_project_selector',
            flow,
            ...getMobileProjectLogContext(resolvedProjectId, project?.specialMenuBaseProjectId || formSourceProject?.specialMenuBaseProjectId),
            ...getMobileProjectStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
            ...getBoundedMobileProjectStringContext('selectedLanguage', formSelectedLanguage),
            ...getBoundedMobileProjectStringContext('referenceLanguage', formReferenceLanguage),
            formMode: formMode || undefined,
            languageCount: formLanguages.length,
            projectCount: projects.length,
            nameDraftLanguageCount: Object.keys(formNameDrafts).length,
            descriptionDraftLanguageCount: Object.keys(formDescriptionDrafts).length,
            nameDraftLength: String(formNameDrafts[formSelectedLanguage] || '').length,
            descriptionDraftLength: String(formDescriptionDrafts[formSelectedLanguage] || '').length,
            hasInitialNameDrafts: Object.keys(initialFormNameDrafts).length > 0,
            hasInitialDescriptionDrafts: Object.keys(initialFormDescriptionDrafts).length > 0,
            hasProjectImage: Boolean(formProjectImage),
            hasProjectImageDraft: Boolean(formProjectImageDraft),
            isActiveDraft: formActive,
            isCurrentProject: resolvedProjectId === currentProjectId,
            isDefaultDraft: formIsDefault,
            isSpecialMenu: project?.isSpecialMenu === true || formSourceProject?.isSpecialMenu === true,
            ...metadata,
        };
    };

    const resetFormState = () => {
        setFormMode(null);
        setFormScope(null);
        setFormProjectId(null);
        const defaultLanguage = storeDetails?.defaultLanguage || CANONICAL_SOURCE_LANGUAGE;
        setFormLanguages([defaultLanguage]);
        setFormSelectedLanguage(defaultLanguage);
        setFormNameDrafts({});
        setFormDescriptionDrafts({});
        setInitialFormNameDrafts({});
        setInitialFormDescriptionDrafts({});
        setFormProjectImage(null);
        setFormProjectImageDraft(null);
        setIsProjectImageAdjustOpen(false);
        setFormIsDefault(false);
        setFormActive(true);
        setFormStartsAt('');
        setFormEndsAt('');
        setIsSubmitting(false);
        setIsGeneratingProjectImage(false);
    };

    const openCreate = () => {
        if (!canCreateLocalProjects) {
            Toast.show({ content: 'New local menus are not enabled for this location.', duration: 1800 });
            return;
        }
        const openingScope = currentProjectScopeRef.current;
        if (!openingScope) {
            Toast.show({ content: 'Could not verify this location.', duration: 1800 });
            return;
        }

        const defaultLanguage = storeDetails?.defaultLanguage || CANONICAL_SOURCE_LANGUAGE;
        setManagingProjectId(null);
        setFormMode('create');
        setFormScope(openingScope);
        setFormProjectId(null);
        setFormLanguages([defaultLanguage]);
        setFormSelectedLanguage(defaultLanguage);
        setFormNameDrafts({ [defaultLanguage]: '' });
        setFormDescriptionDrafts({ [defaultLanguage]: '' });
        setInitialFormNameDrafts({ [defaultLanguage]: '' });
        setInitialFormDescriptionDrafts({ [defaultLanguage]: '' });
        setFormProjectImage(null);
        setFormProjectImageDraft(null);
        setIsProjectImageAdjustOpen(false);
        setFormIsDefault(!hasRegularProject());
        setFormActive(true);
        setFormStartsAt('');
        setFormEndsAt('');
    };

    const loadDetailedProject = async (
        project: ProjectSheetProject,
        expectedScope?: ProjectOwnerScope,
    ) => {
        if (expectedScope && !projectOwnerScopesMatch(expectedScope, currentProjectScopeRef.current)) {
            throw new Error('mobile_project_detail_scope_changed');
        }
        const cachedProject = projectsById[project.projectId];
        if (cachedProject) return cachedProject;

        const detailedProject = await getProjectDataWithoutLoader(project.projectId, expectedScope);
        if (expectedScope && !projectOwnerScopesMatch(expectedScope, currentProjectScopeRef.current)) {
            throw new Error('mobile_project_detail_scope_changed');
        }
        upsertCachedProject({
            ...project,
            ...(detailedProject || {}),
            projectId: project.projectId,
        });
        return detailedProject;
    };

    const isLinkedOutletProject = async (
        project: ProjectSheetProject,
        expectedScope?: ProjectOwnerScope,
    ) => {
        if ((project as any).masterProjectId) return true;
        const detailedProject = await loadDetailedProject(project, expectedScope);
        return Boolean(detailedProject?.masterProjectId);
    };

    const getDeleteFallbackProject = (projectId: string) => (
        orderedProjects.find((entry) => entry.projectId !== projectId && entry.active !== false)
        || orderedProjects.find((entry) => entry.projectId !== projectId)
        || null
    );

    const getDeleteDefaultReplacement = (projectId: string) => (
        projects.find((entry) => (
            entry.projectId !== projectId &&
            entry.isSpecialMenu !== true &&
            entry.active !== false
        )) || projects.find((entry) => (
            entry.projectId !== projectId &&
            entry.isSpecialMenu !== true
        )) || null
    );

    const hasRegularProject = () => projects.some((project) => (
        project.isSpecialMenu !== true &&
        project.deleted !== true
    ));

    const openEdit = async (project: ProjectSheetProject) => {
        const openingScope = currentProjectScopeRef.current;
        if (!openingScope) return;
        const detailedProject = await loadDetailedProject(project, openingScope);
        if (!projectOwnerScopesMatch(openingScope, currentProjectScopeRef.current)) return;
        const languages = getProjectManagedLanguages(detailedProject, storeDetails);
        const nextNameDrafts = buildLocalizedDrafts(detailedProject?.name || project.name, languages);
        const nextDescriptionDrafts = buildLocalizedDrafts(detailedProject?.description || project.description, languages);
        const selectedLanguage = pickBestDraftLanguage(
            getProjectPreferredLanguage(detailedProject, storeDetails),
            languages,
            nextNameDrafts,
        );

        setFormMode('edit');
        setFormScope(openingScope);
        setFormProjectId(project.projectId);
        setFormLanguages(languages);
        setFormSelectedLanguage(selectedLanguage);
        setFormNameDrafts(nextNameDrafts);
        setFormDescriptionDrafts(nextDescriptionDrafts);
        setInitialFormNameDrafts(nextNameDrafts);
        setInitialFormDescriptionDrafts(nextDescriptionDrafts);
        setFormProjectImage(project.projectImage || null);
        setFormProjectImageDraft(null);
        setIsProjectImageAdjustOpen(false);
        setFormIsDefault(project.isDefault === true);
        setFormActive(project.active !== false);
        setFormStartsAt(toSpecialMenuInputValue(
            project.specialMenuStartsAt,
            specialMenuCapabilities.allowTimeScheduling,
            storeDetails?.timeZone,
        ));
        setFormEndsAt(toSpecialMenuInputValue(
            project.specialMenuEndsAt,
            specialMenuCapabilities.allowTimeScheduling,
            storeDetails?.timeZone,
        ));
    };

    const openDuplicate = async (project: ProjectSheetProject) => {
        if (!canCreateLocalProjects) {
            Toast.show({ content: 'New local menus are not enabled for this location.', duration: 1800 });
            return;
        }
        const openingScope = currentProjectScopeRef.current;
        if (!openingScope) return;
        if (await isLinkedOutletProject(project, openingScope)) {
            Toast.show({ content: 'Inherited menus cannot be duplicated at this location.', duration: 1800 });
            return;
        }

        const detailedProject = await loadDetailedProject(project, openingScope);
        if (!projectOwnerScopesMatch(openingScope, currentProjectScopeRef.current)) return;
        const languages = getProjectManagedLanguages(detailedProject, storeDetails);
        const nextNameDrafts = buildLocalizedDrafts(detailedProject?.name || project.name, languages);
        const nextDescriptionDrafts = buildLocalizedDrafts(detailedProject?.description || project.description, languages);
        const selectedLanguage = pickBestDraftLanguage(
            getProjectPreferredLanguage(detailedProject, storeDetails),
            languages,
            nextNameDrafts,
        );
        nextNameDrafts[selectedLanguage] = `Copy of ${nextNameDrafts[selectedLanguage] || resolveProjectName(project.name)}`;

        setFormMode('duplicate');
        setFormScope(openingScope);
        setFormProjectId(project.projectId);
        setFormLanguages(languages);
        setFormSelectedLanguage(selectedLanguage);
        setFormNameDrafts(nextNameDrafts);
        setFormDescriptionDrafts(nextDescriptionDrafts);
        setInitialFormNameDrafts(nextNameDrafts);
        setInitialFormDescriptionDrafts(nextDescriptionDrafts);
        setFormProjectImage(project.projectImage || null);
        setFormProjectImageDraft(null);
        setIsProjectImageAdjustOpen(false);
        setFormIsDefault(project.isDefault === true);
        setFormActive(true);
        setFormStartsAt('');
        setFormEndsAt('');
    };

    const syncSelectionOnly = async (preferredProjectId?: string | null) => {
        await onProjectsChanged(preferredProjectId);
    };

    const handleSelectProject = async (projectId: string) => {
        onClose();
        await onProjectsChanged(projectId);
        Toast.show({ content: t('catalogSwitched'), duration: 1200 });
    };

    const handleSubmitForm = async () => {
        const nextName = normalizeTextValue(formName).trim();
        const nextDescription = normalizeTextValue(formDescription).trim();
        const isEditingSpecialMenu = formMode === 'edit' && Boolean(formSourceProject?.isSpecialMenu);
        const localizedName = applyLocalizedProjectDraftMap(formSourceProject?.name, formNameDrafts);
        const localizedDescription = applyLocalizedProjectDraftMap(formSourceProject?.description, formDescriptionDrafts);

        if (!nextName || !hasAnyDraftValue(formNameDrafts) || !localizedName) {
            Toast.show({ content: t('catalogNameRequired'), duration: 1600 });
            return;
        }

        if (isEditingSpecialMenu) {
            if (!formStartsAt || !formEndsAt) {
                Toast.show({ content: 'Set both the start and end date and time.', duration: 1800 });
                return;
            }

            const startMs = new Date(formStartsAt).getTime();
            const endMs = new Date(formEndsAt).getTime();
            if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
                Toast.show({ content: 'End date and time must be after the start date and time.', duration: 1800 });
                return;
            }
        }

        const operationScope = formScope;
        const mutationToken = beginMutation('save', operationScope);
        if (!operationScope || !mutationToken) {
            Toast.show({ content: 'This menu form is no longer active for the current location.', duration: 2000 });
            return;
        }

        setIsSubmitting(true);
        try {
            let savedProjectImage = formProjectImage;
            if (isDataUrl(savedProjectImage)) {
                const mimeMatch = savedProjectImage.match(/^data:(.*?);base64,/);
                const { uploadFile } = await import('@database/projects');
                savedProjectImage = await uploadFile({
                    blob: formProjectImageDraft?.prepared?.blob,
                    mediaChecksum: formProjectImageDraft?.prepared?.checksum,
                    mediaId: formProjectImageDraft?.prepared?.mediaId,
                    mediaProfile: 'projectImage',
                    mediaVariant: formProjectImageDraft?.prepared?.primaryVariant,
                    mediaVersion: formProjectImageDraft?.prepared?.version,
                    preparedMedia: formProjectImageDraft?.prepared,
                    uid: formProjectId || nextName || `project-image-${Date.now()}`,
                    url: savedProjectImage,
                    type: formProjectImageDraft?.prepared?.mimeType || mimeMatch?.[1] || 'image/jpeg',
                } as any, 'project-images', operationScope);
            }

            if (formMode === 'create') {
                if (!canCreateLocalProjects) {
                    Toast.show({ content: 'New local menus are not enabled for this location.', duration: 1800 });
                    return;
                }
                const currentDefault = projects.find((project) => project.isDefault === true);
                const nextIsDefault = !hasRegularProject();
                const result = await addProject({
                    active: formActive,
                    businessCategory: storeDetails?.businessCategory,
                    businessType: storeDetails?.businessType,
                    defaultLanguage: formSelectedLanguage,
                    description: localizedDescription,
                    isDefault: nextIsDefault,
                    name: localizedName,
                    projectImage: savedProjectImage || null,
                }, {
                    defaultHandoff: {
                        unsetProjectId: nextIsDefault ? currentDefault?.projectId : undefined,
                    },
                    expectedScope: operationScope,
                });
                assertProjectUpdateSucceeded(
                    result,
                    undefined,
                    'mobile_project_selector_create_project_update_rejected',
                );
                if (!result.projectId) {
                    throw new Error('mobile_project_selector_create_project_update_rejected');
                }
                if (!isCurrentMutation(mutationToken, operationScope)) return;

                if (currentDefault?.projectId && nextIsDefault && currentDefault.projectId !== result?.projectId) {
                    upsertCachedProject({
                        ...(projectsById[currentDefault.projectId] || currentDefault),
                        ...currentDefault,
                        isDefault: false,
                        projectId: currentDefault.projectId,
                    });
                }
                if (result?.projectId) {
                    upsertCachedProject({
                        ...(result.projectData || {}),
                        ...(result.summaryData || {}),
                        active: formActive,
                        description: localizedDescription,
                        defaultLanguage: formSelectedLanguage,
                        isDefault: nextIsDefault,
                        name: localizedName,
                        projectId: result.projectId,
                        projectImage: savedProjectImage || null,
                    });
                }

                resetFormState();
                await syncSelectionOnly(result?.projectId || null);
                Toast.show({ content: t('catalogCreated'), duration: 1400 });
                return;
            }

            if (formMode === 'duplicate' && formProjectId) {
                if (!canCreateLocalProjects) {
                    Toast.show({ content: 'New local menus are not enabled for this location.', duration: 1800 });
                    return;
                }
                const result = await duplicateProject(
                    formProjectId,
                    nextName,
                    nextDescription || undefined,
                    localizedName,
                    localizedDescription,
                    operationScope,
                );
                assertProjectUpdateSucceeded(
                    result,
                    undefined,
                    'mobile_project_selector_duplicate_project_update_rejected',
                );
                if (!result.projectId) {
                    throw new Error('mobile_project_selector_duplicate_project_update_rejected');
                }
                if (!isCurrentMutation(mutationToken, operationScope)) return;

                if (savedProjectImage !== (formSourceProject?.projectImage || null) && result?.projectId) {
                    const imageMetadataResult = await updateProjectMetadata(
                        result.projectId,
                        { projectImage: savedProjectImage || null },
                        { expectedScope: operationScope },
                    );
                    assertProjectUpdateSucceeded(
                        imageMetadataResult,
                        result.projectId,
                        'mobile_project_selector_duplicate_image_metadata_update_rejected',
                    );
                }
                if (result?.projectId) {
                    const languageResult = await updateProjectWithoutLoader({
                        projectId: result.projectId,
                        languages: formLanguages,
                        defaultLanguage: formSelectedLanguage,
                    }, {
                        expectedScope: operationScope,
                    });
                    assertProjectUpdateSucceeded(
                        languageResult,
                        result.projectId,
                        'mobile_project_selector_duplicate_language_project_update_rejected',
                    );
                }
                if (result?.projectId) {
                    upsertCachedProject({
                        ...(result.projectData || {}),
                        ...(result.summaryData || {}),
                        active: true,
                        description: localizedDescription,
                        defaultLanguage: formSelectedLanguage,
                        isDefault: false,
                        name: localizedName,
                        projectId: result.projectId,
                        projectImage: savedProjectImage || null,
                    });
                }

                resetFormState();
                await syncSelectionOnly(result?.projectId || null);
                Toast.show({ content: t('catalogDuplicated'), duration: 1400 });
                return;
            }

            if (formMode === 'edit' && formProjectId) {
                const defaultReplacement = formSourceProject?.isDefault && !formIsDefault
                    ? projects.find((project) => (
                        project.projectId !== formProjectId &&
                        project.isSpecialMenu !== true &&
                        project.active !== false
                    )) || projects.find((project) => (
                        project.projectId !== formProjectId &&
                        project.isSpecialMenu !== true
                    )) || null
                    : null;

                if (formSourceProject?.isDefault && !formIsDefault && !defaultReplacement) {
                    Toast.show({ content: `Add another regular ${labels.offeringLower} before removing the default one.`, duration: 2200 });
                    return;
                }

                const metadataUpdate: Record<string, any> = isEditingSpecialMenu
                    ? { projectImage: savedProjectImage || null }
                    : {
                        description: localizedDescription,
                        isDefault: formIsDefault,
                        name: localizedName,
                        projectImage: savedProjectImage || null,
                    };
                const nextActive = formActive;
                const activeChanged = !isEditingSpecialMenu && formSourceProject?.active !== nextActive;
                const shouldUnsetPreviousDefault = formIsDefault && formSourceProject?.isDefault !== true;
                const currentDefault = projects.find(
                    (project) => project.isDefault === true && project.projectId !== formProjectId,
                );

                if (isEditingSpecialMenu) {
                    const specialMenuResult = await updateSpecialMenuProject({
                        projectId: formProjectId,
                        description: nextDescription || undefined,
                        displayName: nextName,
                        localizedDescription: localizedDescription || undefined,
                        localizedDisplayName: localizedName,
                        endsAt: fromSpecialMenuInputValue(
                            formEndsAt,
                            specialMenuCapabilities.allowTimeScheduling,
                            storeDetails?.timeZone,
                        ),
                        startsAt: fromSpecialMenuInputValue(
                            formStartsAt,
                            specialMenuCapabilities.allowTimeScheduling,
                            storeDetails?.timeZone,
                        ),
                    }, operationScope);
                    assertProjectUpdateSucceeded(
                        specialMenuResult,
                        formProjectId,
                        'mobile_project_selector_special_menu_project_update_rejected',
                    );
                }

                const metadataResult = await updateProjectMetadata(formProjectId, metadataUpdate, {
                    defaultHandoff: {
                        unsetProjectId: shouldUnsetPreviousDefault ? currentDefault?.projectId : undefined,
                        setProjectId: defaultReplacement?.projectId,
                    },
                    expectedScope: operationScope,
                });
                assertProjectUpdateSucceeded(
                    metadataResult,
                    formProjectId,
                    'mobile_project_selector_metadata_update_rejected',
                );
                const languageResult = await updateProjectWithoutLoader({
                    projectId: formProjectId,
                    languages: formLanguages,
                    defaultLanguage: formSelectedLanguage,
                }, {
                    expectedScope: operationScope,
                });
                assertProjectUpdateSucceeded(
                    languageResult,
                    formProjectId,
                    'mobile_project_selector_language_project_update_rejected',
                );
                if (activeChanged) {
                    const activeResult = await setProjectActive(formProjectId, nextActive, operationScope);
                    assertProjectUpdateSucceeded(
                        activeResult,
                        formProjectId,
                        'mobile_project_selector_active_project_update_rejected',
                    );
                }

                if (!isCurrentMutation(mutationToken, operationScope)) return;
                if (shouldUnsetPreviousDefault && currentDefault?.projectId) {
                    upsertCachedProject({
                        ...(projectsById[currentDefault.projectId] || currentDefault),
                        ...currentDefault,
                        isDefault: false,
                        projectId: currentDefault.projectId,
                    });
                }
                if (defaultReplacement?.projectId) {
                    upsertCachedProject({
                        ...(projectsById[defaultReplacement.projectId] || defaultReplacement),
                        ...defaultReplacement,
                        isDefault: true,
                        projectId: defaultReplacement.projectId,
                    });
                }

                upsertCachedProject({
                    ...(projectsById[formProjectId] || formSourceProject || {}),
                    ...(formSourceProject || {}),
                    active: nextActive,
                    description: localizedDescription,
                    defaultLanguage: formSelectedLanguage,
                    isDefault: formIsDefault,
                    name: localizedName,
                    projectId: formProjectId,
                    projectImage: savedProjectImage || null,
                    ...(isEditingSpecialMenu ? {
                        specialMenuDisplayName: localizedName,
                        specialMenuEndsAt: fromSpecialMenuInputValue(
                            formEndsAt,
                            specialMenuCapabilities.allowTimeScheduling,
                            storeDetails?.timeZone,
                        ),
                        specialMenuStartsAt: fromSpecialMenuInputValue(
                            formStartsAt,
                            specialMenuCapabilities.allowTimeScheduling,
                            storeDetails?.timeZone,
                        ),
                    } : {}),
                });

                resetFormState();
                await syncSelectionOnly(formProjectId);
                Toast.show({ content: t('catalogUpdated'), duration: 1400 });
            }
        } catch (error) {
            logMobileProjectFailure('mobile_project_selector_save_failed', error, buildProjectSelectorMutationLogContext('save_form', formSourceProject, {
                isCreate: formMode === 'create',
                isDuplicate: formMode === 'duplicate',
                isEdit: formMode === 'edit',
            }));
            if (isCurrentMutation(mutationToken, operationScope)) {
                Toast.show({ content: t('saveFailed'), duration: 1800 });
            }
        } finally {
            setIsSubmitting(false);
            endMutation(mutationToken);
        }
    };

    const initialFormProjectImage = formSourceProject?.projectImage || null;
    const initialFormIsDefault = formSourceProject?.isDefault === true;
    const initialFormStartsAt = formSourceProject?.specialMenuStartsAt || '';
    const initialFormEndsAt = formSourceProject?.specialMenuEndsAt || '';
    const isEditingSpecialMenu = formMode === 'edit' && Boolean(formSourceProject?.isSpecialMenu);
    const hasFormChanges = formMode === 'edit'
        ? (
            JSON.stringify(formNameDrafts) !== JSON.stringify(initialFormNameDrafts) ||
            JSON.stringify(formDescriptionDrafts) !== JSON.stringify(initialFormDescriptionDrafts) ||
            formProjectImage !== initialFormProjectImage ||
            formIsDefault !== initialFormIsDefault ||
            formActive !== (formSourceProject?.active !== false) ||
            (isEditingSpecialMenu && (
                fromSpecialMenuInputValue(
                    formStartsAt,
                    specialMenuCapabilities.allowTimeScheduling,
                    storeDetails?.timeZone,
                ) !== initialFormStartsAt ||
                fromSpecialMenuInputValue(
                    formEndsAt,
                    specialMenuCapabilities.allowTimeScheduling,
                    storeDetails?.timeZone,
                ) !== initialFormEndsAt
            ))
        )
        : true;

    const handleResetEditForm = () => {
        if (!formSourceProject) return;
        setFormNameDrafts(initialFormNameDrafts);
        setFormDescriptionDrafts(initialFormDescriptionDrafts);
        setFormSelectedLanguage(
            pickBestDraftLanguage(formReferenceLanguage, formLanguages, initialFormNameDrafts)
        );
        setFormProjectImage(formSourceProject.projectImage || null);
        setFormIsDefault(formSourceProject.isDefault === true);
        setFormActive(formSourceProject.active !== false);
        setFormStartsAt(toSpecialMenuInputValue(
            formSourceProject.specialMenuStartsAt,
            specialMenuCapabilities.allowTimeScheduling,
            storeDetails?.timeZone,
        ));
        setFormEndsAt(toSpecialMenuInputValue(
            formSourceProject.specialMenuEndsAt,
            specialMenuCapabilities.allowTimeScheduling,
            storeDetails?.timeZone,
        ));
    };

    const handleProjectImageSelect = async (file: File) => {
        const operationScope = formScope;
        if (!operationScope || !projectOwnerScopesMatch(operationScope, currentProjectScopeRef.current)) {
            return false;
        }
        try {
            const prepared = await prepareMediaImage(file, 'projectImage');
            if (!projectOwnerScopesMatch(operationScope, currentProjectScopeRef.current)) return false;
            setFormProjectImage(prepared.dataUrl);
            setFormProjectImageDraft({
                crop: prepared.crop,
                fileName: prepared.sourceName || file.name,
                prepared,
                sourceDataUrl: prepared.sourceDataUrl,
            });
        } catch (error) {
            logMobileProjectFailure('mobile_project_image_prepare_failed', error, {
                ...getMobileProjectLogContext(formProjectId, formSourceProject?.specialMenuBaseProjectId),
                ...getMobileProjectStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                ...getBoundedMobileProjectStringContext('fileName', file.name),
                formMode: formMode || undefined,
                languageCount: formLanguages.length,
            });
            Toast.show({ content: 'Could not prepare image. Please try again.', duration: 1800 });
        }

        return false;
    };

    const handleGenerateProjectImage = async () => {
        const operationScope = formScope;
        if (!operationScope || !projectOwnerScopesMatch(operationScope, currentProjectScopeRef.current)) return;
        const localizedName = applyLocalizedProjectDraftMap(formSourceProject?.name, formNameDrafts);
        const localizedDescription = applyLocalizedProjectDraftMap(formSourceProject?.description, formDescriptionDrafts);
        const projectName = getLocalizedText(
            localizedName,
            undefined,
            getPrimaryLocalizedLanguage(localizedName, formSelectedLanguage || CANONICAL_SOURCE_LANGUAGE),
            '',
        ).trim();

        if (!projectName) {
            Toast.show({ content: `Enter a ${labels.offeringPhrase} name first.`, duration: 1800 });
            return;
        }

        setIsGeneratingProjectImage(true);
        try {
            const sourceProject = formProjectId
                ? projectsById[formProjectId] || formSourceProject || {}
                : {};
            const candidate = await generateProjectImageCandidate({
                allowNameOnly: true,
                businessCategory: storeDetails?.businessCategory,
                businessType: storeDetails?.businessType,
                project: {
                    ...sourceProject,
                    description: localizedDescription,
                    name: localizedName,
                    projectId: formProjectId || 'project-draft',
                },
                storeName: getStoreContextName(storeDetails as any, 'menu'),
            });

            if (!candidate?.dataUrl) {
                Toast.show({ content: 'Add menu items before generating a menu image.', duration: 1800 });
                return;
            }

            const prepared = await prepareMediaImage(candidate.dataUrl, 'projectImage', {
                fileName: candidate.name,
            });
            if (!projectOwnerScopesMatch(operationScope, currentProjectScopeRef.current)) return;
            setFormProjectImage(prepared.dataUrl);
            setFormProjectImageDraft({
                crop: prepared.crop,
                fileName: prepared.sourceName || candidate.name,
                prepared,
                sourceDataUrl: prepared.sourceDataUrl,
            });
            Toast.show({ content: 'Menu image generated', icon: 'success', duration: 1400 });
        } catch (error) {
            logMobileProjectFailure('mobile_project_image_generate_failed', error, {
                ...getMobileProjectLogContext(formProjectId, formSourceProject?.specialMenuBaseProjectId),
                ...getMobileProjectStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                ...getBoundedMobileProjectStringContext('projectName', projectName),
                formMode: formMode || undefined,
                languageCount: formLanguages.length,
            });
            Toast.show({ content: 'Could not generate menu image. Please try again.', duration: 2200 });
        } finally {
            setIsGeneratingProjectImage(false);
        }
    };

    const handleFormNameChange = (value: string) => {
        setFormNameDrafts((previous) => ({
            ...previous,
            [formSelectedLanguage]: value,
        }));
    };

    const handleFormDescriptionChange = (value: string) => {
        setFormDescriptionDrafts((previous) => ({
            ...previous,
            [formSelectedLanguage]: value,
        }));
    };

    const handleTranslatePublicContent = async () => {
        if (!canTranslatePublicContent) return;
        if (!formProjectId || formMode !== 'edit') return;
        if (!hasMultipleFormLanguages) return;
        if (!hasMissingFormPublicDrafts) return;

        const hasUnsavedContentChanges =
            JSON.stringify(formNameDrafts) !== JSON.stringify(initialFormNameDrafts)
            || JSON.stringify(formDescriptionDrafts) !== JSON.stringify(initialFormDescriptionDrafts);

        if (hasUnsavedContentChanges) {
            Toast.show({ content: 'Save the current project content first, then translate the missing public content.', duration: 2000 });
            return;
        }
        const operationScope = formScope;
        const mutationToken = beginMutation('translate', operationScope);
        if (!operationScope || !mutationToken) {
            Toast.show({ content: 'This menu form is no longer active for the current location.', duration: 2000 });
            return;
        }

        try {
            setIsTranslatingPublicContent(true);
            const detailedProject = await loadDetailedProject(
                formSourceProject || { projectId: formProjectId, name: '', description: '' } as any,
                operationScope,
            );
            const translated = await translateProjectPublicContent({
                projectDetails: detailedProject,
                projectId: formProjectId,
                storeDetails,
            });

            if (!translated) {
                Toast.show({ content: 'No missing project public content translations found.', duration: 1800 });
                return;
            }

            const translationProjectResult = await updateProjectWithoutLoader({
                projectId: formProjectId,
                ...(translated.name ? { name: translated.name } : {}),
                ...(translated.description ? { description: translated.description } : {}),
                ...(translated.specialNote ? {
                    menuSettings: {
                        ...(detailedProject?.menuSettings || {}),
                        specialNote: translated.specialNote,
                    },
                } : {}),
                ...(translated.specialMenuDisplayName && detailedProject?._specialMenu ? {
                    _specialMenu: {
                        ...detailedProject._specialMenu,
                        displayName: translated.specialMenuDisplayName,
                    },
                } : {}),
            } as any, {
                expectedScope: operationScope,
                syncPublicSummary: true,
            });
            assertProjectUpdateSucceeded(
                translationProjectResult,
                formProjectId,
                'mobile_project_public_content_translation_project_update_rejected',
            );

            if (!isCurrentMutation(mutationToken, operationScope)) return;
            const resolvedName = translated.name || detailedProject?.name || formSourceProject?.name;
            const resolvedDescription = translated.description || detailedProject?.description || formSourceProject?.description;
            const nextNameDrafts = buildLocalizedDrafts(resolvedName, formLanguages);
            const nextDescriptionDrafts = buildLocalizedDrafts(resolvedDescription, formLanguages);
            setFormNameDrafts(nextNameDrafts);
            setFormDescriptionDrafts(nextDescriptionDrafts);
            setInitialFormNameDrafts(nextNameDrafts);
            setInitialFormDescriptionDrafts(nextDescriptionDrafts);
            upsertCachedProject({
                ...(projectsById[formProjectId] || formSourceProject || {}),
                ...(formSourceProject || {}),
                ...(translated.name ? { name: translated.name } : {}),
                ...(translated.description ? { description: translated.description } : {}),
                ...(translated.specialMenuDisplayName ? { specialMenuDisplayName: translated.specialMenuDisplayName } : {}),
                projectId: formProjectId,
            });
            Toast.show({ content: 'Project public content translations added.', duration: 1800 });
        } catch (error) {
            logMobileProjectFailure('mobile_project_public_content_translation_failed', error, {
                ...getMobileProjectLogContext(formProjectId, formSourceProject?.specialMenuBaseProjectId),
                ...getMobileProjectStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                ...getBoundedMobileProjectStringContext('selectedLanguage', formSelectedLanguage),
                ...getBoundedMobileProjectStringContext('referenceLanguage', formReferenceLanguage),
                formMode: formMode || undefined,
                isSpecialMenu: formSourceProject?.isSpecialMenu === true,
                languageCount: formLanguages.length,
                nameDraftLength: String(formNameDrafts[formSelectedLanguage] || '').length,
                descriptionDraftLength: String(formDescriptionDrafts[formSelectedLanguage] || '').length,
                hasInitialNameDrafts: Object.keys(initialFormNameDrafts).length > 0,
                hasInitialDescriptionDrafts: Object.keys(initialFormDescriptionDrafts).length > 0,
            });
            if (isCurrentMutation(mutationToken, operationScope)) {
                Toast.show({ content: 'Could not translate project public content.', duration: 1800 });
            }
        } finally {
            setIsTranslatingPublicContent(false);
            endMutation(mutationToken);
        }
    };

    const handleToggleActive = async (project: ProjectSheetProject) => {
        const nextActive = project.active === false;
        const isCurrent = project.projectId === currentProjectId;
        const operationScope = getProjectOwnerScopeFromProjectId(project.projectId);
        const mutationToken = beginMutation('active', operationScope);
        if (!operationScope || !mutationToken) {
            Toast.show({ content: 'Could not verify this location.', duration: 1800 });
            return;
        }
        try {
            if (!nextActive && !canDeactivateLinkedProjects && await isLinkedOutletProject(project, operationScope)) {
                Toast.show({ content: 'Deactivating inherited menus is not enabled for this location.', duration: 1800 });
                return;
            }

            if (!nextActive && isCurrent) {
                const fallback = getDeleteFallbackProject(project.projectId);
                const inactiveResult = await setProjectActive(project.projectId, false, operationScope);
                assertProjectUpdateSucceeded(
                    inactiveResult,
                    project.projectId,
                    'mobile_project_selector_active_toggle_project_update_rejected',
                );
                if (!isCurrentMutation(mutationToken, operationScope)) return;
                upsertCachedProject({ ...project, active: false });
                setManagingProjectId(null);
                await syncSelectionOnly(fallback?.projectId || null);
                Toast.show({ content: t('catalogInactive'), duration: 1400 });
                return;
            }

            const activeResult = await setProjectActive(project.projectId, nextActive, operationScope);
            assertProjectUpdateSucceeded(
                activeResult,
                project.projectId,
                'mobile_project_selector_active_toggle_project_update_rejected',
            );
            if (!isCurrentMutation(mutationToken, operationScope)) return;
            upsertCachedProject({ ...project, active: nextActive });
            setManagingProjectId(null);
            await syncSelectionOnly(nextActive ? project.projectId : currentProjectId || null);
            Toast.show({ content: nextActive ? t('catalogActive') : t('catalogInactive'), duration: 1400 });
        } catch (error) {
            logMobileProjectFailure('mobile_project_selector_active_toggle_failed', error, buildProjectSelectorMutationLogContext('active_toggle', project, {
                nextActive,
            }));
            if (isCurrentMutation(mutationToken, operationScope)) {
                Toast.show({ content: t('saveFailed'), duration: 1800 });
            }
        } finally {
            endMutation(mutationToken);
        }
    };

    const handleResetProject = async (project: ProjectSheetProject) => {
        const operationScope = getProjectOwnerScopeFromProjectId(project.projectId);
        const mutationToken = beginMutation('reset', operationScope);
        if (!operationScope || !mutationToken) {
            Toast.show({ content: 'Could not verify this location.', duration: 1800 });
            return;
        }
        try {
            setManagingProjectId(null);
            const isLinkedProject = await isLinkedOutletProject(project, operationScope);
            const resetResult = await updateProjectWithoutLoader({
                files: [],
                projectId: project.projectId,
                ...(isLinkedProject ? { overrides: { items: {}, categories: {}, attributes: {} } } : {}),
            } as any, {
                expectedScope: operationScope,
            });
            assertProjectUpdateSucceeded(
                resetResult,
                project.projectId,
                'mobile_project_selector_reset_project_update_rejected',
            );
            if (!isCurrentMutation(mutationToken, operationScope)) return;
            upsertCachedProject({
                ...project,
                files: [],
                ...(isLinkedProject ? { overrides: { items: {}, categories: {}, attributes: {} } } : {}),
            });
            await syncSelectionOnly(project.projectId);
            Toast.show({ content: t('catalogReset'), duration: 1400 });
        } catch (error) {
            logMobileProjectFailure('mobile_project_selector_reset_failed', error, buildProjectSelectorMutationLogContext('reset_project', project));
            if (isCurrentMutation(mutationToken, operationScope)) {
                Toast.show({ content: t('saveFailed'), duration: 1800 });
            }
        } finally {
            endMutation(mutationToken);
        }
    };

    const handleDeleteProject = async (project: ProjectSheetProject) => {
        const operationScope = getProjectOwnerScopeFromProjectId(project.projectId);
        const mutationToken = beginMutation('delete', operationScope);
        if (!operationScope || !mutationToken) {
            Toast.show({ content: 'Could not verify this location.', duration: 1800 });
            return;
        }

        try {
            if (!canDeactivateLinkedProjects && await isLinkedOutletProject(project, operationScope)) {
                Toast.show({ content: 'Removing inherited menus is not enabled for this location.', duration: 1800 });
                return;
            }
            const isCurrent = project.projectId === currentProjectId;
            const fallback = getDeleteFallbackProject(project.projectId);
            const defaultReplacement = project.isDefault ? getDeleteDefaultReplacement(project.projectId) : null;
            const deleteResult = await deleteProject(project.projectId).catch(() => null);
            if (!deleteResult) return;
            assertProjectDeleteSucceeded(
                deleteResult,
                project.projectId,
                'mobile_project_selector_delete_project_rejected',
            );
            if (!isCurrentMutation(mutationToken, operationScope)) return;
            setManagingProjectId(null);
            removeCachedProject(project.projectId);
            if (defaultReplacement?.projectId) {
                upsertCachedProject({
                    ...(projectsById[defaultReplacement.projectId] || defaultReplacement),
                    ...defaultReplacement,
                    isDefault: true,
                    projectId: defaultReplacement.projectId,
                });
            }
            await syncSelectionOnly(isCurrent ? fallback?.projectId || null : currentProjectId || null);
            Toast.show({ content: t('catalogDeleted'), duration: 1400 });
        } catch (error) {
            logMobileProjectFailure('mobile_project_delete_failed', error, {
                ...getMobileProjectLogContext(project.projectId, project.specialMenuBaseProjectId),
                ...getMobileProjectStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                isCurrentProject: project.projectId === currentProjectId,
                isDefaultProject: project.isDefault === true,
                isSpecialMenu: project.isSpecialMenu === true,
                projectCount: projects.length,
            });
            if (isCurrentMutation(mutationToken, operationScope)) {
                Toast.show({ content: `Could not delete ${labels.offeringLower}`, duration: 1800 });
            }
        } finally {
            endMutation(mutationToken);
        }
    };

    const getProjectShareUrl = (project: ProjectSheetProject) => {
        if (!storeDetails) return null;
        const projectName = resolveProjectName(project.name, '');
        if (!projectName || project.deleted === true) return null;

        const subdomain = storeDetails.subdomain || '';
        const customDomain = storeDetails.customDomain;
        if (!subdomain && !customDomain) return null;

        try {
            return generateProjectUrl(subdomain, customDomain, projectName, false);
        } catch {
            return null;
        }
    };

    const withSource = (url: string, src: 'copy' | 'direct' | 'qr') => (
        withAnalyticsSource(url, src === 'copy' ? 'copy_link' : src)
    );

    const handleCopyProjectLink = async (project: ProjectSheetProject) => {
        const shareUrl = getProjectShareUrl(project);
        if (!shareUrl) {
            Toast.show({ content: tShare('domainNotSetHelp'), duration: 1600 });
            return;
        }

        const sourcedShareUrl = withSource(shareUrl, 'copy');
        try {
            await copyMobileProjectSelectorText(sourcedShareUrl);
            setManagingProjectId(null);
            Toast.show({
                content: tShare('copiedLabel', {
                    label: tShare('directOfferingLinkCopyLabel', { offering: labels.offeringLower }),
                }),
                duration: 1200,
            });
        } catch (error) {
            logMobileProjectFailure('mobile_project_selector_link_copy_failed', error, buildProjectSelectorMutationLogContext('copy_project_link', project, {
                ...getBoundedMobileProjectStringContext('shareUrl', shareUrl),
                ...getBoundedMobileProjectStringContext('sourcedShareUrl', sourcedShareUrl),
                hasClipboardWrite: hasMobileProjectSelectorClipboardWrite(),
                hasCopyFallback: hasMobileProjectSelectorCopyFallback(),
            }));
            Toast.show({
                content: tShare('copyFailedLabel', {
                    label: tShare('directOfferingLinkCopyLabel', { offering: labels.offeringLower }).toLowerCase(),
                }),
                duration: 1500,
            });
        }
    };

    const handlePreviewProject = (project: ProjectSheetProject) => {
        const shareUrl = getProjectShareUrl(project);
        if (!shareUrl) {
            Toast.show({ content: tShare('domainNotSetHelp'), duration: 1600 });
            return;
        }

        setManagingProjectId(null);
        openMobilePublicLink(withSource(shareUrl, 'direct'), {
            flow: 'project_preview_open',
            metadata: buildProjectSelectorMutationLogContext('preview_project_link', project),
            source: 'mobile_project_selector',
        });
    };

    const handleShowProjectQr = (project: ProjectSheetProject) => {
        const shareUrl = getProjectShareUrl(project);
        const projectName = resolveProjectName(project.name, labels.offeringTitle);
        const storeName = getStoreContextName(storeDetails as any, 'menu');
        if (!shareUrl) {
            Toast.show({ content: tShare('domainNotSetHelp'), duration: 1600 });
            return;
        }

        setQrSheet({
            filename: buildQrCodeFilename(`${storeName}-${projectName}-direct-link`, 'qr'),
            helperText: tShare('directOfferingLinkDesc', { offering: labels.offeringLower }),
            title: `${projectName} ${tShare('showQr')}`,
            url: withSource(shareUrl, 'qr'),
        });
        setIsQrSheetOpen(true);
    };

    const managingProjectShareUrl = managingProject ? getProjectShareUrl(managingProject) : null;
    const quickShareItems: ActionItem[] = managingProject && managingProject.deleted !== true && managingProjectShareUrl ? [
        {
            key: 'preview',
            label: `Preview ${labels.offeringTitle}`,
            description: `Open this ${labels.offeringLower} in the browser.`,
            icon: <LuExternalLink size={16} />,
            iconBackground: token.colorFillTertiary,
            labelStyle: undefined,
            onClick: () => handlePreviewProject(managingProject),
        },
        {
            key: 'copy-link',
            label: tShare('copyLink'),
            description: `Copy the public ${labels.offeringLower} link.`,
            icon: <LuCopy size={16} />,
            iconBackground: token.colorFillTertiary,
            labelStyle: undefined,
            onClick: () => void handleCopyProjectLink(managingProject),
        },
        {
            key: 'show-qr',
            label: tShare('showQr'),
            description: `Open the QR sheet for this ${labels.offeringLower}.`,
            icon: <LuQrCode size={16} />,
            iconBackground: token.colorFillTertiary,
            labelStyle: undefined,
            onClick: () => handleShowProjectQr(managingProject),
        },
    ] : [];

    const manageItems: ActionItem[] = managingProject ? [
        ...(onOpenDesignEditor ? [{
            key: 'open-design',
            label: 'Open menu design',
            description: 'Go to the menu design screen for this menu.',
            icon: <LuPalette size={16} />,
            iconBackground: token.colorFillTertiary,
            labelStyle: undefined,
            onClick: () => {
                const projectId = managingProject.projectId;
                setManagingProjectId(null);
                onClose();
                void Promise.resolve(onProjectsChanged(projectId)).then(() => {
                    onOpenDesignEditor();
                });
            },
        }] : []),
        {
            key: 'edit',
            label: 'Edit details',
            description: 'Change the name and description.',
            icon: <LuPen size={16} />,
            iconBackground: token.colorFillTertiary,
            labelStyle: undefined,
            onClick: () => { openEdit(managingProject); },
        },
        ...(managingProject.isSpecialMenu ? [] : [{
            key: 'duplicate',
            label: t('duplicateCatalog'),
            description: 'Create a copy to reuse this setup.',
            icon: <LuCopy size={16} />,
            iconBackground: token.colorFillTertiary,
            labelStyle: undefined,
            onClick: () => openDuplicate(managingProject),
        }]),
        ...(managingProject.isSpecialMenu ? [] : [
            {
                key: managingProject.active === false ? 'activate' : 'inactivate',
                label: managingProject.active === false ? t('activateCatalog') : t('makeInactive'),
                description: managingProject.active === false
                    ? `Make this ${labels.offeringLower} available again.`
                    : `Hide this ${labels.offeringLower} from normal use.`,
                icon: (
                    <LuPower
                        size={16}
                        style={{ color: managingProject.active === false ? token.colorSuccess : token.colorError }}
                    />
                ),
                iconBackground: managingProject.active === false ? token.colorSuccessBg : token.colorErrorBg,
                labelStyle: { color: managingProject.active === false ? token.colorSuccess : token.colorError },
                onClick: () => {
                    void Dialog.confirm({
                        cancelText: t('cancel'),
                        confirmText: managingProject.active === false ? t('activate') : t('inactivate'),
                        content: managingProject.active === false
                            ? t('activateCatalogConfirm')
                            : t('inactivateCatalogConfirm'),
                        onConfirm: () => void handleToggleActive(managingProject),
                    });
                },
            },
            {
                key: 'reset',
                label: t('resetCatalog'),
                description: 'Clear uploaded files and start fresh.',
                icon: <LuRotateCcw size={16} />,
                iconBackground: token.colorFillTertiary,
                labelStyle: undefined,
                onClick: () => {
                    void Dialog.confirm({
                        cancelText: t('cancel'),
                        confirmText: 'Reset catalog',
                        content: `Reset "${resolveProjectName(managingProject.name)}" and remove its uploaded files and extracted menu data? You can keep the catalog itself, but you will need to upload and build it again.`,
                        onConfirm: () => void handleResetProject(managingProject),
                    });
                },
            },
        ]),
    ] : [];

    const dangerItems: ActionItem[] = managingProject && (
        managingProject.isSpecialMenu !== true
        || managingProject.specialMenuStatus === 'expired'
        || managingProject.specialMenuStatus === 'cancelled'
    ) ? [
        {
            key: 'delete',
            label: t('deleteCatalog'),
            labelStyle: { color: token.colorError },
            description: 'Remove this catalog permanently.',
            icon: <LuTrash2 color={token.colorError} size={16} />,
            iconBackground: token.colorErrorBg,
            onClick: () => {
                void Dialog.confirm({
                    cancelText: t('cancel'),
                    confirmText: 'Delete catalog',
                    content: `Delete "${resolveProjectName(managingProject.name)}" permanently? This removes the catalog, its files, and its menu data. This action cannot be undone.`,
                    onConfirm: () => void handleDeleteProject(managingProject),
                });
            },
        },
    ] : [];

    return (
        <>
            <Popup
                aria-label={t('selectCatalog')}
                bodyStyle={{ borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
                onMaskClick={onClose}
                position="bottom"
                visible={visible}
            >
                <Flex gap={16} style={{ maxHeight: 'min(82vh, 720px)', overflowY: 'auto' }} vertical>
                    <Flex gap={8} vertical>
                        <Flex align="flex-start" justify="space-between" gap={12}>
                            <Flex gap={4} style={{ flex: 1, minWidth: 0 }} vertical>
                                <Title level={3} style={{ margin: 0, textAlign: 'left' }}>
                                    {t('selectCatalog')}
                                </Title>
                            </Flex>
                            <Flex justify="flex-end">
                                <Button
                                    aria-label={t('close')}
                                    fill="none"
                                    onClick={onClose}
                                    size="small"
                                    style={{ padding: 4 }}
                                >
                                    <LuX size={18} />
                                </Button>
                            </Flex>
                        </Flex>
                        <Text type="secondary" style={{ textAlign: 'left' }}>
                            {t('selectCatalogDesc')}
                        </Text>
                        {resolvedCurrentProjectName ? (
                            <Text type="secondary" style={{ textAlign: 'left' }}>
                                {`Current: ${resolvedCurrentProjectName}`}
                            </Text>
                        ) : null}
                    </Flex>

                    {isLoading ? (
                        <Flex align="center" justify="center" style={{ minHeight: 160 }}>
                            <DotLoading color="primary" />
                        </Flex>
                    ) : (
                        <ProjectSelectorList
                            currentProjectId={currentProjectId}
                            onCreate={openCreate}
                            onManage={(projectId) => setManagingProjectId(projectId)}
                            onSelect={(projectId) => { void handleSelectProject(projectId); }}
                            projects={orderedProjects.map((project) => ({
                                id: project.projectId,
                                isDefault: project.isDefault,
                                name: project.name,
                                active: project.active !== false,
                                deleted: project.deleted === true,
                                isSpecialMenu: project.isSpecialMenu === true,
                                projectImage: project.projectImage || null,
                                specialMenuBaseProjectId: project.specialMenuBaseProjectId,
                                specialMenuEndsAt: project.specialMenuEndsAt,
                                specialMenuStatus: project.specialMenuStatus,
                                secondaryLabel: project.active === false ? t('inactiveCatalog') : (resolveProjectDescription(project.description) || undefined),
                            }))}
                        />
                    )}
                </Flex>
            </Popup>

            <Popup
                aria-label={`${resolveProjectName(managingProject?.name, t('catalogActions'))} menu actions`}
                bodyStyle={{ borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 0 }}
                onMaskClick={() => setManagingProjectId(null)}
                position="bottom"
                visible={Boolean(managingProject)}
            >
                <Flex gap={12} vertical>
                    <Flex
                        align="center"
                        justify="space-between"
                        gap={12}
                        style={stickyHeaderStyle}
                    >
                        <Flex gap={4} style={{ flex: 1 }} vertical>
                            <Flex align="center" gap={8} wrap="wrap">
                                <Title level={4} style={{ margin: 0 }}>
                                    {resolveProjectName(managingProject?.name, t('catalogActions'))}
                                </Title>
                                {managingProject?.deleted ? (
                                    <Tag color="error">Deleted</Tag>
                                ) : null}
                                {managingProject?.deleted !== true && managingProject?.active === false ? (
                                    <Tag color="warning">Inactive</Tag>
                                ) : null}
                                {managingProjectSpecialMenuStatus === 'expired' ? (
                                    <Tag color="warning">Ended</Tag>
                                ) : null}
                            </Flex>
                            {managingProject ? (
                                <Flex align="center" gap={6} wrap="wrap">
                                    {managingProject.isDefault ? <Tag color="primary">Default</Tag> : null}
                                    {!managingProjectShareUrl && managingProject.deleted !== true ? (
                                        <Tag color="default">No public link</Tag>
                                    ) : null}
                                </Flex>
                            ) : null}
                        </Flex>
                        <Button aria-label="Close menu management" fill="none" onClick={() => setManagingProjectId(null)} size="small">
                            <LuX size={18} />
                        </Button>
                    </Flex>
                    {managingProjectSpecialMenuSummary ? (
                        <Card style={sheetCardStyle}>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                                {managingProjectSpecialMenuSummary}
                            </Text>
                        </Card>
                    ) : null}
                    {quickShareItems.length ? (
                        <Card style={sheetCardStyle} title={<Text strong>Share</Text>}>
                            <List>
                                {quickShareItems.map((item) => (
                                    <List.Item
                                        key={item.key}
                                        description={<Text type="secondary">{item.description}</Text>}
                                        onClick={item.onClick}
                                        prefix={<Flex style={{ ...actionIconContainerStyle, background: item.iconBackground || token.colorFillTertiary }}>{item.icon}</Flex>}
                                        title={<Text strong style={item.labelStyle}>{item.label}</Text>}
                                    />
                                ))}
                            </List>
                        </Card>
                    ) : null}
                    <Card style={sheetCardStyle} title={<Text strong>Manage</Text>}>
                        <List>
                            {manageItems.map((item) => (
                                <List.Item
                                    key={item.key}
                                    description={<Text type="secondary">{item.description}</Text>}
                                    onClick={item.onClick}
                                    prefix={<Flex style={{ ...actionIconContainerStyle, background: item.iconBackground || token.colorFillTertiary }}>{item.icon}</Flex>}
                                    title={<Text strong style={item.labelStyle}>{item.label}</Text>}
                                />
                            ))}
                        </List>
                    </Card>
                    <Card
                        style={{ ...sheetCardStyle, background: token.colorErrorBg, borderColor: token.colorErrorBorder }}
                        title={<Text strong style={{ color: token.colorError }}>Danger Zone</Text>}
                    >
                        <List>
                            {dangerItems.map((item) => (
                                <List.Item
                                    key={item.key}
                                    description={<Text style={{ color: token.colorTextSecondary }}>{item.description}</Text>}
                                    onClick={item.onClick}
                                    prefix={<Flex style={{ ...actionIconContainerStyle, background: item.iconBackground || token.colorFillTertiary }}>{item.icon}</Flex>}
                                    title={<Text strong style={item.labelStyle}>{item.label}</Text>}
                                />
                            ))}
                        </List>
                    </Card>
                </Flex>
            </Popup>

            <Popup
                aria-label={formMode === 'create' ? t('createCatalog') : formMode === 'duplicate' ? t('duplicateCatalog') : t('editCatalog')}
                bodyStyle={{ borderTopLeftRadius: 20, borderTopRightRadius: 20, overflowY: 'auto', paddingTop: 0 }}
                onMaskClick={() => resetFormState()}
                position="bottom"
                visible={Boolean(formMode)}
            >
                <Flex gap={16} style={{ paddingBottom: 8 }} vertical>
                    <Flex
                        align="center"
                        justify="space-between"
                        gap={12}
                        style={stickyHeaderStyle}
                    >
                        <Title level={4} style={{ margin: 0, flex: 1 }}>
                            {formMode === 'create' ? t('createCatalog') : formMode === 'duplicate' ? t('duplicateCatalog') : t('editCatalog')}
                        </Title>
                        <Button aria-label="Close menu form" fill="none" onClick={() => resetFormState()} size="small">
                            <LuX size={18} />
                        </Button>
                    </Flex>

                    <Card style={sheetCardStyle}>
                        <Flex gap={14} vertical>
                            {hasMultipleFormLanguages ? (
                                <>
                                    <MobileLocalizedLanguageSelector
                                        helperText={`Edit this ${labels.offeringLower} label one language at a time.`}
                                        languages={formLanguages}
                                        onChange={setFormSelectedLanguage}
                                        selectedLanguage={formSelectedLanguage}
                                        title="Project content language"
                                    />
                                    {formMode === 'edit' && hasMissingFormPublicDrafts && canTranslatePublicContent ? (
                                        <Button
                                            fill="outline"
                                            loading={isTranslatingPublicContent}
                                            onClick={() => { void handleTranslatePublicContent(); }}
                                            size="small"
                                        >
                                            Translate missing public content
                                        </Button>
                                    ) : null}
                                </>
                            ) : null}

                            <Flex gap={6} vertical>
                                <Text strong>{t('catalogName')}</Text>
                                <Input aria-label={t('catalogName')} autoFocus maxLength={100} onChange={handleFormNameChange} placeholder={t('catalogNamePlaceholder')} value={formName} />
                                {formSelectedLanguage !== formReferenceLanguage ? (
                                    <MobileProjectReferenceCard
                                        onUseReference={() => setFormNameDrafts((previous) => ({
                                            ...previous,
                                            [formSelectedLanguage]: previous[formReferenceLanguage] || '',
                                        }))}
                                        referenceLabel={getProjectLanguageLabel(formReferenceLanguage)}
                                        referenceValue={formNameDrafts[formReferenceLanguage] || ''}
                                        token={token}
                                    />
                                ) : null}
                            </Flex>

                            <Flex gap={6} vertical>
                                <Text strong>{t('description')}</Text>
                                <TextArea aria-label={t('description')} maxLength={300} onChange={handleFormDescriptionChange} placeholder={t('descriptionPlaceholder')} rows={3} showCount value={formDescription} />
                                <Text type="secondary">Only for you. Customers do not see this description.</Text>
                                {formSelectedLanguage !== formReferenceLanguage ? (
                                    <MobileProjectReferenceCard
                                        onUseReference={() => setFormDescriptionDrafts((previous) => ({
                                            ...previous,
                                            [formSelectedLanguage]: previous[formReferenceLanguage] || '',
                                        }))}
                                        referenceLabel={getProjectLanguageLabel(formReferenceLanguage)}
                                        referenceValue={formDescriptionDrafts[formReferenceLanguage] || ''}
                                        token={token}
                                    />
                                ) : null}
                            </Flex>

                            <Flex gap={6} vertical>
                                <Text strong>Menu image</Text>
                                <Text type="secondary">Optional. This image appears on the Official Business Page menu card.</Text>
                                <MediaImageCard
                                    accept={getMediaProfileAcceptAttribute('projectImage')}
                                    alt={`${formName || labels.offeringPhrase} preview`}
                                    canAdjust={Boolean(formProjectImageDraft?.sourceDataUrl)}
                                    imageType="projectImage"
                                    imageUrl={formProjectImage}
                                    onAdjust={() => setIsProjectImageAdjustOpen(true)}
                                    onRemove={formProjectImage ? () => {
                                        setFormProjectImage(null);
                                        setFormProjectImageDraft(null);
                                    } : undefined}
                                    onSelectFile={(file) => { void handleProjectImageSelect(file); }}
                                    placeholderDescription="Drop, paste, or choose a menu image."
                                    placeholderTitle="Menu image"
                                    size="compact"
                                />
                                {FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION ? (
                                    <Button block loading={isGeneratingProjectImage} onClick={() => { void handleGenerateProjectImage(); }} size="small">
                                        <Flex align="center" gap={6} justify="center">
                                            <LuSparkles size={16} />
                                            <Text>{formProjectImage ? 'Regenerate' : 'Generate'}</Text>
                                        </Flex>
                                    </Button>
                                ) : null}
                            </Flex>

                            {formMode !== 'duplicate' && !isEditingSpecialMenu ? (
                                <Flex align="center" justify="space-between" gap={12}>
                                    <Flex gap={4} vertical>
                                        <Text strong>Active</Text>
                                        <Text type="secondary">Inactive menus stay hidden until you enable them.</Text>
                                    </Flex>
                                    <Switch aria-label="Make menu active" checked={formActive} onChange={setFormActive} />
                                </Flex>
                            ) : null}

                            {formMode === 'edit' && !isEditingSpecialMenu ? (
                                <Flex gap={8} vertical>
                                    <Flex align="center" justify="space-between" gap={12}>
                                        <Text strong>Default</Text>
                                        <Switch aria-label="Make menu default" checked={formIsDefault} onChange={setFormIsDefault} />
                                    </Flex>
                                    <Text type="secondary">
                                        Current default {labels.offeringLower}: <strong>{currentDefaultProjectName || `No default ${labels.offeringLower} is set yet`}</strong>
                                    </Text>
                                    <Text type="secondary">
                                        {formIsDefault
                                            ? `"${formName.trim() || `This ${labels.offeringLower}`}" will become the default menu used by your main public menu link when you save.`
                                            : formSourceProject?.isDefault
                                                ? 'If you turn this off, the default role will move to the next available regular menu automatically.'
                                                : 'If this stays off, your main public menu link keeps opening the current default menu.'}
                                    </Text>
                                </Flex>
                            ) : null}
                        </Flex>
                    </Card>

                    {isEditingSpecialMenu ? (
                        <Card size="small" style={sheetCardStyle}>
                            <Flex gap={14} vertical>
                                <Text strong>Special menu schedule</Text>
                                <Flex gap={6} vertical>
                                    <Text strong>{`Starts ${specialMenuCapabilities.allowTimeScheduling ? 'Date & Time' : 'Date'}`}</Text>
                                    <Input
                                        onChange={setFormStartsAt}
                                        type={specialMenuCapabilities.allowTimeScheduling ? 'datetime-local' : 'date'}
                                        value={formStartsAt}
                                    />
                                </Flex>
                                <Flex gap={6} vertical>
                                    <Text strong>{`Ends ${specialMenuCapabilities.allowTimeScheduling ? 'Date & Time' : 'Date'}`}</Text>
                                    <Input
                                        onChange={setFormEndsAt}
                                        type={specialMenuCapabilities.allowTimeScheduling ? 'datetime-local' : 'date'}
                                        value={formEndsAt}
                                    />
                                </Flex>
                                <Text type="secondary">Customers see this special menu only during this scheduled period.</Text>
                            </Flex>
                        </Card>
                    ) : null}

                    {formMode === 'duplicate' ? (
                        <Card size="small" style={sheetCardStyle}>
                            <Flex align="flex-start" gap={10}>
                                <LuArchiveRestore size={18} />
                                <Text type="secondary">{t('duplicateCatalogHelp')}</Text>
                            </Flex>
                        </Card>
                    ) : null}

                    <Flex gap={8}>
                        {formMode === 'edit' ? (
                            <Button
                                block
                                disabled={!hasFormChanges}
                                fill="outline"
                                onClick={handleResetEditForm}
                            >
                                {t('reset')}
                            </Button>
                        ) : null}
                        <Button
                            block
                            disabled={formMode === 'edit' && !hasFormChanges}
                            loading={isSubmitting}
                            onClick={() => void handleSubmitForm()}
                        >
                            {formMode === 'create' ? t('create') : formMode === 'duplicate' ? t('duplicate') : t('save')}
                        </Button>
                    </Flex>
                </Flex>
            </Popup>

            <MobileQrCodeSheet
                activePlanType={(storeDetails as any)?.activePlanType}
                copyErrorMessage={tShare('couldNotCopy')}
                copySuccessMessage={tShare('copiedLabel', {
                    label: tShare('directOfferingLinkCopyLabel', { offering: labels.offeringLower }),
                })}
                diagnosticSource="mobile_project_selector_qr"
                downloadSuccessMessage={tShare('qrDownloaded')}
                filename={qrSheet?.filename || buildQrCodeFilename('menu-link', 'qr')}
                generatingLabel={tShare('generatingQr')}
                helperText={qrSheet?.helperText}
                imageAlt={qrSheet?.title || tShare('showQr')}
                onClose={() => setIsQrSheetOpen(false)}
                qrErrorMessage={tShare('qrFailed')}
                title={qrSheet?.title || tShare('showQr')}
                url={qrSheet?.url || ''}
                visible={isQrSheetOpen}
            />
            <MediaImageAdjustModal
                fileName={formProjectImageDraft?.fileName}
                imageType="projectImage"
                initialCrop={formProjectImageDraft?.crop}
                onApply={(prepared) => {
                    setFormProjectImage(prepared.dataUrl);
                    setFormProjectImageDraft({
                        crop: prepared.crop,
                        fileName: prepared.sourceName || formProjectImageDraft?.fileName,
                        prepared,
                        sourceDataUrl: prepared.sourceDataUrl || formProjectImageDraft?.sourceDataUrl,
                    });
                }}
                onClose={() => setIsProjectImageAdjustOpen(false)}
                open={isProjectImageAdjustOpen}
                sourceDataUrl={formProjectImageDraft?.sourceDataUrl}
            />
        </>
    );
}

function MobileProjectReferenceCard({
    onUseReference,
    referenceLabel,
    referenceValue,
    token,
}: {
    onUseReference: () => void;
    referenceLabel: string;
    referenceValue: string;
    token: any;
}) {
    return (
        <Card
            style={{
                background: token.colorFillAlter,
                borderColor: token.colorBorderSecondary,
            }}
        >
            <Flex align="center" gap={12} justify="space-between" style={{ padding: 12 }}>
                <Flex gap={4} style={{ flex: 1, minWidth: 0 }} vertical>
                    <Text type="secondary">{`${referenceLabel} reference`}</Text>
                    <Text>{referenceValue || 'No content yet in the primary language.'}</Text>
                </Flex>
                {referenceValue ? (
                    <Button fill="outline" onClick={onUseReference} size="small">
                        Use reference
                    </Button>
                ) : null}
            </Flex>
        </Card>
    );
}
