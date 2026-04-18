'use client'

/**
 * MobileSpecialMenuScreen — Mobile screen for managing and creating special menus.
 *
 * Reuses the same special menu DAL as desktop and hands off editing to the
 * existing mobile menu editor by selecting the special menu project and
 * switching to the Menu tab.
 */

import { getSpecialMenuCapabilities } from '@config/specialMenuConfig';
import type { SpecialMenuListItem } from '@hook/useSpecialMenus';
import { useSpecialMenus } from '@hook/useSpecialMenus';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { theme } from 'antd';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import { useContext, useMemo, useState } from 'react';
import { LuCalendar, LuMonitor, LuPause, LuPencil, LuPlus, LuSparkles, LuX } from 'react-icons/lu';
import { Button, Card, Dialog, DotLoading, Empty, Flex, Input, NavBar, Popup, Select, Tag, Text, Toast } from '../antd';
import MobileScreenIntro from '../components/MobileScreenIntro';
import { useMobileProjects } from '../providers/MobileProjectsProvider';

interface MobileSpecialMenuScreenProps {
    onBack: () => void;
    onOpenMenuTab?: () => void;
}

type BaseProjectOption = {
    label: string;
    value: string;
};

function formatDate(iso: string): string {
    if (!iso) return '';
    const date = new Date(iso);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function toInputValue(iso: string | null | undefined, allowTimeScheduling: boolean): string {
    if (!iso) return '';
    const date = dayjs(iso);
    return allowTimeScheduling ? date.format('YYYY-MM-DDTHH:mm') : date.format('YYYY-MM-DD');
}

function toIsoValue(rawValue: string, allowTimeScheduling: boolean): string {
    return allowTimeScheduling
        ? dayjs(rawValue).toISOString()
        : dayjs(rawValue).startOf('day').toISOString();
}

function StatusTag({ status }: { status: string }) {
    const config: Record<string, { color: string; text: string }> = {
        active: { color: 'success', text: 'Active' },
        scheduled: { color: 'processing', text: 'Scheduled' },
        expired: { color: 'default', text: 'Ended' },
        cancelled: { color: 'default', text: 'Cancelled' },
    };
    const current = config[status] || config.scheduled;
    return <Tag color={current.color}>{current.text}</Tag>;
}

function CreateSpecialMenuSheet({
    allowTimeScheduling,
    baseProjectOptions,
    defaultBaseProjectId,
    onClose,
    onSubmit,
    open,
}: {
    allowTimeScheduling: boolean;
    baseProjectOptions: BaseProjectOption[];
    defaultBaseProjectId: string;
    onClose: () => void;
    onSubmit: (payload: {
        baseProjectId: string;
        displayName: string;
        endsAt: string;
        mode: 'replace' | 'overlay';
        startsAt: string;
    }) => Promise<void>;
    open: boolean;
}) {
    const t = useTranslations('MobileSpecialMenu');
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const capabilities = useMemo(
        () => getSpecialMenuCapabilities(storeDetails?.businessType),
        [storeDetails?.businessType]
    );
    const { token } = theme.useToken();
    const [baseProjectId, setBaseProjectId] = useState(defaultBaseProjectId);
    const [displayName, setDisplayName] = useState('');
    const [mode, setMode] = useState<'replace' | 'overlay'>(capabilities.availableModes[0] || 'overlay');
    const [startsAt, setStartsAt] = useState(() => toInputValue(dayjs().add(1, 'hour').toISOString(), allowTimeScheduling));
    const [endsAt, setEndsAt] = useState(() => toInputValue(dayjs().add(1, 'day').toISOString(), allowTimeScheduling));
    const [isSubmitting, setIsSubmitting] = useState(false);

    const resetForm = () => {
        setBaseProjectId(defaultBaseProjectId);
        setDisplayName('');
        setMode(capabilities.availableModes[0] || 'overlay');
        setStartsAt(toInputValue(dayjs().add(1, 'hour').toISOString(), allowTimeScheduling));
        setEndsAt(toInputValue(dayjs().add(1, 'day').toISOString(), allowTimeScheduling));
    };

    const handleClose = () => {
        if (isSubmitting) return;
        resetForm();
        onClose();
    };

    const handleSubmit = async () => {
        const trimmedName = displayName.trim();

        if (!baseProjectId) {
            Toast.show({ content: t('baseMenuRequired'), duration: 1800 });
            return;
        }

        if (!trimmedName) {
            Toast.show({ content: t('nameRequired'), duration: 1800 });
            return;
        }

        if (!startsAt || !endsAt) {
            Toast.show({ content: t('scheduleRequired'), duration: 1800 });
            return;
        }

        const startsAtIso = toIsoValue(startsAt, allowTimeScheduling);
        const endsAtIso = toIsoValue(endsAt, allowTimeScheduling);

        if (dayjs(endsAtIso).valueOf() <= dayjs(startsAtIso).valueOf()) {
            Toast.show({ content: t('endAfterStart'), duration: 2000 });
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit({
                baseProjectId,
                displayName: trimmedName,
                endsAt: endsAtIso,
                mode,
                startsAt: startsAtIso,
            });
            resetForm();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Popup
            bodyStyle={{
                maxHeight: '92vh',
                minHeight: '60vh',
                overflow: 'hidden',
                padding: 0,
            }}
            destroyOnClose
            onMaskClick={handleClose}
            visible={open}
        >
            <Flex style={{ height: '100%' }} vertical>
                <NavBar
                    onBack={handleClose}
                    right={(
                        <Button
                            fill="none"
                            onClick={() => { void handleSubmit(); }}
                            style={{ color: token.colorPrimary, minHeight: 40, minWidth: 72 }}
                        >
                            {isSubmitting ? t('creatingShort') : t('createShort')}
                        </Button>
                    )}
                >
                    {t('createTitle')}
                </NavBar>

                <Flex gap={16} style={{ flex: 1, overflowY: 'auto', padding: 16 }} vertical>
                    <Card>
                        <Flex gap={14} vertical>
                            <Flex gap={4} vertical>
                                <Text strong>{t('baseMenuLabel')}</Text>
                                <Select
                                    onChange={setBaseProjectId}
                                    options={baseProjectOptions}
                                    showSearch={false}
                                    value={baseProjectId}
                                />
                            </Flex>

                            <Flex gap={4} vertical>
                                <Text strong>{t('nameLabel')}</Text>
                                <Input
                                    maxLength={100}
                                    onChange={setDisplayName}
                                    placeholder={t('namePlaceholder')}
                                    value={displayName}
                                />
                            </Flex>

                            <Flex gap={4} vertical>
                                <Text strong>{t('modeLabel')}</Text>
                                <Select
                                    onChange={(value) => setMode(value as 'replace' | 'overlay')}
                                    options={capabilities.availableModes.map((value) => ({
                                        label: value === 'replace' ? t('replaceOption') : t('overlayOption'),
                                        value,
                                    }))}
                                    showSearch={false}
                                    value={mode}
                                />
                                <Text type="secondary">
                                    {mode === 'replace' ? t('replaceDescription') : t('overlayDescription')}
                                </Text>
                            </Flex>

                            <Flex gap={4} vertical>
                                <Text strong>{t('startsLabel')}</Text>
                                <Input
                                    onChange={setStartsAt}
                                    type={allowTimeScheduling ? 'datetime-local' : 'date'}
                                    value={startsAt}
                                />
                            </Flex>

                            <Flex gap={4} vertical>
                                <Text strong>{t('endsLabel')}</Text>
                                <Input
                                    onChange={setEndsAt}
                                    type={allowTimeScheduling ? 'datetime-local' : 'date'}
                                    value={endsAt}
                                />
                            </Flex>
                        </Flex>
                    </Card>

                    <Card size="small" style={{ backgroundColor: token.colorBgLayout }}>
                        <Text type="secondary">{t('createHelp')}</Text>
                    </Card>
                </Flex>
            </Flex>
        </Popup>
    );
}

function SpecialMenuItem({
    baseProjectName,
    item,
    onCancel,
    onDeactivate,
    onEdit,
}: {
    baseProjectName?: string;
    item: SpecialMenuListItem;
    onCancel: (id: string) => Promise<void>;
    onDeactivate: (id: string) => Promise<void>;
    onEdit: (projectId: string) => Promise<void>;
}) {
    const t = useTranslations('MobileSpecialMenu');
    const { token } = theme.useToken();
    const [isWorking, setIsWorking] = useState(false);

    const handleEdit = async () => {
        setIsWorking(true);
        try {
            await onEdit(item.projectId);
        } finally {
            setIsWorking(false);
        }
    };

    const handleEnd = async () => {
        const confirmed = await Dialog.confirm({
            cancelText: t('keepActive'),
            confirmText: t('endNow'),
            content: t('endConfirm', { name: item.displayName }),
        });
        if (!confirmed) return;

        setIsWorking(true);
        try {
            await onDeactivate(item.projectId);
        } finally {
            setIsWorking(false);
        }
    };

    const handleCancel = async () => {
        const confirmed = await Dialog.confirm({
            cancelText: t('keepScheduled'),
            confirmText: t('cancelAction'),
            content: t('cancelConfirm', { date: formatDate(item.startsAt), name: item.displayName }),
        });
        if (!confirmed) return;

        setIsWorking(true);
        try {
            await onCancel(item.projectId);
        } finally {
            setIsWorking(false);
        }
    };

    return (
        <Card
            style={{
                backgroundColor: item.status === 'active' ? token.colorSuccessBg : token.colorBgContainer,
                borderColor: item.status === 'active' ? token.colorSuccessBorder : token.colorBorderSecondary,
            }}
        >
            <Flex gap={12} vertical>
                <Flex align="flex-start" gap={12} justify="space-between">
                    <Flex gap={8} style={{ flex: 1 }} vertical>
                        <Flex align="center" gap={8} wrap="wrap">
                            <Text strong>{item.displayName}</Text>
                            <StatusTag status={item.status} />
                        </Flex>

                        <Flex align="center" gap={6}>
                            <LuCalendar color={token.colorTextTertiary} size={12} />
                            <Text type="secondary">{`${formatDate(item.startsAt)} to ${formatDate(item.endsAt)}`}</Text>
                        </Flex>

                        <Text type="secondary">
                            {item.mode === 'replace' ? t('replaceDescription') : t('overlayDescription')}
                        </Text>

                        {baseProjectName ? (
                            <Text type="secondary">{t('baseMenuValue', { name: baseProjectName })}</Text>
                        ) : null}
                    </Flex>
                </Flex>

                <Flex gap={8} wrap="wrap">
                    {(item.status === 'active' || item.status === 'scheduled') ? (
                        <Button fill="outline" loading={isWorking} onClick={() => { void handleEdit(); }} size="small">
                            <Flex align="center" gap={6}>
                                <LuPencil size={14} />
                                <Text>{t('editAction')}</Text>
                            </Flex>
                        </Button>
                    ) : null}

                    {item.status === 'active' ? (
                        <Button color="danger" fill="outline" loading={isWorking} onClick={() => { void handleEnd(); }} size="small">
                            <Flex align="center" gap={6}>
                                <LuPause size={14} />
                                <Text>{t('endNow')}</Text>
                            </Flex>
                        </Button>
                    ) : null}

                    {item.status === 'scheduled' ? (
                        <Button fill="outline" loading={isWorking} onClick={() => { void handleCancel(); }} size="small">
                            <Flex align="center" gap={6}>
                                <LuX size={14} />
                                <Text>{t('cancelAction')}</Text>
                            </Flex>
                        </Button>
                    ) : null}
                </Flex>
            </Flex>
        </Card>
    );
}

export default function MobileSpecialMenuScreen({ onBack, onOpenMenuTab }: MobileSpecialMenuScreenProps) {
    const t = useTranslations('MobileSpecialMenu');
    const { token } = theme.useToken();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const {
        selectProject,
        selectedProjectId,
        selectedProjectSummary,
        projectsList,
    } = useMobileProjects();
    const {
        specialMenus,
        activeMenu,
        scheduledMenus,
        expiredMenus,
        isLoading,
        createSpecialMenu,
        deactivateMenu,
        cancelMenu,
    } = useSpecialMenus();
    const [showExpired, setShowExpired] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const capabilities = useMemo(
        () => getSpecialMenuCapabilities(storeDetails?.businessType),
        [storeDetails?.businessType]
    );

    const baseProjectOptions = useMemo(
        () => (projectsList || [])
            .filter((project: any) => project.active !== false && project.isSpecialMenu !== true)
            .map((project: any) => ({
                label: project.isDefault ? `${project.name} (${t('defaultMenuSuffix')})` : project.name,
                value: project.projectId,
            })),
        [projectsList, t]
    );

    const defaultBaseProjectId = useMemo(() => {
        const currentSelectedIsBase = baseProjectOptions.some((project) => project.value === selectedProjectId);
        if (currentSelectedIsBase && selectedProjectId) {
            return selectedProjectId;
        }

        const defaultProject = (projectsList || []).find((project: any) => project.active !== false && project.isDefault && project.isSpecialMenu !== true);
        return defaultProject?.projectId || baseProjectOptions[0]?.value || '';
    }, [baseProjectOptions, projectsList, selectedProjectId]);

    const projectNameById = useMemo(
        () => Object.fromEntries((projectsList || []).map((project: any) => [project.projectId, project.name || t('untitledProject')])),
        [projectsList, t]
    );

    const handleOpenSpecialProject = async (projectId: string) => {
        await selectProject(projectId);
        onOpenMenuTab?.();
    };

    const handleCreateSpecialMenu = async (payload: {
        baseProjectId: string;
        displayName: string;
        endsAt: string;
        mode: 'replace' | 'overlay';
        startsAt: string;
    }) => {
        const result = await createSpecialMenu(payload);

        if (!result.success || !result.projectId) {
            Toast.show({ content: result.error || t('failedToCreate'), duration: 2200 });
            return;
        }

        setIsCreateOpen(false);
        Toast.show({ content: t('specialMenuCreated'), icon: 'success', duration: 1600 });
        await handleOpenSpecialProject(result.projectId);
    };

    const handleDeactivate = async (projectId: string) => {
        const result = await deactivateMenu(projectId);
        if (result.success) {
            Toast.show({ content: t('specialMenuEnded'), icon: 'success', duration: 1500 });
            return;
        }
        Toast.show({ content: result.error || t('failedToEnd'), duration: 2000 });
    };

    const handleCancel = async (projectId: string) => {
        const result = await cancelMenu(projectId);
        if (result.success) {
            Toast.show({ content: t('specialMenuCancelled'), icon: 'success', duration: 1500 });
            return;
        }
        Toast.show({ content: result.error || t('failedToCancel'), duration: 2000 });
    };

    const activeOrScheduled = [...(activeMenu ? [activeMenu] : []), ...scheduledMenus];
    const hasAny = specialMenus.length > 0;
    const selectedBaseProjectName = selectedProjectSummary?.isSpecialMenu !== true
        ? selectedProjectSummary?.name
        : projectNameById[defaultBaseProjectId];

    return (
        <Flex style={{ height: '100%' }} vertical>
            <NavBar
                onBack={onBack}
                right={(
                    <Button
                        disabled={!baseProjectOptions.length}
                        fill="none"
                        onClick={() => setIsCreateOpen(true)}
                        style={{ color: token.colorPrimary, minHeight: 40, minWidth: 72 }}
                    >
                        <Flex align="center" gap={6}>
                            <LuPlus size={16} />
                            <Text>{t('createShort')}</Text>
                        </Flex>
                    </Button>
                )}
            />

            <Flex gap={16} style={{ flex: 1, overflowY: 'auto', padding: 16 }} vertical>
                <MobileScreenIntro
                    subtitle={t('subtitle')}
                    title={t('title')}
                />

                {selectedBaseProjectName ? (
                    <Card size="small" style={{ backgroundColor: token.colorBgLayout }}>
                        <Text type="secondary">{t('currentBaseMenu', { name: selectedBaseProjectName })}</Text>
                    </Card>
                ) : null}

                {isLoading ? (
                    <Card>
                        <Flex align="center" gap={12} justify="center" vertical>
                            <DotLoading />
                            <Text type="secondary">{t('loading')}</Text>
                        </Flex>
                    </Card>
                ) : null}

                {!isLoading && !hasAny ? (
                    <Card>
                        <Flex align="center" gap={12} vertical>
                            <LuSparkles color={token.colorTextQuaternary} size={32} />
                            <Empty description={t('noSpecialMenus')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            <Text type="secondary" style={{ textAlign: 'center' }}>
                                {t('createFirstHelp')}
                            </Text>
                            <Button
                                disabled={!defaultBaseProjectId}
                                onClick={() => setIsCreateOpen(true)}
                                size="large"
                            >
                                {t('createTitle')}
                            </Button>
                        </Flex>
                    </Card>
                ) : null}

                {activeOrScheduled.map((item) => (
                    <SpecialMenuItem
                        baseProjectName={item.baseProjectId ? projectNameById[item.baseProjectId] : undefined}
                        item={item}
                        key={item.projectId}
                        onCancel={handleCancel}
                        onDeactivate={handleDeactivate}
                        onEdit={handleOpenSpecialProject}
                    />
                ))}

                {expiredMenus.length > 0 ? (
                    <Button fill="none" onClick={() => setShowExpired(!showExpired)} size="small">
                        {showExpired ? t('hidePastMenus') : t('showPastMenus', { count: expiredMenus.length })}
                    </Button>
                ) : null}

                {showExpired ? expiredMenus.slice(0, 5).map((item) => (
                    <SpecialMenuItem
                        baseProjectName={item.baseProjectId ? projectNameById[item.baseProjectId] : undefined}
                        item={item}
                        key={item.projectId}
                        onCancel={handleCancel}
                        onDeactivate={handleDeactivate}
                        onEdit={handleOpenSpecialProject}
                    />
                )) : null}

                <Card size="small" style={{ backgroundColor: token.colorBgLayout }}>
                    <Flex align="flex-start" gap={10}>
                        <LuMonitor color={token.colorTextTertiary} size={18} />
                        <Text type="secondary">{t('editInMenuTab')}</Text>
                    </Flex>
                </Card>
            </Flex>

            <CreateSpecialMenuSheet
                allowTimeScheduling={capabilities.allowTimeScheduling}
                baseProjectOptions={baseProjectOptions}
                defaultBaseProjectId={defaultBaseProjectId}
                onClose={() => setIsCreateOpen(false)}
                onSubmit={handleCreateSpecialMenu}
                open={isCreateOpen}
            />
        </Flex>
    );
}
