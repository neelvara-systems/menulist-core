'use client';

/**
 * Mobile Customer App Screen
 *
 * Combined settings + live analytics view for the Customer App (installable PWA).
 *
 * Matches the owner experience but adapted for mobile:
 *   - Settings toggles (enable app, prompt promotion, home-screen name)
 *   - Live metrics card (Installed Customers, App Opens 30d, Install Conversion %, Top Shortcut)
 *
 * All data comes from the same backend paths used by desktop:
 *   - Settings write via `updatePWASettings()` DAL → `pwaSettings.*` on the store doc
 *   - Analytics read via `useAnalyticsData(dateRange, 'customerApp')`
 *
 * This screen intentionally keeps settings + analytics together so owners
 * don't have to hop between two mobile screens to understand the feature.
 */

import { FEATURE_FLAGS } from '@config/features';
import { resolvePWASettings, updatePWASettings } from '@database/pwa';
import useAnalyticsData from '@hook/useAnalyticsData';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { theme } from 'antd';
import dayjs from 'dayjs';
import { useContext, useEffect, useMemo, useState } from 'react';
import {
    LuDownload,
    LuEye,
    LuRocket,
    LuSmartphone,
    LuStar,
} from 'react-icons/lu';
import {
    Button,
    Card,
    DotLoading,
    Flex,
    Input,
    NavBar,
    Switch,
    Text,
    Title,
    Toast,
} from '../antd';

interface Props {
    onBack: () => void;
}

type DailyShape = {
    date: string;
    totalInstalled?: number;
    totalAppOpens?: number;
    shortcutClicks?: Record<string, number>;
};

type SummaryShape = {
    lifetimeTotalPromptShown?: number;
    lifetimeTotalInstalled?: number;
    lifetimeUniqueInstalls?: number;
    lifetimeTotalAppOpens?: number;
    shortcutClicks?: Record<string, number>;
};

function sumLastNDays(daily: DailyShape[], field: keyof DailyShape, days: number): number {
    const cutoff = dayjs().subtract(days, 'day').startOf('day');
    let total = 0;
    for (const d of daily) {
        if (!d?.date) continue;
        if (dayjs(d.date).isBefore(cutoff)) continue;
        const v = d[field];
        if (typeof v === 'number') total += v;
    }
    return total;
}

function topShortcutLabel(clicks?: Record<string, number>): { key: string; count: number } {
    if (!clicks) return { key: '—', count: 0 };
    let bestKey = '';
    let bestCount = -1;
    for (const [k, v] of Object.entries(clicks)) {
        if (typeof v === 'number' && v > bestCount) {
            bestKey = k;
            bestCount = v;
        }
    }
    if (bestCount <= 0) return { key: '—', count: 0 };
    const label =
        bestKey === 'menu' ? 'View Menu' :
            bestKey === 'call' ? 'Call' :
                bestKey === 'directions' ? 'Directions' :
                    bestKey === 'whatsapp' ? 'WhatsApp' :
                        bestKey;
    return { key: label, count: bestCount };
}

