'use client'

import { addProject, deleteProject, duplicateProject, setProjectActive, updateProject, updateProjectMetadata } from '@database/projects';
import { ProjectSelectorList } from '../../shared/ProjectSelector';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { LuArchiveRestore, LuCopy, LuPen, LuPower, LuRotateCcw, LuTrash2 } from 'react-icons/lu';
import { useMobileProjects } from '../providers/MobileProjectsProvider';
import { Button, Card, Dialog, DotLoading, Flex, Input, List, Popup, Text, TextArea, Title, Toast } from '../antd';

type ProjectSheetProject = {
    active?: boolean;
    description?: string;
    isDefault?: boolean;
    name: string;
    projectId: string;
};

interface MobileProjectSelectorSheetProps {
    currentProjectId?: string | null;
    currentProjectName?: string | null;
    onClose: () => void;
    onProjectsChanged: (preferredProjectId?: string | null) => Promise<void> | void;
    visible: boolean;
}

type FormMode = 'create' | 'edit' | 'duplicate' | null;

export default function MobileProjectSelectorSheet({
    currentProjectId,
    currentProjectName,
    onClose,
    onProjectsChanged,
    visible,
}: MobileProjectSelectorSheetProps) {
    const t = useTranslations('MobileProjectSelector');
    const { isLoading, projectsList, refreshProjects, upsertCachedProject } = useMobileProjects();
    const [managingProjectId, setManagingProjectId] = useState<string | null>(null);
    const [formMode, setFormMode] = useState<FormMode>(null);
    const [formProjectId, setFormProjectId] = useState<string | null>(null);
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const projects = projectsList as ProjectSheetProject[];

    const managingProject = useMemo(
        () => projects.find((project) => project.projectId === managingProjectId) || null,
        [managingProjectId, projects]
    );

    const resetFormState = () => {
        setFormMode(null);
        setFormProjectId(null);
        setFormName('');
        setFormDescription('');
        setIsSubmitting(false);
    };

    const openCreate = () => {
        setManagingProjectId(null);
        setFormMode('create');
        setFormProjectId(null);
        setFormName('');
        setFormDescription('');
    };

    const openEdit = (project: ProjectSheetProject) => {
        setManagingProjectId(null);
        setFormMode('edit');
        setFormProjectId(project.projectId);
        setFormName(project.name);
        setFormDescription(project.description || '');
    };

    const openDuplicate = (project: ProjectSheetProject) => {
        setManagingProjectId(null);
        setFormMode('duplicate');
        setFormProjectId(project.projectId);
        setFormName(`Copy of ${project.name}`);
        setFormDescription(project.description || '');
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
        const target = projects.find((project) => project.projectId === projectId);
        if (!target || target.active === false) {
            Toast.show({ content: t('activateBeforeUsing'), duration: 1600 });
            return;
        }

        onClose();
        await onProjectsChanged(projectId);
        Toast.show({ content: t('catalogSwitched'), duration: 1200 });
    };

    const handleSubmitForm = async () => {
        const nextName = formName.trim();
        const nextDescription = formDescription.trim();

        if (!nextName) {
            Toast.show({ content: t('catalogNameRequired'), duration: 1600 });
            return;
        }

        setIsSubmitting(true);
        try {
            if (formMode === 'create') {
                const result = await addProject({
                    description: nextDescription || undefined,
                    name: nextName,
                });

                resetFormState();
                await refreshAndSync(result?.projectId || null);
                Toast.show({ content: t('catalogCreated'), duration: 1400 });
                return;
            }

            if (formMode === 'duplicate' && formProjectId) {
                const result = await duplicateProject(formProjectId, nextName, nextDescription || undefined);

                resetFormState();
                await refreshAndSync(result?.projectId || null);
                Toast.show({ content: t('catalogDuplicated'), duration: 1400 });
                return;
            }

            if (formMode === 'edit' && formProjectId) {
                await updateProjectMetadata(formProjectId, {
                    description: nextDescription || undefined,
                    name: nextName,
                });

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
        await updateProject({ files: [], projectId: project.projectId });
        upsertCachedProject({ ...project, files: [] });
        await refreshAndSync(project.projectId);
        Toast.show({ content: t('catalogReset'), duration: 1400 });
    };

    const handleDeleteProject = async (project: ProjectSheetProject) => {
        const isCurrent = project.projectId === currentProjectId;
        const fallback = projects.find((entry) => entry.projectId !== project.projectId && entry.active !== false);
        setManagingProjectId(null);
        await deleteProject(project.projectId);
        await refreshAndSync(isCurrent ? fallback?.projectId || null : currentProjectId || null);
        Toast.show({ content: t('catalogDeleted'), duration: 1400 });
    };

    const actionItems = managingProject ? [
        {
            key: 'edit',
            label: t('editCatalog'),
            icon: <LuPen size={16} />,
            onClick: () => { openEdit(managingProject); },
        },
        {
            key: 'duplicate',
            label: t('duplicateCatalog'),
            icon: <LuCopy size={16} />,
            onClick: () => openDuplicate(managingProject),
        },
        {
            key: 'active',
            label: managingProject.active === false ? t('activateCatalog') : t('makeInactive'),
            icon: <LuPower size={16} />,
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
            icon: <LuRotateCcw size={16} />,
            onClick: () => {
                void Dialog.confirm({
                    cancelText: t('cancel'),
                    confirmText: t('reset'),
                    content: t('resetCatalogConfirm'),
                    onConfirm: () => void handleResetProject(managingProject),
                });
            },
        },
        {
            key: 'delete',
            label: t('deleteCatalog'),
            icon: <LuTrash2 size={16} />,
            onClick: () => {
                void Dialog.confirm({
                    cancelText: t('cancel'),
                    confirmText: t('delete'),
                    content: t('deleteCatalogConfirm', { name: managingProject.name }),
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
                    <Flex gap={4} vertical>
                        <Title level={3} style={{ margin: 0, textAlign: 'center' }}>{t('selectCatalog')}</Title>
                        <Text type="secondary" style={{ textAlign: 'center' }}>
                            {t('selectCatalogDesc')}
                        </Text>
                        {currentProjectName ? (
                            <Text type="secondary" style={{ textAlign: 'center' }}>
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
                            projects={projects.map((project) => ({
                                id: project.projectId,
                                isDefault: project.isDefault,
                                name: project.name,
                                secondaryLabel: project.active === false ? t('inactiveCatalog') : (project.description || undefined),
                            }))}
                        />
                    )}
                </Flex>
            </Popup>

            <Popup
                bodyStyle={{ borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
                onMaskClick={() => setManagingProjectId(null)}
                position="bottom"
                visible={Boolean(managingProject)}
            >
                <Flex gap={12} vertical>
                    <Title level={4} style={{ margin: 0 }}>{managingProject?.name || t('catalogActions')}</Title>
                    <Card>
                        <List>
                            {actionItems.map((item) => (
                                <List.Item
                                    key={item.key}
                                    onClick={item.onClick}
                                    prefix={item.icon}
                                    title={<Text strong>{item.label}</Text>}
                                />
                            ))}
                        </List>
                    </Card>
                    <Button block fill="outline" onClick={() => setManagingProjectId(null)}>
                        {t('close')}
                    </Button>
                </Flex>
            </Popup>

            <Popup
                bodyStyle={{ borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
                onMaskClick={() => resetFormState()}
                position="bottom"
                visible={Boolean(formMode)}
            >
                <Flex gap={16} style={{ maxHeight: 'min(82vh, 720px)', overflowY: 'auto' }} vertical>
                    <Title level={4} style={{ margin: 0 }}>
                        {formMode === 'create' ? t('createCatalog') : formMode === 'duplicate' ? t('duplicateCatalog') : t('editCatalog')}
                    </Title>

                    <Card>
                        <Flex gap={14} vertical>
                            <Flex gap={6} vertical>
                                <Text strong>{t('catalogName')}</Text>
                                <Input autoFocus maxLength={100} onChange={setFormName} placeholder={t('catalogNamePlaceholder')} value={formName} />
                            </Flex>

                            <Flex gap={6} vertical>
                                <Text strong>{t('description')}</Text>
                                <TextArea maxLength={300} onChange={setFormDescription} placeholder={t('descriptionPlaceholder')} rows={3} showCount value={formDescription} />
                            </Flex>
                        </Flex>
                    </Card>

                    {formMode === 'duplicate' ? (
                        <Card size="small">
                            <Flex align="flex-start" gap={10}>
                                <LuArchiveRestore size={18} />
                                <Text type="secondary">{t('duplicateCatalogHelp')}</Text>
                            </Flex>
                        </Card>
                    ) : null}

                    <Flex gap={8}>
                        <Button block fill="outline" onClick={() => resetFormState()}>
                            {t('cancel')}
                        </Button>
                        <Button block loading={isSubmitting} onClick={() => void handleSubmitForm()}>
                            {formMode === 'create' ? t('create') : formMode === 'duplicate' ? t('duplicate') : t('save')}
                        </Button>
                    </Flex>
                </Flex>
            </Popup>
        </>
    );
}
