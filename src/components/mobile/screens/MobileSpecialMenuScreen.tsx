'use client'

/**
 * MobileSpecialMenuScreen — Mobile screen for managing and creating special menus.
 *
 * Reuses the same special menu DAL as desktop for create, edit, and lifecycle actions.
 */

import { getSpecialMenuCapabilities } from '@config/specialMenuConfig';
import type { SpecialMenuListItem } from '@hook/useSpecialMenus';
import { useSpecialMenus } from '@hook/useSpecialMenus';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { theme } from 'antd';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LuCalendar, LuMonitor, LuPause, LuPencil, LuPlus, LuSparkles, LuX } from 'react-icons/lu';
import { Button, Card, Dialog, DotLoading, Empty, Flex, Input, NavBar, Popup, Select, Switch, Tag, Text, TextArea, Toast } from '../antd';
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

type SpecialMenuConflictCheckParams = {
    endsAt: string;
    projectId?: string;
    startsAt: string;
};

function formatDate(iso: string): string {
    if (!iso) return '';
    const date = new Date(iso);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatScheduleRange(startsAt: string, endsAt: string): string {
    if (!startsAt || !endsAt) return '';
    const start = dayjs(startsAt);
    const end = dayjs(endsAt);
    const sameDay = start.isSame(end, 'day');

    if (sameDay) {
        return `${start.format('MMM D, YYYY • h:mm A')} - ${end.format('h:mm A')}`;
    }

    return `${start.format('MMM D, YYYY • h:mm A')} - ${end.format('MMM D, YYYY • h:mm A')}`;
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

function getScheduledStartsAtValue(allowTimeScheduling: boolean): string {
    return toInputValue(dayjs().add(1, allowTimeScheduling ? 'hour' : 'day').toISOString(), allowTimeScheduling);
}

function getScheduleConflict(
    specialMenus: SpecialMenuListItem[],
    params: SpecialMenuConflictCheckParams,
): SpecialMenuListItem | null {
    const nextStart = new Date(params.startsAt).getTime();
    const nextEnd = new Date(params.endsAt).getTime();

    return specialMenus.find((menu) => {
        if (menu.projectId === params.projectId) return false;
        if (menu.status === 'expired' || menu.status === 'cancelled') return false;

        const existingStart = new Date(menu.startsAt).getTime();
        const existingEnd = new Date(menu.endsAt).getTime();

        return nextStart < existingEnd && nextEnd > existingStart;
    }) || null;
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
    baseProjectOptions,
    defaultBaseProjectId,
    onClose,
    onResolveOverlap,
    onSubmit,
    open,
}: {
    baseProjectOptions: BaseProjectOption[];
    defaultBaseProjectId: string;
    onClose: () => void;
    onResolveOverlap?: (payload: SpecialMenuConflictCheckParams) => Promise<boolean | null>;
    onSubmit: (payload: {
        allowOverlap?: boolean;
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
    const [startsAt, setStartsAt] = useState(() => toInputValue(new Date().toISOString(), true));
    const [endsAt, setEndsAt] = useState(() => toInputValue(dayjs().add(1, 'day').toISOString(), true));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isActiveToggleOn = startsAt
        ? dayjs(toIsoValue(startsAt, true)).valueOf() <= Date.now()
        : false;

    const resetForm = () => {
        setBaseProjectId(defaultBaseProjectId);
        setDisplayName('');
        setMode(capabilities.availableModes[0] || 'overlay');
        setStartsAt(toInputValue(new Date().toISOString(), true));
        setEndsAt(toInputValue(dayjs().add(1, 'day').toISOString(), true));
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

        const startsAtIso = toIsoValue(startsAt, true);
        const endsAtIso = toIsoValue(endsAt, true);

        if (dayjs(endsAtIso).valueOf() <= dayjs(startsAtIso).valueOf()) {
            Toast.show({ content: t('endAfterStart'), duration: 2000 });
            return;
        }

        const overlapResolution = await onResolveOverlap?.({
            endsAt: endsAtIso,
            startsAt: startsAtIso,
        }) ?? null;
        if (overlapResolution === false) {
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit({
                allowOverlap: overlapResolution === true,
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

    const handleLifecycleToggle = (nextValue: boolean) => {
        if (nextValue) {
            setStartsAt(toInputValue(new Date().toISOString(), true));
            return;
        }

        setStartsAt(getScheduledStartsAtValue(true));
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
                <NavBar onBack={handleClose}>{t('createTitle')}</NavBar>

                <Flex gap={16} style={{ flex: 1, overflowY: 'auto', padding: 16 }} vertical>
                    <Card>
                        <Flex gap={14} vertical>
                            <Flex gap={4} vertical>
                                <Text strong>{t('baseMenuLabel')}</Text>
                                <Text type="secondary">Choose which existing menu this special menu should start from.</Text>
                                <Select
                                    onChange={setBaseProjectId}
                                    options={baseProjectOptions}
                                    showSearch={false}
                                    value={baseProjectId}
                                />
                            </Flex>

                            <Flex gap={4} vertical>
                                <Text strong>{t('nameLabel')}</Text>
                                <Text type="secondary">Give the special menu a clear public name like Summer Specials or Weekend Brunch.</Text>
                                <Input
                                    maxLength={100}
                                    onChange={setDisplayName}
                                    placeholder={t('namePlaceholder')}
                                    value={displayName}
                                />
                            </Flex>

                            {capabilities.availableModes.length > 1 ? (
                                <Flex gap={4} vertical>
                                    <Text strong>{t('modeLabel')}</Text>
                                    <Text type="secondary">
                                        This controls what customers see when the special menu is live: replace the regular menu completely, or show it as an extra section alongside the regular menu.
                                    </Text>
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
                            ) : (
                                <Card size="small" style={{ backgroundColor: token.colorBgLayout }}>
                                    <Flex gap={4} vertical>
                                        <Text strong>{t('modeLabel')}</Text>
                                        <Text type="secondary">
                                            {mode === 'replace'
                                                ? 'Customers will see only the special menu while it is live.'
                                                : 'Customers will see the special menu as an extra section alongside the regular menu.'}
                                        </Text>
                                    </Flex>
                                </Card>
                            )}

                            <Card size="small" style={{ backgroundColor: token.colorBgLayout }}>
                                <Flex align="center" gap={12} justify="space-between">
                                    <Flex gap={4} style={{ flex: 1 }} vertical>
                                        <Text strong>Active now</Text>
                                        <Text type="secondary">
                                            Turn this on to make the special menu active immediately. Turn it off to keep it scheduled.
                                        </Text>
                                    </Flex>
                                    <Switch checked={isActiveToggleOn} onChange={handleLifecycleToggle} />
                                </Flex>
                            </Card>

                            <Flex gap={4} vertical>
                                <Text strong>{`${t('startsLabel')} Date & Time`}</Text>
                                <Text type="secondary">Choose when this special menu should start appearing.</Text>
                                <Input
                                    onChange={setStartsAt}
                                    type="datetime-local"
                                    value={startsAt}
                                />
                            </Flex>

                            <Flex gap={4} vertical>
                                <Text strong>{`${t('endsLabel')} Date & Time`}</Text>
                                <Text type="secondary">Choose when this special menu should stop appearing automatically.</Text>
                                <Input
                                    onChange={setEndsAt}
                                    type="datetime-local"
                                    value={endsAt}
                                />
                            </Flex>
                        </Flex>
                    </Card>

                    <Card size="small" style={{ backgroundColor: token.colorBgLayout }}>
                        <Text type="secondary">{t('createHelp')}</Text>
                    </Card>
                </Flex>

                <Flex
                    gap={8}
                    style={{
                        backdropFilter: 'blur(10px)',
                        backgroundColor: token.colorBgContainer,
                        borderTop: `1px solid ${token.colorBorderSecondary}`,
                        padding: '12px 16px',
                    }}
                >
                    <Button block disabled={isSubmitting} fill="outline" onClick={handleClose} size="large">
                        {t('cancelAction')}
                    </Button>
                    <Button block loading={isSubmitting} onClick={() => { void handleSubmit(); }} size="large">
                        {t('createShort')}
                    </Button>
                </Flex>
            </Flex>
        </Popup>
    );
}

function EditSpecialMenuSheet({
    item,
    onClose,
    onResolveOverlap,
    onSubmit,
    open,
}: {
    item: SpecialMenuListItem | null;
    onClose: () => void;
    onResolveOverlap?: (payload: SpecialMenuConflictCheckParams) => Promise<boolean | null>;
    onSubmit: (payload: {
        allowOverlap?: boolean;
        projectId: string;
        description?: string;
        displayName: string;
        endsAt: string;
        startsAt: string;
    }) => Promise<void>;
    open: boolean;
}) {
    const t = useTranslations('MobileSpecialMenu');
    const tProjectSelector = useTranslations('MobileProjectSelector');
    const tSettings = useTranslations('Settings');
    const { token } = theme.useToken();
    const [displayName, setDisplayName] = useState('');
    const [description, setDescription] = useState('');
    const [startsAt, setStartsAt] = useState('');
    const [endsAt, setEndsAt] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const resetForm = () => {
        setDisplayName(item?.displayName || '');
        setDescription(item?.description || '');
        setStartsAt(toInputValue(item?.startsAt, true));
        setEndsAt(toInputValue(item?.endsAt, true));
    };

    useEffect(() => {
        resetForm();
    }, [item]);

    const initialName = item?.displayName || '';
    const initialDescription = item?.description || '';
    const initialStartsAt = toInputValue(item?.startsAt, true);
    const initialEndsAt = toInputValue(item?.endsAt, true);
    const isActiveToggleOn = startsAt
        ? dayjs(toIsoValue(startsAt, true)).valueOf() <= Date.now()
        : false;
    const hasChanges = displayName.trim() !== initialName.trim()
        || description.trim() !== initialDescription.trim()
        || startsAt !== initialStartsAt
        || endsAt !== initialEndsAt;

    const handleClose = () => {
        if (isSubmitting) return;
        resetForm();
        onClose();
    };

    const handleSubmit = async () => {
        const trimmedName = displayName.trim();
        const trimmedDescription = description.trim();

        if (!item?.projectId) return;

        if (!trimmedName) {
            Toast.show({ content: t('nameRequired'), duration: 1800 });
            return;
        }

        if (!startsAt || !endsAt) {
            Toast.show({ content: t('scheduleRequired'), duration: 1800 });
            return;
        }

        const startsAtIso = toIsoValue(startsAt, true);
        const endsAtIso = toIsoValue(endsAt, true);

        if (dayjs(endsAtIso).valueOf() <= dayjs(startsAtIso).valueOf()) {
            Toast.show({ content: t('endAfterStart'), duration: 2000 });
            return;
        }

        const overlapResolution = await onResolveOverlap?.({
            endsAt: endsAtIso,
            projectId: item.projectId,
            startsAt: startsAtIso,
        }) ?? null;
        if (overlapResolution === false) {
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit({
                allowOverlap: overlapResolution === true,
                projectId: item.projectId,
                description: trimmedDescription || undefined,
                displayName: trimmedName,
                endsAt: endsAtIso,
                startsAt: startsAtIso,
            });
            resetForm();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLifecycleToggle = (nextValue: boolean) => {
        if (nextValue) {
            setStartsAt(toInputValue(new Date().toISOString(), true));
            return;
        }

        setStartsAt(getScheduledStartsAtValue(true));
    };

    if (!item) return null;

    return (
        <Popup
            bodyStyle={{
                maxHeight: '92vh',
                minHeight: '60vh',
                overflow: 'hidden',
                padding: 0,
            }}
            destroyOnClose
            onMaskClick={isSubmitting ? undefined : handleClose}
            visible={open}
        >
            <Flex style={{ height: '100%', position: 'relative' }} vertical>
                <NavBar
                    right={(
                        <Button
                            fill="none"
                            onClick={handleClose}
                            style={{ minHeight: 40, minWidth: 40, paddingInline: 0 }}
                        >
                            <LuX size={18} />
                        </Button>
                    )}
                >
                    {t('editAction')}
                </NavBar>

                <Flex gap={16} style={{ flex: 1, overflowY: 'auto', padding: 16 }} vertical>
                    <Card>
                        <Flex gap={14} vertical>
                            <Flex gap={4} vertical>
                                <Text strong>{t('nameLabel')}</Text>
                                <Text type="secondary">Use the public-facing name customers should see for this special menu.</Text>
                                <Input
                                    maxLength={100}
                                    onChange={setDisplayName}
                                    placeholder={t('namePlaceholder')}
                                    value={displayName}
                                />
                            </Flex>

                            <Flex gap={4} vertical>
                                <Text strong>{tProjectSelector('description')}</Text>
                                <Text type="secondary">Optional short note to explain what is included or why this menu is special.</Text>
                                <TextArea
                                    maxLength={300}
                                    onChange={setDescription}
                                    placeholder={tProjectSelector('descriptionPlaceholder')}
                                    rows={3}
                                    showCount
                                    value={description}
                                />
                            </Flex>

                            <Card size="small" style={{ backgroundColor: token.colorBgLayout }}>
                                <Flex align="center" justify="space-between" gap={12}>
                                    <Flex gap={4} style={{ flex: 1 }} vertical>
                                        <Text strong>Activate now</Text>
                                        <Text type="secondary">
                                            Turn this on to make the special menu active immediately. Turn it off to keep it scheduled.
                                        </Text>
                                    </Flex>
                                    <Switch checked={isActiveToggleOn} onChange={handleLifecycleToggle} />
                                </Flex>
                            </Card>

                            <Flex gap={4} vertical>
                                <Text strong>{`${t('startsLabel')} Date & Time`}</Text>
                                <Text type="secondary">This controls when customers first see the special menu.</Text>
                                <Input
                                    onChange={setStartsAt}
                                    type="datetime-local"
                                    value={startsAt}
                                />
                            </Flex>

                            <Flex gap={4} vertical>
                                <Text strong>{`${t('endsLabel')} Date & Time`}</Text>
                                <Text type="secondary">This controls when the special menu automatically stops showing.</Text>
                                <Input
                                    onChange={setEndsAt}
                                    type="datetime-local"
                                    value={endsAt}
                                />
                            </Flex>
                        </Flex>
                    </Card>

                    <Card size="small" style={{ backgroundColor: token.colorBgLayout }}>
                        <Text type="secondary">{t('editInMenuTab')}</Text>
                    </Card>
                </Flex>

                <Flex
                    gap={8}
                    style={{
                        backdropFilter: 'blur(10px)',
                        backgroundColor: token.colorBgContainer,
                        borderTop: `1px solid ${token.colorBorderSecondary}`,
                        padding: '12px 16px',
                    }}
                >
                    <Button block disabled={!hasChanges || isSubmitting} fill="outline" onClick={resetForm} size="large">
                        {tSettings('reset')}
                    </Button>
                    <Button block disabled={!hasChanges || isSubmitting} onClick={() => { void handleSubmit(); }} size="large">
                        {tSettings('saveChanges')}
                    </Button>
                </Flex>

                {isSubmitting ? (
                    <Flex
                        align="center"
                        justify="center"
                        style={{
                            backgroundColor: token.colorBgMask,
                            inset: 0,
                            position: 'absolute',
                            zIndex: 2,
                        }}
                    >
                        <Flex align="center" gap={12} vertical>
                            <DotLoading color="primary" />
                            <Text>{tSettings('saveChanges')}</Text>
                        </Flex>
                    </Flex>
                ) : null}
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
    onEdit: (item: SpecialMenuListItem) => Promise<void> | void;
}) {
    const t = useTranslations('MobileSpecialMenu');
    const { token } = theme.useToken();
    const [isWorking, setIsWorking] = useState(false);
    const modeLabel = item.mode === 'replace' ? t('replaceOption') : t('overlayOption');
    const actionButtonStyle = {
        minWidth: 108,
        borderRadius: 999,
    };

    const handleEdit = async () => {
        setIsWorking(true);
        try {
            await onEdit(item);
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
            size="small"
            style={{
                backgroundColor: token.colorBgContainer,
                borderColor: item.status === 'active' ? token.colorPrimaryBorder : token.colorBorderSecondary,
                boxShadow: 'none',
            }}
        >
            <Flex gap={14} vertical>
                <Flex align="flex-start" gap={12} justify="space-between">
                    <Flex gap={10} style={{ flex: 1, minWidth: 0 }} vertical>
                        <Flex align="center" gap={8} justify="space-between" wrap="wrap">
                            <Text strong style={{ fontSize: 16 }}>{item.displayName}</Text>
                            <StatusTag status={item.status} />
                        </Flex>

                        <Flex align="center" gap={6} style={{ minWidth: 0 }}>
                            <LuCalendar color={token.colorTextTertiary} size={13} />
                            <Text style={{ color: token.colorTextSecondary, fontSize: 13 }}>
                                {formatScheduleRange(item.startsAt, item.endsAt)}
                            </Text>
                        </Flex>

                        <Flex align="center" gap={8} wrap="wrap">
                            <Tag style={{ marginInlineEnd: 0 }}>{modeLabel}</Tag>
                            {baseProjectName ? <Tag style={{ marginInlineEnd: 0 }}>{t('baseMenuValue', { name: baseProjectName })}</Tag> : null}
                        </Flex>

                        {item.description ? (
                            <Text style={{ color: token.colorTextSecondary, fontSize: 13 }}>
                                {item.description}
                            </Text>
                        ) : null}
                    </Flex>
                </Flex>

                <Flex gap={8} justify="flex-end" wrap="wrap">
                    {(item.status === 'active' || item.status === 'scheduled') ? (
                        <Button fill="outline" loading={isWorking} onClick={() => { void handleEdit(); }} size="small" style={actionButtonStyle}>
                            <Flex align="center" gap={6}>
                                <LuPencil size={14} />
                                <Text>{t('editAction')}</Text>
                            </Flex>
                        </Button>
                    ) : null}

                    {item.status === 'active' ? (
                        <Button color="danger" fill="outline" loading={isWorking} onClick={() => { void handleEnd(); }} size="small" style={actionButtonStyle}>
                            <Flex align="center" gap={6}>
                                <LuPause size={14} />
                                <Text>{t('endNow')}</Text>
                            </Flex>
                        </Button>
                    ) : null}

                    {item.status === 'scheduled' ? (
                        <Button fill="outline" loading={isWorking} onClick={() => { void handleCancel(); }} size="small" style={actionButtonStyle}>
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
    const tProjectSelector = useTranslations('MobileProjectSelector');
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
        updateSpecialMenu,
        deactivateMenu,
        cancelMenu,
    } = useSpecialMenus();
    const [showExpired, setShowExpired] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingMenu, setEditingMenu] = useState<SpecialMenuListItem | null>(null);

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

    const getConflictMessage = useCallback((payload: SpecialMenuConflictCheckParams) => {
        const conflict = getScheduleConflict(specialMenus, payload);
        if (!conflict) return null;

        return `Schedule conflicts with "${conflict.displayName}" (${conflict.startsAt} — ${conflict.endsAt})`;
    }, [specialMenus]);

    const resolveOverlap = useCallback(async (payload: SpecialMenuConflictCheckParams) => {
        const conflictMessage = getConflictMessage(payload);
        if (!conflictMessage) return null;

        return await Dialog.confirm({
            cancelText: 'Back',
            confirmText: 'Continue',
            content: `${conflictMessage}. Continue anyway?`,
        });
    }, [getConflictMessage]);

    const handleOpenSpecialProject = async (projectId: string) => {
        await selectProject(projectId);
        onOpenMenuTab?.();
    };

    const handleCreateSpecialMenu = async (payload: {
        allowOverlap?: boolean;
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

    const handleOpenEditSheet = (item: SpecialMenuListItem) => {
        setEditingMenu(item);
    };

    const handleUpdateSpecialMenu = async (payload: {
        allowOverlap?: boolean;
        projectId: string;
        description?: string;
        displayName: string;
        endsAt: string;
        startsAt: string;
    }) => {
        const result = await updateSpecialMenu(payload);

        if (!result.success) {
            Toast.show({ content: result.error || tProjectSelector('saveFailed'), duration: 2200 });
            return;
        }

        setEditingMenu(null);
        Toast.show({ content: tProjectSelector('catalogUpdated'), icon: 'success', duration: 1600 });
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
            <NavBar onBack={onBack} />

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
                        onEdit={handleOpenEditSheet}
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
                        onEdit={handleOpenEditSheet}
                    />
                )) : null}

                <Card size="small" style={{ backgroundColor: token.colorBgLayout }}>
                    <Flex align="flex-start" gap={10}>
                        <LuMonitor color={token.colorTextTertiary} size={18} />
                        <Text type="secondary">{t('editInMenuTab')}</Text>
                    </Flex>
                </Card>
            </Flex>

            <Flex
                style={{
                    backdropFilter: 'blur(10px)',
                    backgroundColor: token.colorBgContainer,
                    borderTop: `1px solid ${token.colorBorderSecondary}`,
                    padding: '12px 16px',
                }}
            >
                <Button
                    block
                    color="primary"
                    disabled={!baseProjectOptions.length}
                    onClick={() => setIsCreateOpen(true)}
                    size="large"
                >
                    <Flex align="center" gap={8} justify="center">
                        <LuPlus size={16} />
                        <Text>{t('createTitle')}</Text>
                    </Flex>
                </Button>
            </Flex>

            <CreateSpecialMenuSheet
                baseProjectOptions={baseProjectOptions}
                defaultBaseProjectId={defaultBaseProjectId}
                onClose={() => setIsCreateOpen(false)}
                onResolveOverlap={resolveOverlap}
                onSubmit={handleCreateSpecialMenu}
                open={isCreateOpen}
            />

            <EditSpecialMenuSheet
                item={editingMenu}
                onClose={() => setEditingMenu(null)}
                onResolveOverlap={resolveOverlap}
                onSubmit={handleUpdateSpecialMenu}
                open={Boolean(editingMenu)}
            />
        </Flex>
    );
}