export default function MobileCustomerAppScreen({ onBack }: Props) {
    const { token } = theme.useToken();
    const { storeDetails } = useContext(PlatformGlobalDataContext);

    // ── Settings state ──
    const initial = useMemo(() => resolvePWASettings(storeDetails), [storeDetails]);
    const [enableInstallableApp, setEnableInstallableApp] = useState(initial.enableInstallableApp);
    const [promoteInstallation, setPromoteInstallation] = useState(initial.promoteInstallation);
    const [pwaShortName, setPwaShortName] = useState(initial.pwaShortName);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        setEnableInstallableApp(initial.enableInstallableApp);
        setPromoteInstallation(initial.promoteInstallation);
        setPwaShortName(initial.pwaShortName);
        setDirty(false);
    }, [initial.enableInstallableApp, initial.promoteInstallation, initial.pwaShortName]);

    const markDirty = () => setDirty(true);

    const handleSave = async () => {
        if (!storeDetails?.storeId) return;
        setSaving(true);
        try {
            await updatePWASettings(storeDetails.storeId, {
                enableInstallableApp,
                promoteInstallation,
                pwaShortName: (pwaShortName || '').trim(),
            });
            Toast.show({ content: 'Customer App settings saved', duration: 1500 });
            setDirty(false);
        } catch {
            Toast.show({ content: 'Could not save. Please try again.', duration: 2000 });
        } finally {
            setSaving(false);
        }
    };

    // ── Analytics state (last 30 days window for mobile) ──
    const dateRange = useMemo(() => ({
        startDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
        endDate: dayjs().format('YYYY-MM-DD'),
    }), []);
    const { data, loading: analyticsLoading } = useAnalyticsData(dateRange, 'customerApp');

    const summary = (data?.summary ?? null) as unknown as SummaryShape | null;
    const daily = (data?.daily ?? []) as unknown as DailyShape[];

    const installedCustomers = summary?.lifetimeUniqueInstalls ?? summary?.lifetimeTotalInstalled ?? 0;
    const appOpens30d = sumLastNDays(daily, 'totalAppOpens', 30);
    const installs30d = sumLastNDays(daily, 'totalInstalled', 30);
    const totalPromptShown = summary?.lifetimeTotalPromptShown ?? 0;
    const totalInstalled = summary?.lifetimeTotalInstalled ?? 0;
    const conversionPct = totalPromptShown > 0 ? Math.round((totalInstalled / totalPromptShown) * 100) : 0;
    const top = topShortcutLabel(summary?.shortcutClicks);

    const hasAnyData = installedCustomers > 0 || appOpens30d > 0 || daily.length > 0;

    // ── Global kill-switch guard ──
    if (!FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA) {
        return (
            <Flex style={{ height: '100%' }} vertical>
                <NavBar onBack={onBack}>Customer App</NavBar>
                <Flex align="center" justify="center" style={{ flex: 1, padding: 24 }} vertical>
                    <LuSmartphone color="#9ca3af" size={40} />
                    <Text style={{ marginTop: 12, textAlign: 'center' }}>
                        Customer App is not available yet on the platform.
                    </Text>
                </Flex>
            </Flex>
        );
    }

    return (
        <Flex style={{ height: '100%' }} vertical>
            <NavBar onBack={onBack}>Customer App</NavBar>

            <Flex gap={12} style={{ padding: 16 }} vertical>
                {/* Intro */}
                <Card>
                    <Flex align="center" gap={10} style={{ marginBottom: 8 }}>
                        <LuSmartphone color={token.colorPrimary} size={20} />
                        <Title level={5} style={{ margin: 0 }}>Customer App</Title>
                    </Flex>
                    <Text type="secondary">
                        Let customers install your menu as an app on their phone home screen.
                        One tap to reopen. No app store required.
                    </Text>
                </Card>

                {/* ── Live Analytics ── */}
                <Card>
                    <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>Live Stats</Title>
                    {analyticsLoading && !data ? (
                        <Flex align="center" justify="center" style={{ padding: 24 }}>
                            <DotLoading color="primary" />
                        </Flex>
                    ) : !hasAnyData ? (
                        <Text type="secondary">
                            No installs yet. Numbers appear here once customers start installing your menu app.
                        </Text>
                    ) : (
                        <Flex gap={12} vertical>
                            <StatRow
                                icon={<LuDownload color="#16a34a" size={18} />}
                                label="Installed Customers"
                                value={String(installedCustomers)}
                            />
                            <StatRow
                                icon={<LuEye color="#0ea5e9" size={18} />}
                                label="App Opens (30d)"
                                value={String(appOpens30d)}
                            />
                            <StatRow
                                icon={<LuRocket color="#f97316" size={18} />}
                                label="Installs (30d)"
                                value={String(installs30d)}
                            />
                            <StatRow
                                icon={<LuRocket color={conversionPct >= 20 ? '#3f8600' : conversionPct >= 5 ? '#d48806' : '#cf1322'} size={18} />}
                                label="Install Conversion"
                                value={`${conversionPct}%`}
                            />
                            <StatRow
                                icon={<LuStar color="#eab308" size={18} />}
                                label="Top Shortcut"
                                value={`${top.key}${top.count > 0 ? ` · ${top.count}` : ''}`}
                            />
                        </Flex>
                    )}
                </Card>

                {/* ── Settings ── */}
                <Card>
                    <Title level={5} style={{ marginTop: 0, marginBottom: 4 }}>Settings</Title>

                    <ToggleRow
                        label="Enable Customer App"
                        description="Make your menu installable as an app. Turn off to hide completely."
                        checked={enableInstallableApp}
                        onChange={(v) => { setEnableInstallableApp(v); markDirty(); }}
                    />

                    <ToggleRow
                        label="Show install prompt"
                        description="Invite customers to install after the 3rd visit."
                        checked={promoteInstallation}
                        disabled={!enableInstallableApp}
                        onChange={(v) => { setPromoteInstallation(v); markDirty(); }}
                    />

                    <div
                        style={{
                            marginTop: 12,
                            opacity: enableInstallableApp ? 1 : 0.5,
                            pointerEvents: enableInstallableApp ? 'auto' : 'none',
                        }}
                    >
                        <Text strong>Home screen name</Text>
                        <Text type="secondary" style={{ display: 'block', margin: '4px 0 8px', fontSize: 13 }}>
                            Short label under the icon. Max 12 characters. Blank = first word of your business name.
                        </Text>
                        <Input
                            value={pwaShortName}
                            maxLength={12}
                            placeholder="e.g. Joe's"
                            onChange={(v) => {
                                setPwaShortName(v);
                                markDirty();
                            }}
                        />
                    </div>

                    <Button
                        block
                        color="primary"
                        disabled={!dirty || saving}
                        loading={saving}
                        onClick={handleSave}
                        style={{ marginTop: 16, minHeight: 44 }}
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                </Card>

                {/* How it looks — mobile cheat-sheet */}
                <Card>
                    <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>How it looks to customers</Title>
                    <Text type="secondary">
                        • Android / Chrome: native install popup with your icon and name
                    </Text>
                    <br />
                    <Text type="secondary">
                        • iPhone Safari: step-by-step &ldquo;Add to Home Screen&rdquo; guide
                    </Text>
                    <br />
                    <Text type="secondary">
                        • Once installed, the app opens full-screen from the home screen
                    </Text>
                </Card>
            </Flex>
        </Flex>
    );
}

// ─────────────────────────────────────────────────────────────
// Small presentational helpers (local — not worth promoting yet)
// ─────────────────────────────────────────────────────────────

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <Flex align="center" gap={12} style={{ padding: '8px 0' }}>
            <div style={{ width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {icon}
            </div>
            <Flex style={{ flex: 1 }} vertical>
                <Text type="secondary" style={{ fontSize: 13 }}>{label}</Text>
                <Text strong style={{ fontSize: 17 }}>{value}</Text>
            </Flex>
        </Flex>
    );
}

function ToggleRow({
    label,
    description,
    checked,
    onChange,
    disabled,
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <Flex align="flex-start" gap={12} style={{ padding: '10px 0', opacity: disabled ? 0.5 : 1 }}>
            <Flex style={{ flex: 1 }} vertical>
                <Text strong>{label}</Text>
                <Text type="secondary" style={{ fontSize: 13, marginTop: 2 }}>{description}</Text>
            </Flex>
            <Switch checked={checked} onChange={disabled ? undefined : onChange} />
        </Flex>
    );
}
