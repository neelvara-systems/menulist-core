'use client'

import { addProject, deleteProject, duplicateProject, getProjectDataWithoutLoader, setProjectActive, updateProjectMetadata, updateProjectWithoutLoader } from '@database/projects';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { MENU_IMAGE_CONFIG, optimizeImage } from '@lib/image/optimizeImage';
import { applyLocalizedProjectDraftMap, getLocalizedProjectValue, getProjectLanguageLabel, getProjectManagedLanguages, getProjectPreferredLanguage } from '@lib/localization/projectContent';
import { CANONICAL_SOURCE_LANGUAGE } from '@lib/localization/languagePolicy';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { buildQrCodeFilename } from '@lib/utils/qrCode';
import { generateProjectUrl } from '@lib/utils/slugify';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { getBase64 } from '@util/utils';
import { ProjectSelectorList } from '../../shared/ProjectSelector';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useContext, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { LuArchiveRestore, LuCheck, LuCopy, LuExternalLink, LuImagePlus, LuPalette, LuPen, LuPower, LuQrCode, LuRotateCcw, LuTrash2, LuX } from 'react-icons/lu';
import MobileQrCodeSheet from './MobileQrCodeSheet';
import MobileLocalizedLanguageSelector from './MobileLocalizedLanguageSelector';
import { useMobileProjects } from '../providers/MobileProjectsProvider';
import { Button, Card, Dialog, DotLoading, Flex, Image, Input, List, Popup, Switch, Tag, Text, TextArea, Title, Toast, Upload } from '../antd';

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
    currentProjectName?: string | null;
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

const toNativeDateTimeValue = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';

    const pad = (part: number) => String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const fromNativeDateTimeValue = (value: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    return date.toISOString();
};

const formatScheduleDateTime = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return null;

    return new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
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

