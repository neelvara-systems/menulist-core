'use client'

import { addProject, deleteProject, duplicateProject, setProjectActive, updateProjectMetadata, updateProjectWithoutLoader } from '@database/projects';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { MENU_IMAGE_CONFIG, optimizeImage } from '@lib/image/optimizeImage';
import { buildQrCodeFilename } from '@lib/utils/qrCode';
import { generateProjectUrl } from '@lib/utils/slugify';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { getBase64 } from '@util/utils';
import { ProjectSelectorList } from '../../shared/ProjectSelector';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useContext, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { LuArchiveRestore, LuCopy, LuExternalLink, LuImagePlus, LuPalette, LuPen, LuPower, LuQrCode, LuRotateCcw, LuTrash2, LuX } from 'react-icons/lu';
import MobileQrCodeSheet from './MobileQrCodeSheet';
import { useMobileProjects } from '../providers/MobileProjectsProvider';
import { Button, Card, Dialog, DotLoading, Flex, Image, Input, List, Popup, Switch, Tag, Text, TextArea, Title, Toast, Upload } from '../antd';

type ProjectSheetProject = {
    active?: boolean;
    deleted?: boolean;
    description?: string;
    isDefault?: boolean;
    isSpecialMenu?: boolean;
    name: string;
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
    const { isLoading, projectsList, refreshProjects, upsertCachedProject } = useMobileProjects();
    const [managingProjectId, setManagingProjectId] = useState<string | null>(null);
    const [formMode, setFormMode] = useState<FormMode>(null);
    const [formProjectId, setFormProjectId] = useState<string | null>(null);
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formProjectImage, setFormProjectImage] = useState<string | null>(null);
    const [formActive, setFormActive] = useState(true);
    const [formStartsAt, setFormStartsAt] = useState('');
    const [formEndsAt, setFormEndsAt] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [qrSheet, setQrSheet] = useState<QrSheetState | null>(null);
    const [isQrSheetOpen, setIsQrSheetOpen] = useState(false);
    const sheetCardStyle = {
        borderRadius: Number(token.borderRadiusLG || token.borderRadius) + 4,
        borderColor: token.colorBorderSecondary,
        overflow: 'hidden',
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

    const resetFormState = () => {
        setFormMode(null);
        setFormProjectId(null);
        setFormName('');
        setFormDescription('');
        setFormProjectImage(null);
        setFormActive(true);
        setFormStartsAt('');
        setFormEndsAt('');
        setIsSubmitting(false);
    };

    const openCreate = () => {
        setManagingProjectId(null);
        setFormMode('create');
        setFormProjectId(null);
        setFormName('');
        setFormDescription('');
        setFormProjectImage(null);
        setFormActive(true);
        setFormStartsAt('');
        setFormEndsAt('');
    };

    const openEdit = (project: ProjectSheetProject) => {
        setFormMode('edit');
        setFormProjectId(project.projectId);
        setFormName(project.name);
        setFormDescription(project.description || '');
        setFormProjectImage(project.projectImage || null);
        setFormActive(project.active !== false);
        setFormStartsAt(toNativeDateTimeValue(project.specialMenuStartsAt));
        setFormEndsAt(toNativeDateTimeValue(project.specialMenuEndsAt));
    };

    const openDuplicate = (project: ProjectSheetProject) => {
        setFormMode('duplicate');
        setFormProjectId(project.projectId);
        setFormName(`Copy of ${project.name}`);
        setFormDescription(project.description || '');
        setFormProjectImage(project.projectImage || null);
        setFormActive(true);
        setFormStartsAt('');
        setFormEndsAt('');
    };

    const refreshAndSync = async (preferredProjectId?: string | null) => {
        await refreshProjects({
            force: true,
            preferredProjectId: preferredProjectId || null,
            showLoader: false,
        });
        await onProjectsChanged(preferredProjectId);
    };

    const handleSelectProject = async (projectId: string) => {
        onClose();
        await onProjectsChanged(projectId);
        Toast.show({ content: t('catalogSwitched'), duration: 1200 });
    };

    const handleSubmitForm = async () => {
        const nextName = formName.trim();
        const nextDescription = formDescription.trim();
        const isEditingSpecialMenu = formMode === 'edit' && Boolean(formSourceProject?.isSpecialMenu);

        if (!nextName) {
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
                const result = await addProject({
                    active: formActive,
                    description: nextDescription || undefined,
                    name: nextName,
                    projectImage: savedProjectImage || null,
                });

                resetFormState();
                await refreshAndSync(result?.projectId || null);
                Toast.show({ content: t('catalogCreated'), duration: 1400 });
                return;
            }

            if (formMode === 'duplicate' && formProjectId) {
                const result = await duplicateProject(formProjectId, nextName, nextDescription || undefined);

                if (savedProjectImage !== (formSourceProject?.projectImage || null) && result?.projectId) {
                    await updateProjectMetadata(result.projectId, { projectImage: savedProjectImage || null });
                }

                resetFormState();
                await refreshAndSync(result?.projectId || null);
                Toast.show({ content: t('catalogDuplicated'), duration: 1400 });
                return;
            }

            if (formMode === 'edit' && formProjectId) {
                const metadataUpdate: Record<string, any> = {
                    description: nextDescription || undefined,
                    name: nextName,
                    projectImage: savedProjectImage || null,
                };
                const nextActive = formActive;
                const activeChanged = formSourceProject?.active !== nextActive;

                if (isEditingSpecialMenu) {
                    metadataUpdate.specialMenuDisplayName = nextName;
                    metadataUpdate.specialMenuStartsAt = fromNativeDateTimeValue(formStartsAt);
                    metadataUpdate.specialMenuEndsAt = fromNativeDateTimeValue(formEndsAt);
                }

                await updateProjectMetadata(formProjectId, metadataUpdate);
                if (activeChanged) {
                    await setProjectActive(formProjectId, nextActive);
                }

                if (isEditingSpecialMenu) {
                    await updateProjectWithoutLoader({
                        projectId: formProjectId,
                        _specialMenu: {
                            displayName: nextName,
                            endsAt: fromNativeDateTimeValue(formEndsAt),
                            startsAt: fromNativeDateTimeValue(formStartsAt),
                        } as any,
                    });
                }

                resetFormState();
                await refreshAndSync(formProjectId);
                Toast.show({ content: t('catalogUpdated'), duration: 1400 });
            }
        } catch {
            Toast.show({ content: t('saveFailed'), duration: 1800 });
        } finally {
            setIsSubmitting(false);
        }
    };

    const initialFormName = formMode === 'duplicate'
        ? `Copy of ${formSourceProject?.name || ''}`
        : formSourceProject?.name || '';
    const initialFormDescription = formSourceProject?.description || '';
    const initialFormProjectImage = formSourceProject?.projectImage || null;
    const initialFormStartsAt = formSourceProject?.specialMenuStartsAt || '';
    const initialFormEndsAt = formSourceProject?.specialMenuEndsAt || '';
    const isEditingSpecialMenu = formMode === 'edit' && Boolean(formSourceProject?.isSpecialMenu);
    const hasFormChanges = formMode === 'edit'
        ? (
            formName.trim() !== initialFormName.trim() ||
            formDescription.trim() !== initialFormDescription.trim() ||
            formProjectImage !== initialFormProjectImage ||
            formActive !== (formSourceProject?.active !== false) ||
            (isEditingSpecialMenu && (
                fromNativeDateTimeValue(formStartsAt) !== initialFormStartsAt ||
                fromNativeDateTimeValue(formEndsAt) !== initialFormEndsAt
            ))
        )
        : true;

    const handleResetEditForm = () => {
        if (!formSourceProject) return;
        setFormName(formSourceProject.name || '');
        setFormDescription(formSourceProject.description || '');
        setFormProjectImage(formSourceProject.projectImage || null);
        setFormActive(formSourceProject.active !== false);
        setFormStartsAt(toNativeDateTimeValue(formSourceProject.specialMenuStartsAt));
        setFormEndsAt(toNativeDateTimeValue(formSourceProject.specialMenuEndsAt));
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

    const handleToggleActive = async (project: ProjectSheetProject) => {
        const nextActive = project.active === false;
        const isCurrent = project.projectId === currentProjectId;

        if (!nextActive && isCurrent) {
            const fallback = projects.find((entry) => entry.projectId !== project.projectId && entry.active !== false);
            await setProjectActive(project.projectId, false);
            setManagingProjectId(null);
            await refreshAndSync(fallback?.projectId || null);
            Toast.show({ content: t('catalogInactive'), duration: 1400 });
            return;
        }

        await setProjectActive(project.projectId, nextActive);
        upsertCachedProject({ ...project, active: nextActive });
        setManagingProjectId(null);
        await refreshAndSync(nextActive ? project.projectId : currentProjectId || null);
        Toast.show({ content: nextActive ? t('catalogActive') : t('catalogInactive'), duration: 1400 });
    };

    const handleResetProject = async (project: ProjectSheetProject) => {
        setManagingProjectId(null);
        await updateProjectWithoutLoader({ files: [], projectId: project.projectId });
        upsertCachedProject({ ...project, files: [] });
        await refreshAndSync(project.projectId);
        Toast.show({ content: t('catalogReset'), duration: 1400 });
    };

    const handleDeleteProject = async (project: ProjectSheetProject) => {
        const isCurrent = project.projectId === currentProjectId;
        const fallback = orderedProjects.find((entry) => entry.projectId !== project.projectId && entry.active !== false);
        setManagingProjectId(null);
        await deleteProject(project.projectId);
        await refreshAndSync(isCurrent ? fallback?.projectId || null : currentProjectId || null);
        Toast.show({ content: t('catalogDeleted'), duration: 1400 });
    };

    const getProjectShareUrl = (project: ProjectSheetProject) => {
        if (!storeDetails) return null;
        if (!project.name || project.deleted === true) return null;

        const subdomain = storeDetails.subdomain || '';
        const customDomain = storeDetails.customDomain;
        if (!subdomain && !customDomain) return null;

        try {
            return generateProjectUrl(subdomain, customDomain, project.name, false);
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
        window.open(withSource(shareUrl, 'direct'), '_blank');
    };

    const handleShowProjectQr = (project: ProjectSheetProject) => {
        const shareUrl = getProjectShareUrl(project);
        if (!shareUrl) {
            Toast.show({ content: tShare('domainNotSetHelp'), duration: 1600 });
            return;
        }

        setQrSheet({
            filename: buildQrCodeFilename(`${storeDetails?.name || 'menu'}-${project.name}-direct-link`, 'qr'),
            helperText: tShare('directOfferingLinkDesc', { offering: labels.offeringLower }),
            title: `${project.name} ${tShare('showQr')}`,
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
                    content: `Reset "${managingProject.name}" and remove its uploaded files and extracted menu data? You can keep the catalog itself, but you will need to upload and build it again.`,
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
                    content: `Delete "${managingProject.name}" permanently? This removes the catalog, its files, and its menu data. This action cannot be undone.`,
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
                                {t('currentCatalog', { name: currentProjectName })}
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
                                secondaryLabel: project.active === false ? t('inactiveCatalog') : (project.description || undefined),
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
                                    {managingProject?.name || t('catalogActions')}
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
                bodyStyle={{ borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 0 }}
                onMaskClick={() => resetFormState()}
                position="bottom"
                visible={Boolean(formMode)}
            >
                <Flex gap={16} style={{ maxHeight: 'min(82vh, 720px)', overflowY: 'auto' }} vertical>
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
                            <Flex gap={6} vertical>
                                <Text strong>{t('catalogName')}</Text>
                                <Input autoFocus maxLength={100} onChange={setFormName} placeholder={t('catalogNamePlaceholder')} value={formName} />
                            </Flex>

                            <Flex gap={6} vertical>
                                <Text strong>{t('description')}</Text>
                                <TextArea maxLength={300} onChange={setFormDescription} placeholder={t('descriptionPlaceholder')} rows={3} showCount value={formDescription} />
                                <Text type="secondary">Only for you. Customers do not see this description.</Text>
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
