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
import { Button, Card, Dialog, DotLoading, NavBar, Tag, Toast } from 'antd-mobile';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { LuCalendar, LuMonitor, LuPause, LuSparkles, LuX } from 'react-icons/lu';

interface MobileSpecialMenuScreenProps {
    onBack: () => void;
}

function formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusTag({ status }: { status: string }) {
    const config: Record<string, { color: string; text: string }> = {
        active: { color: '#52c41a', text: 'Active' },
        scheduled: { color: '#1890ff', text: 'Scheduled' },
        expired: { color: '#d9d9d9', text: 'Ended' },
        cancelled: { color: '#d9d9d9', text: 'Cancelled' },
    };
    const c = config[status] || config.scheduled;
    return (
        <Tag
            style={{
                '--background-color': c.color + '20',
                '--text-color': c.color,
                '--border-color': c.color,
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 4,
            }}
        >
            {c.text}
        </Tag>
    );
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
    }, [item, onDeactivate]);

    const handleCancel = useCallback(async () => {
        const confirmed = await Dialog.confirm({
            content: `Cancel "${item.displayName}"? It won't activate on ${formatDate(item.startsAt)}.`,
            confirmText: 'Cancel It',
            cancelText: 'Keep Scheduled',
        });
        if (!confirmed) return;
        setLoading(true);
        onCancel(item.projectId);
        setLoading(false);
    }, [item, onCancel]);

    return (
        <Card
            style={{
                marginBottom: 12,
                borderRadius: 12,
                border: item.status === 'active' ? '1px solid #b7eb8f' : '1px solid #f0f0f0',
                background: item.status === 'active' ? '#f6ffed' : '#fff',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{item.displayName}</span>
                        <StatusTag status={item.status} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#999', fontSize: 13, marginBottom: 4 }}>
                        <LuCalendar size={12} />
                        <span>{formatDate(item.startsAt)} → {formatDate(item.endsAt)}</span>
                    </div>
                    <div style={{ color: '#999', fontSize: 12 }}>
                        {item.mode === 'replace' ? 'Replaces regular menu' : 'Added as special section'}
                    </div>
                </div>

                <div>
                    {item.status === 'active' && (
                        <Button
                            size="small"
                            color="danger"
                            fill="outline"
                            loading={loading}
                            onClick={handleEnd}
                            style={{ fontSize: 13, borderRadius: 8 }}
                        >
                            <LuPause size={14} style={{ marginRight: 4 }} />
                            End Now
                        </Button>
                    )}
                    {item.status === 'scheduled' && (
                        <Button
                            size="small"
                            fill="outline"
                            loading={loading}
                            onClick={handleCancel}
                            style={{ fontSize: 13, borderRadius: 8 }}
                        >
                            <LuX size={14} style={{ marginRight: 4 }} />
                            Cancel
                        </Button>
                    )}
                </div>
            </div>
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
    }, [deactivateMenu]);

    const handleCancel = useCallback(async (projectId: string) => {
        const result = await cancelMenu(projectId);
        if (result.success) {
            Toast.show({ content: t('specialMenuCancelled'), icon: 'success', duration: 1500 });
        } else {
            Toast.show({ content: result.error || t('failedToCancel'), duration: 2000 });
        }
    }, [cancelMenu]);

    const activeOrScheduled = [...(activeMenu ? [activeMenu] : []), ...scheduledMenus];
    const hasAny = specialMenus.length > 0;

    return (
        <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
            <NavBar onBack={onBack} style={{ '--height': '48px', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <LuSparkles size={16} />
                    {t('title')}
                </div>
            </NavBar>

            <div style={{ padding: 16 }}>
                {isLoading && (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                        <DotLoading />
                    </div>
                )}

                {!isLoading && !hasAny && (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                        <LuSparkles size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>{t('noSpecialMenus')}</div>
                        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                            {t('createFromDesktop')}
                        </div>
                    </div>
                )}

                {/* Active & scheduled menus */}
                {activeOrScheduled.map((item) => (
                    <SpecialMenuItem
                        key={item.projectId}
                        item={item}
                        onDeactivate={handleDeactivate}
                        onCancel={handleCancel}
                    />
                ))}

                {/* Expired/cancelled toggle */}
                {expiredMenus.length > 0 && (
                    <div style={{ textAlign: 'center', marginTop: 8, marginBottom: 8 }}>
                        <Button
                            fill="none"
                            size="small"
                            onClick={() => setShowExpired(!showExpired)}
                            style={{ color: '#999', fontSize: 13 }}
                        >
                            {showExpired ? t('hidePastMenus') : t('showPastMenus', { count: expiredMenus.length })}
                        </Button>
                    </div>
                )}

                {showExpired && expiredMenus.slice(0, 5).map((item) => (
                    <SpecialMenuItem
                        key={item.projectId}
                        item={item}
                        onDeactivate={handleDeactivate}
                        onCancel={handleCancel}
                    />
                ))}

                {/* Desktop-only notice */}
                <div style={{
                    marginTop: 24,
                    padding: '12px 16px',
                    background: '#fff',
                    borderRadius: 10,
                    border: '1px solid #f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                }}>
                    <LuMonitor size={18} style={{ color: '#999', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#999', lineHeight: 1.4 }}>
                        {t('desktopOnlyNotice')}
                    </span>
                </div>
            </div>
        </div>
    );
}