export default function MobileProjectSelectorSheet({
    currentProjectId,
    currentProjectName,
    onClose,
    onOpenDesignEditor,
    onProjectsChanged,
    visible,
}: MobileProjectSelectorSheetProps) {
    const { token } = theme.useToken();
    const t = useTranslations('MobileProjectSelector');
    const tShare = useTranslations('MobileShare');
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const labels = useOfferingLabels();
    const { isLoading, projectsById, projectsList, removeCachedProject, upsertCachedProject } = useMobileProjects();
    const [managingProjectId, setManagingProjectId] = useState<string | null>(null);
    const [formMode, setFormMode] = useState<FormMode>(null);
    const [formProjectId, setFormProjectId] = useState<string | null>(null);
    const [formLanguages, setFormLanguages] = useState<string[]>([storeDetails?.defaultLanguage || CANONICAL_SOURCE_LANGUAGE]);
    const [formSelectedLanguage, setFormSelectedLanguage] = useState<string>(storeDetails?.defaultLanguage || CANONICAL_SOURCE_LANGUAGE);
    const [formNameDrafts, setFormNameDrafts] = useState<Record<string, string>>({});
    const [formDescriptionDrafts, setFormDescriptionDrafts] = useState<Record<string, string>>({});
    const [initialFormNameDrafts, setInitialFormNameDrafts] = useState<Record<string, string>>({});
    const [initialFormDescriptionDrafts, setInitialFormDescriptionDrafts] = useState<Record<string, string>>({});
    const [formProjectImage, setFormProjectImage] = useState<string | null>(null);
    const [formIsDefault, setFormIsDefault] = useState(false);
    const [formActive, setFormActive] = useState(true);
    const [formStartsAt, setFormStartsAt] = useState('');
    const [formEndsAt, setFormEndsAt] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [qrSheet, setQrSheet] = useState<QrSheetState | null>(null);
    const [isQrSheetOpen, setIsQrSheetOpen] = useState(false);
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
    const managingProjectSpecialMenuStatus = useMemo(
        () => getResolvedSpecialMenuStatus(managingProject),
        [managingProject]
    );
    const managingProjectSpecialMenuSummary = useMemo(() => {
        if (!managingProject?.isSpecialMenu) return null;

        const startsAtLabel = formatScheduleDateTime(managingProject.specialMenuStartsAt);
        const endsAtLabel = formatScheduleDateTime(managingProject.specialMenuEndsAt);

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
    }, [managingProject, managingProjectSpecialMenuStatus]);
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

    const resetFormState = () => {
        setFormMode(null);
        setFormProjectId(null);
        const defaultLanguage = storeDetails?.defaultLanguage || CANONICAL_SOURCE_LANGUAGE;
        setFormLanguages([defaultLanguage]);
        setFormSelectedLanguage(defaultLanguage);
        setFormNameDrafts({});
        setFormDescriptionDrafts({});
        setInitialFormNameDrafts({});
        setInitialFormDescriptionDrafts({});
        setFormProjectImage(null);
        setFormIsDefault(false);
        setFormActive(true);
        setFormStartsAt('');
        setFormEndsAt('');
        setIsSubmitting(false);
    };

    const openCreate = () => {
        const defaultLanguage = storeDetails?.defaultLanguage || CANONICAL_SOURCE_LANGUAGE;
        setManagingProjectId(null);
        setFormMode('create');
        setFormProjectId(null);
        setFormLanguages([defaultLanguage]);
        setFormSelectedLanguage(defaultLanguage);
        setFormNameDrafts({ [defaultLanguage]: '' });
        setFormDescriptionDrafts({ [defaultLanguage]: '' });
        setInitialFormNameDrafts({ [defaultLanguage]: '' });
        setInitialFormDescriptionDrafts({ [defaultLanguage]: '' });
        setFormProjectImage(null);
        setFormIsDefault(!projects.some((project) => project.isDefault === true));
        setFormActive(true);
        setFormStartsAt('');
        setFormEndsAt('');
    };

    const loadDetailedProject = async (project: ProjectSheetProject) => {
        const cachedProject = projectsById[project.projectId];
        if (cachedProject) return cachedProject;

        const detailedProject = await getProjectDataWithoutLoader(project.projectId);
        upsertCachedProject({
            ...project,
            ...(detailedProject || {}),
            projectId: project.projectId,
        });
        return detailedProject;
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

    const openEdit = async (project: ProjectSheetProject) => {
        const detailedProject = await loadDetailedProject(project);
        const languages = getProjectManagedLanguages(detailedProject, storeDetails);
        const selectedLanguage = getProjectPreferredLanguage(detailedProject, storeDetails);
        const nextNameDrafts = buildLocalizedDrafts(detailedProject?.name || project.name, languages);
        const nextDescriptionDrafts = buildLocalizedDrafts(detailedProject?.description || project.description, languages);

        setFormMode('edit');
        setFormProjectId(project.projectId);
        setFormLanguages(languages);
        setFormSelectedLanguage(selectedLanguage);
        setFormNameDrafts(nextNameDrafts);
        setFormDescriptionDrafts(nextDescriptionDrafts);
        setInitialFormNameDrafts(nextNameDrafts);
        setInitialFormDescriptionDrafts(nextDescriptionDrafts);
        setFormProjectImage(project.projectImage || null);
        setFormIsDefault(project.isDefault === true);
        setFormActive(project.active !== false);
        setFormStartsAt(toNativeDateTimeValue(project.specialMenuStartsAt));
        setFormEndsAt(toNativeDateTimeValue(project.specialMenuEndsAt));
    };

    const openDuplicate = async (project: ProjectSheetProject) => {
        const detailedProject = await loadDetailedProject(project);
        const languages = getProjectManagedLanguages(detailedProject, storeDetails);
        const selectedLanguage = getProjectPreferredLanguage(detailedProject, storeDetails);
        const nextNameDrafts = buildLocalizedDrafts(detailedProject?.name || project.name, languages);
        const nextDescriptionDrafts = buildLocalizedDrafts(detailedProject?.description || project.description, languages);
        nextNameDrafts[selectedLanguage] = `Copy of ${nextNameDrafts[selectedLanguage] || resolveProjectName(project.name)}`;

        setFormMode('duplicate');
        setFormProjectId(project.projectId);
        setFormLanguages(languages);
        setFormSelectedLanguage(selectedLanguage);
        setFormNameDrafts(nextNameDrafts);
        setFormDescriptionDrafts(nextDescriptionDrafts);
        setInitialFormNameDrafts(nextNameDrafts);
        setInitialFormDescriptionDrafts(nextDescriptionDrafts);
        setFormProjectImage(project.projectImage || null);
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

        if (formSourceProject?.isDefault && !formIsDefault) {
            Toast.show({ content: `Choose another ${labels.offeringLower} as default before removing this one.`, duration: 2000 });
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

        setIsSubmitting(true);
        try {
            let savedProjectImage = formProjectImage;
            if (savedProjectImage?.includes('base64')) {
                const mimeMatch = savedProjectImage.match(/^data:(.*?);base64,/);
                const { uploadFile } = await import('@database/projects');
                savedProjectImage = await uploadFile({
                    uid: formProjectId || nextName || `project-image-${Date.now()}`,
                    url: savedProjectImage,
                    type: mimeMatch?.[1] || 'image/jpeg',
                } as any, 'project-images');
            }

            if (formMode === 'create') {
                const currentDefault = projects.find((project) => project.isDefault === true);
                const result = await addProject({
                    active: formActive,
                    defaultLanguage: formSelectedLanguage,
                    description: localizedDescription,
                    isDefault: formIsDefault,
                    name: localizedName,
                    projectImage: savedProjectImage || null,
                });

                if (formIsDefault && currentDefault?.projectId && currentDefault.projectId !== result?.projectId) {
                    await updateProjectMetadata(currentDefault.projectId, { isDefault: false });
                }

                if (currentDefault?.projectId && formIsDefault && currentDefault.projectId !== result?.projectId) {
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
                        isDefault: formIsDefault,
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
                const currentDefault = projects.find((project) => project.isDefault === true);
                const result = await duplicateProject(
                    formProjectId,
                    nextName,
                    nextDescription || undefined,
                    localizedName,
                    localizedDescription,
                );

                if (savedProjectImage !== (formSourceProject?.projectImage || null) && result?.projectId) {
                    await updateProjectMetadata(result.projectId, { projectImage: savedProjectImage || null });
                }
                if (result?.projectId) {
                    await updateProjectWithoutLoader({
                        projectId: result.projectId,
                        languages: formLanguages,
                        defaultLanguage: formSelectedLanguage,
                    });
                }
                if (result?.projectId) {
                    await updateProjectMetadata(result.projectId, { isDefault: formIsDefault });
                }
                if (formIsDefault && currentDefault?.projectId && currentDefault.projectId !== result?.projectId) {
                    await updateProjectMetadata(currentDefault.projectId, { isDefault: false });
                }

                if (currentDefault?.projectId && formIsDefault && currentDefault.projectId !== result?.projectId) {
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
                        active: true,
                        description: localizedDescription,
                        defaultLanguage: formSelectedLanguage,
                        isDefault: formIsDefault,
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
                const metadataUpdate: Record<string, any> = {
                    description: localizedDescription,
                    isDefault: formIsDefault,
                    name: localizedName,
                    projectImage: savedProjectImage || null,
                };
                const nextActive = formActive;
                const activeChanged = formSourceProject?.active !== nextActive;
                const shouldUnsetPreviousDefault = formIsDefault && formSourceProject?.isDefault !== true;
                const currentDefault = projects.find(
                    (project) => project.isDefault === true && project.projectId !== formProjectId,
                );

                if (isEditingSpecialMenu) {
                    metadataUpdate.specialMenuDisplayName = localizedName;
                    metadataUpdate.specialMenuStartsAt = fromNativeDateTimeValue(formStartsAt);
                    metadataUpdate.specialMenuEndsAt = fromNativeDateTimeValue(formEndsAt);
                }

                await updateProjectMetadata(formProjectId, metadataUpdate);
                await updateProjectWithoutLoader({
                    projectId: formProjectId,
                    languages: formLanguages,
                    defaultLanguage: formSelectedLanguage,
                });
                if (activeChanged) {
                    await setProjectActive(formProjectId, nextActive);
                }
                if (shouldUnsetPreviousDefault && currentDefault?.projectId) {
                    await updateProjectMetadata(currentDefault.projectId, { isDefault: false });
                }

                if (isEditingSpecialMenu) {
                    await updateProjectWithoutLoader({
                        projectId: formProjectId,
                        _specialMenu: {
                            displayName: localizedName,
                            endsAt: fromNativeDateTimeValue(formEndsAt),
                            startsAt: fromNativeDateTimeValue(formStartsAt),
                        } as any,
                    });
                }

                if (shouldUnsetPreviousDefault && currentDefault?.projectId) {
                    upsertCachedProject({
                        ...(projectsById[currentDefault.projectId] || currentDefault),
                        ...currentDefault,
                        isDefault: false,
                        projectId: currentDefault.projectId,
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
                        specialMenuEndsAt: fromNativeDateTimeValue(formEndsAt),
                        specialMenuStartsAt: fromNativeDateTimeValue(formStartsAt),
                    } : {}),
                });

                resetFormState();
                await syncSelectionOnly(formProjectId);
                Toast.show({ content: t('catalogUpdated'), duration: 1400 });
            }
        } catch {
            Toast.show({ content: t('saveFailed'), duration: 1800 });
        } finally {
            setIsSubmitting(false);
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
                fromNativeDateTimeValue(formStartsAt) !== initialFormStartsAt ||
                fromNativeDateTimeValue(formEndsAt) !== initialFormEndsAt
            ))
        )
        : true;

    const handleResetEditForm = () => {
        if (!formSourceProject) return;
        setFormNameDrafts(initialFormNameDrafts);
        setFormDescriptionDrafts(initialFormDescriptionDrafts);
        setFormSelectedLanguage(formReferenceLanguage);
        setFormProjectImage(formSourceProject.projectImage || null);
        setFormIsDefault(formSourceProject.isDefault === true);
        setFormActive(formSourceProject.active !== false);
        setFormStartsAt(toNativeDateTimeValue(formSourceProject.specialMenuStartsAt));
        setFormEndsAt(toNativeDateTimeValue(formSourceProject.specialMenuEndsAt));
    };

    const handleMakeDefaultProject = async (project: ProjectSheetProject) => {
        const currentDefault = projects.find(
            (entry) => entry.isDefault === true && entry.projectId !== project.projectId,
        );

        await updateProjectMetadata(project.projectId, { isDefault: true });
        if (currentDefault?.projectId) {
            await updateProjectMetadata(currentDefault.projectId, { isDefault: false });
        }

        if (currentDefault?.projectId) {
            upsertCachedProject({
                ...(projectsById[currentDefault.projectId] || currentDefault),
                ...currentDefault,
                isDefault: false,
                projectId: currentDefault.projectId,
            });
        }
        upsertCachedProject({
            ...(projectsById[project.projectId] || project),
            ...project,
            isDefault: true,
            projectId: project.projectId,
        });

        setManagingProjectId(null);
        await syncSelectionOnly(project.projectId);
        Toast.show({ content: `${resolveProjectName(project.name)} is now the default ${labels.offeringLower}.`, duration: 1600 });
    };

    const handleProjectImageSelect = async (file: File) => {
        try {
            const rawBase64 = await getBase64(file);
            const optimized = await optimizeImage(rawBase64, MENU_IMAGE_CONFIG);
            setFormProjectImage(optimized.dataUrl);
        } catch (error) {
            console.error('Failed to prepare project image:', error);
            Toast.show({ content: 'Could not prepare image. Please try again.', duration: 1800 });
        }

        return false;
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

    const handleToggleActive = async (project: ProjectSheetProject) => {
        const nextActive = project.active === false;
        const isCurrent = project.projectId === currentProjectId;

        if (!nextActive && isCurrent) {
            const fallback = getDeleteFallbackProject(project.projectId);
            await setProjectActive(project.projectId, false);
            upsertCachedProject({ ...project, active: false });
            setManagingProjectId(null);
            await syncSelectionOnly(fallback?.projectId || null);
            Toast.show({ content: t('catalogInactive'), duration: 1400 });
            return;
        }

        await setProjectActive(project.projectId, nextActive);
        upsertCachedProject({ ...project, active: nextActive });
        setManagingProjectId(null);
        await syncSelectionOnly(nextActive ? project.projectId : currentProjectId || null);
        Toast.show({ content: nextActive ? t('catalogActive') : t('catalogInactive'), duration: 1400 });
    };

    const handleResetProject = async (project: ProjectSheetProject) => {
        setManagingProjectId(null);
        await updateProjectWithoutLoader({ files: [], projectId: project.projectId });
        upsertCachedProject({ ...project, files: [] });
        await syncSelectionOnly(project.projectId);
        Toast.show({ content: t('catalogReset'), duration: 1400 });
    };

    const handleDeleteProject = async (project: ProjectSheetProject) => {
        const isCurrent = project.projectId === currentProjectId;
        const fallback = getDeleteFallbackProject(project.projectId);
        const defaultReplacement = project.isDefault ? getDeleteDefaultReplacement(project.projectId) : null;
        setManagingProjectId(null);
        await deleteProject(project.projectId);
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

    const withSource = (url: string, src: 'copy' | 'direct' | 'qr') =>
        `${url}${url.includes('?') ? '&' : '?'}src=${src}`;

    const handleCopyProjectLink = async (project: ProjectSheetProject) => {
        const shareUrl = getProjectShareUrl(project);
        if (!shareUrl) {
            Toast.show({ content: tShare('domainNotSetHelp'), duration: 1600 });
            return;
        }

        try {
            await navigator.clipboard.writeText(withSource(shareUrl, 'copy'));
            setManagingProjectId(null);
            Toast.show({
                content: tShare('copiedLabel', {
                    label: tShare('directOfferingLinkCopyLabel', { offering: labels.offeringLower }),
                }),
                duration: 1200,
            });
        } catch {
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
        window.location.assign(withSource(shareUrl, 'direct'));
    };

    const handleShowProjectQr = (project: ProjectSheetProject) => {
        const shareUrl = getProjectShareUrl(project);
        const projectName = resolveProjectName(project.name, labels.offeringTitle);
        const storeName = getLocalizedText(
            (storeDetails as any)?.publicPresence?.displayName,
            undefined,
            getPrimaryLocalizedLanguage((storeDetails as any)?.publicPresence?.displayName, 'en'),
            storeDetails?.name || 'menu'
        );
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
        ...(!managingProject.isDefault && !managingProject.isSpecialMenu ? [{
            key: 'make-default',
            label: 'Make default',
            description: `Use this ${labels.offeringLower} for the main public menu link.`,
            icon: <LuCheck size={16} />,
            iconBackground: token.colorPrimaryBg,
            labelStyle: { color: token.colorPrimary },
            onClick: () => void handleMakeDefaultProject(managingProject),
        }] : []),
        ...(managingProject.isSpecialMenu ? [] : [{
            key: 'duplicate',
            label: t('duplicateCatalog'),
            description: 'Create a copy to reuse this setup.',
            icon: <LuCopy size={16} />,
            iconBackground: token.colorFillTertiary,
            labelStyle: undefined,
            onClick: () => openDuplicate(managingProject),
        }]),
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
    ] : [];

    const dangerItems: ActionItem[] = managingProject ? [
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
                        {currentProjectName ? (
                            <Text type="secondary" style={{ textAlign: 'left' }}>
                                {`Current: ${currentProjectName}`}
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
                                    <Tag color="danger">Deleted</Tag>
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
                        <Button fill="none" onClick={() => setManagingProjectId(null)} size="small">
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
                        <Button fill="none" onClick={() => resetFormState()} size="small">
                            <LuX size={18} />
                        </Button>
                    </Flex>

                    <Card style={sheetCardStyle}>
                        <Flex gap={14} vertical>
                            <MobileLocalizedLanguageSelector
                                helperText={`Edit this ${labels.offeringLower} label one language at a time.`}
                                languages={formLanguages}
                                onChange={setFormSelectedLanguage}
                                selectedLanguage={formSelectedLanguage}
                                title="Project content language"
                            />

                            <Flex gap={6} vertical>
                                <Text strong>{t('catalogName')}</Text>
                                <Input autoFocus maxLength={100} onChange={handleFormNameChange} placeholder={t('catalogNamePlaceholder')} value={formName} />
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
                                <TextArea maxLength={300} onChange={handleFormDescriptionChange} placeholder={t('descriptionPlaceholder')} rows={3} showCount value={formDescription} />
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
                                {formProjectImage ? (
                                    <Flex align="center" gap={12}>
                                        <Image
                                            alt={`${formName || labels.offeringPhrase} preview`}
                                            height={88}
                                            preview={false}
                                            src={formProjectImage}
                                            style={{ borderRadius: 12, objectFit: 'cover' }}
                                            width={132}
                                        />
                                        <Flex gap={8} vertical>
                                            <Upload accept="image/*" beforeUpload={handleProjectImageSelect} showUploadList={false}>
                                                <Button fill="outline" size="small">
                                                    <Flex align="center" gap={6}>
                                                        <LuImagePlus size={16} />
                                                        <Text>Replace image</Text>
                                                    </Flex>
                                                </Button>
                                            </Upload>
                                            <Button color="danger" fill="none" onClick={() => setFormProjectImage(null)} size="small">
                                                <Flex align="center" gap={6}>
                                                    <LuTrash2 size={16} />
                                                    <Text>Remove image</Text>
                                                </Flex>
                                            </Button>
                                        </Flex>
                                    </Flex>
                                ) : (
                                    <Upload accept="image/*" beforeUpload={handleProjectImageSelect} showUploadList={false}>
                                        <Button fill="outline" size="small">
                                            <Flex align="center" gap={6}>
                                                <LuImagePlus size={16} />
                                                <Text>Upload image</Text>
                                            </Flex>
                                        </Button>
                                    </Upload>
                                )}
                            </Flex>

                            {formMode !== 'duplicate' ? (
                                <Flex align="center" justify="space-between" gap={12}>
                                    <Flex gap={4} vertical>
                                        <Text strong>Active</Text>
                                        <Text type="secondary">Inactive menus stay hidden until you enable them.</Text>
                                    </Flex>
                                    <Switch checked={formActive} onChange={setFormActive} />
                                </Flex>
                            ) : null}

                            {!isEditingSpecialMenu ? (
                                <Flex gap={8} vertical>
                                    <Flex align="center" justify="space-between" gap={12}>
                                        <Text strong>Default</Text>
                                        <Switch checked={formIsDefault} onChange={setFormIsDefault} />
                                    </Flex>
                                    <Text type="secondary">
                                        Current default {labels.offeringLower}: <strong>{currentDefaultProjectName || `No default ${labels.offeringLower} is set yet`}</strong>
                                    </Text>
                                    <Text type="secondary">
                                        {formIsDefault
                                            ? `"${formName.trim() || `This ${labels.offeringLower}`}" will become the default menu used by your main public menu link when you save.`
                                            : formSourceProject?.isDefault
                                                ? 'This menu is currently the default. To move the default role, turn this on for another menu instead.'
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
                                    <Text strong>Starts Date & Time</Text>
                                    <Input
                                        onChange={setFormStartsAt}
                                        type="datetime-local"
                                        value={formStartsAt}
                                    />
                                </Flex>
                                <Flex gap={6} vertical>
                                    <Text strong>Ends Date & Time</Text>
                                    <Input
                                        onChange={setFormEndsAt}
                                        type="datetime-local"
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
                copyErrorMessage={tShare('couldNotCopy')}
                copySuccessMessage={tShare('copiedLabel', {
                    label: tShare('directOfferingLinkCopyLabel', { offering: labels.offeringLower }),
                })}
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
