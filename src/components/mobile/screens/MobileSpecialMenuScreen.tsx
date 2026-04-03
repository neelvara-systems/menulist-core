'use client'

/**
 * MobileSpecialMenuScreen — Mobile screen for managing special menus
 *
 * PARTIAL MOBILE SUPPORT:
 * ✅ View special menu status (active/scheduled/expired)
 * ✅ End active special menu early ("End Now")
 * ✅ Cancel scheduled special menu
 * ❌ Create new special menu (requires full editor — desktop only)
 * ❌ Edit special menu content (requires full editor — desktop only)
 *
 * Uses same useSpecialMenus() hook as desktop — same DAL, same data.
 * Optimistic updates: UI updates instantly, backend syncs after.
 *
 * @see __docs__/special-menu-switching/special-menu-switching_mobile-support.md
 */

import type { SpecialMenuListItem } from '@hook/useSpecialMenus';
import { useSpecialMenus } from '@hook/useSpecialMenus';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { LuCalendar, LuMonitor, LuPause, LuSparkles, LuX } from 'react-icons/lu';
import { Button, Card, Dialog, DotLoading, Empty, Flex, NavBar, Tag, Text, Title, Toast } from '../antd';

interface MobileSpecialMenuScreenProps {
    onBack: () => void;
}

function formatDate(iso: string): string {
    if (!iso) return '';
    const date = new Date(iso);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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

function SpecialMenuItem({
    item,
    onDeactivate,
    onCancel,
}: {
    item: SpecialMenuListItem;
    onDeactivate: (id: string) => void;
    onCancel: (id: string) => void;
}) {
    const [loading, setLoading] = useState(false);

    const handleEnd = useCallback(async () => {
        const confirmed = await Dialog.confirm({
            content: `End "${item.displayName}" now? Your regular menu will come back immediately.`,
            confirmText: 'End Now',
            cancelText: 'Keep Active',
        });
        if (!confirmed) return;
        setLoading(true);
        onDeactivate(item.projectId);
        setLoading(false);
    }, [item.displayName, item.projectId, onDeactivate]);

    const handleCancel = useCallback(async () => {
        const confirmed = await Dialog.confirm({
            content: `Cancel "${item.displayName}"? It will not activate on ${formatDate(item.startsAt)}.`,
            confirmText: 'Cancel It',
            cancelText: 'Keep Scheduled',
        });
        if (!confirmed) return;
        setLoading(true);
        onCancel(item.projectId);
        setLoading(false);
    }, [item.displayName, item.projectId, item.startsAt, onCancel]);

    return (
        <Card
            style={{
                backgroundColor: item.status === 'active' ? '#f6ffed' : '#ffffff',
                borderColor: item.status === 'active' ? '#b7eb8f' : undefined,
            }}
        >
            <Flex align="flex-start" gap={12} justify="space-between">
                <Flex gap={8} style={{ flex: 1 }} vertical>
                    <Flex align="center" gap={8} wrap="wrap">
                        <Text strong>{item.displayName}</Text>
                        <StatusTag status={item.status} />
                    </Flex>

                    <Flex align="center" gap={6}>
                        <LuCalendar color="#94a3b8" size={12} />
                        <Text type="secondary">{`${formatDate(item.startsAt)} to ${formatDate(item.endsAt)}`}</Text>
                    </Flex>

                    <Text type="secondary">
                        {item.mode === 'replace' ? 'Replaces the regular menu.' : 'Added as a special section.'}
                    </Text>
                </Flex>

                {item.status === 'active' ? (
                    <Button color="danger" fill="outline" loading={loading} onClick={handleEnd} size="small">
                        <Flex align="center" gap={6}>
                            <LuPause size={14} />
                            <Text>End Now</Text>
                        </Flex>
                    </Button>
                ) : null}

                {item.status === 'scheduled' ? (
                    <Button fill="outline" loading={loading} onClick={handleCancel} size="small">
                        <Flex align="center" gap={6}>
                            <LuX size={14} />
                            <Text>Cancel</Text>
                        </Flex>
                    </Button>
                ) : null}
            </Flex>
        </Card>
    );
}

export default function MobileSpecialMenuScreen({ onBack }: MobileSpecialMenuScreenProps) {
    const t = useTranslations('MobileSpecialMenu');
    const {
        specialMenus,
        activeMenu,
        scheduledMenus,
        expiredMenus,
        isLoading,
        deactivateMenu,
        cancelMenu,
    } = useSpecialMenus();

    const [showExpired, setShowExpired] = useState(false);

    const handleDeactivate = useCallback(async (projectId: string) => {
        const result = await deactivateMenu(projectId);
        if (result.success) {
            Toast.show({ content: t('specialMenuEnded'), icon: 'success', duration: 1500 });
        } else {
            Toast.show({ content: result.error || t('failedToEnd'), duration: 2000 });
        }
    }, [deactivateMenu, t]);

    const handleCancel = useCallback(async (projectId: string) => {
        const result = await cancelMenu(projectId);
        if (result.success) {
            Toast.show({ content: t('specialMenuCancelled'), icon: 'success', duration: 1500 });
        } else {
            Toast.show({ content: result.error || t('failedToCancel'), duration: 2000 });
        }
    }, [cancelMenu, t]);

    const activeOrScheduled = [...(activeMenu ? [activeMenu] : []), ...scheduledMenus];
    const hasAny = specialMenus.length > 0;

    return (
        <Flex style={{ height: '100%' }} vertical>
            <NavBar onBack={onBack}>
                <Flex align="center" gap={6}>
                    <LuSparkles size={16} />
                    <Text strong>{t('title')}</Text>
                </Flex>
            </NavBar>

            <Flex gap={16} style={{ flex: 1, overflowY: 'auto', padding: 16 }} vertical>
                {isLoading ? (
                    <Card>
                        <Flex align="center" gap={12} justify="center" vertical>
                            <DotLoading />
                            <Text type="secondary">Loading special menus...</Text>
                        </Flex>
                    </Card>
                ) : null}

                {!isLoading && !hasAny ? (
                    <Card>
                        <Flex align="center" gap={12} vertical>
                            <LuSparkles color="#cbd5e1" size={32} />
                            <Empty description={t('noSpecialMenus')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            <Text type="secondary" style={{ textAlign: 'center' }}>
                                {t('createFromDesktop')}
                            </Text>
                        </Flex>
                    </Card>
                ) : null}

                {activeOrScheduled.map((item) => (
                    <SpecialMenuItem
                        key={item.projectId}
                        item={item}
                        onCancel={handleCancel}
                        onDeactivate={handleDeactivate}
                    />
                ))}

                {expiredMenus.length > 0 ? (
                    <Button fill="none" onClick={() => setShowExpired(!showExpired)} size="small">
                        {showExpired ? t('hidePastMenus') : t('showPastMenus', { count: expiredMenus.length })}
                    </Button>
                ) : null}

                {showExpired ? expiredMenus.slice(0, 5).map((item) => (
                    <SpecialMenuItem
                        key={item.projectId}
                        item={item}
                        onCancel={handleCancel}
                        onDeactivate={handleDeactivate}
                    />
                )) : null}

                <Card size="small" style={{ backgroundColor: '#fafafa' }}>
                    <Flex align="flex-start" gap={10}>
                        <LuMonitor color="#94a3b8" size={18} />
                        <Text type="secondary">{t('desktopOnlyNotice')}</Text>
                    </Flex>
                </Card>
            </Flex>
        </Flex>
    );
}
