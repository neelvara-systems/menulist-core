'use client';

/**
 * Menu Presence Monitor — Mobile Component (v2)
 *
 * Guided deployment checklist for MobileShareScreen.
 * Groups: Online Discovery (manual) + Inside Your Store (auto-detected).
 * Timestamp-only schema: exists = confirmed, missing = not confirmed.
 * Max 6 surfaces forever — do NOT expand.
 *
 * @see __docs__/menu-presence-monitor/menu-presence-monitor_impl.md
 */

import { FEATURE_FLAGS } from '@config/features';
import { type MenuPresenceSurface, updateMenuPresence } from '@database/stores';
import { StoreDataType } from '@type/platform/store';
import { Button, Card, Toast } from 'antd-mobile';
import { useState } from 'react';
import { FaInstagram } from 'react-icons/fa6';
import {
    LuAlertTriangle,
    LuCheck,
    LuClipboard,
    LuExternalLink,
    LuGlobe,
    LuMessageCircle,
    LuMonitor,
    LuQrCode,
} from 'react-icons/lu';

type ManualSurfaceId = 'googleBusiness' | 'instagramBio' | 'whatsappProfile';

interface MobilePresenceMonitorProps {
    hasPublishedMenu: boolean;
    hasScreen: boolean;
    hasFeedbackEnabled: boolean;
    storeDetails: StoreDataType;
    menuLink: string;
}

interface ManualSurfaceConfig {
    id: ManualSurfaceId;
    dalKey: MenuPresenceSurface;
    label: string;
    explanation: string;
    icon: React.ReactNode;
    guideSteps: string[];
    openUrl?: string;
}

const MANUAL_SURFACES: ManualSurfaceConfig[] = [
    {
        id: 'googleBusiness',
        dalKey: 'googleBusiness',
        label: 'Google Business',
        explanation: 'Customers searching on Google can see your menu',
        icon: <LuGlobe size={16} />,
        guideSteps: ['Open Google Business profile', 'Click "Edit profile"', 'Paste menu link in Website field'],
        openUrl: 'https://business.google.com',
    },
    {
        id: 'instagramBio',
        dalKey: 'instagramBio',
        label: 'Instagram Bio',
        explanation: 'Add menu link to your bio for followers',
        icon: <FaInstagram size={16} />,
        guideSteps: ['Open Instagram → your profile', 'Tap "Edit Profile"', 'Paste menu link in Website field'],
        openUrl: 'https://instagram.com',
    },
    {
        id: 'whatsappProfile',
        dalKey: 'whatsappProfile',
        label: 'WhatsApp Profile',
        explanation: 'Customers messaging you can open your menu',
        icon: <LuMessageCircle size={16} />,
        guideSteps: ['Open WhatsApp Business → Settings', 'Tap "Business Profile"', 'Paste menu link in description'],
    },
];

export default function MobilePresenceMonitor({
    hasPublishedMenu,
    hasScreen,
    hasFeedbackEnabled,
    storeDetails,
    menuLink,
}: MobilePresenceMonitorProps) {
    const [updating, setUpdating] = useState<string | null>(null);
    const [localPresence, setLocalPresence] = useState<Record<string, string | undefined>>(
        storeDetails.menuPresence || {}
    );
    const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

    if (!FEATURE_FLAGS.ENABLE_MENU_PRESENCE_MONITOR) return null;

    const isActive = (id: string) => !!localPresence[id];

    const autoSurfaces = [
        { id: 'tableQr', label: 'Table QR', active: hasPublishedMenu, desc: hasPublishedMenu ? 'QR ready to print' : 'Publish menu first', icon: <LuQrCode size={16} /> },
        { id: 'digitalScreens', label: 'Screens', active: hasScreen, desc: hasScreen ? 'Screen connected' : 'Not set up', icon: <LuMonitor size={16} /> },
        { id: 'feedbackQr', label: 'Feedback', active: hasFeedbackEnabled, desc: hasFeedbackEnabled ? 'Feedback available' : 'Not enabled', icon: <LuMessageCircle size={16} /> },
    ];

    const manualActiveCount = MANUAL_SURFACES.filter(s => isActive(s.id)).length;
    const autoActiveCount = autoSurfaces.filter(s => s.active).length;
    const totalActive = manualActiveCount + autoActiveCount;
    const totalSurfaces = MANUAL_SURFACES.length + autoSurfaces.length;
    const allDone = totalActive === totalSurfaces;
    const nextSurface = MANUAL_SURFACES.find(s => !isActive(s.id));

    const handleCopyAndExpand = async (surface: ManualSurfaceConfig) => {
        try {
            await navigator.clipboard.writeText(menuLink);
            Toast.show({ content: 'Menu link copied', duration: 1000 });
        } catch {
            Toast.show({ content: 'Could not copy', duration: 1000 });
        }
        setExpandedGuide(surface.id);
    };

    const handleConfirm = async (surface: ManualSurfaceConfig) => {
        setUpdating(surface.id);
        try {
            await updateMenuPresence(storeDetails.storeId, surface.dalKey, true);
            setLocalPresence(prev => ({ ...prev, [surface.id]: new Date().toISOString() }));
            Toast.show({ content: `${surface.label} — menu link added`, duration: 1500 });
            setExpandedGuide(null);
        } catch {
            Toast.show({ content: 'Failed to update', duration: 1500 });
        } finally {
            setUpdating(null);
        }
    };

    const handleRemove = async (surface: ManualSurfaceConfig) => {
        setUpdating(surface.id);
        try {
            await updateMenuPresence(storeDetails.storeId, surface.dalKey, false);
            setLocalPresence(prev => {
                const next = { ...prev };
                delete next[surface.id];
                return next;
            });
        } catch {
            Toast.show({ content: 'Failed to update', duration: 1500 });
        } finally {
            setUpdating(null);
        }
    };

    return (
        <Card className="rounded-xl">
            <div className="flex flex-col gap-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">
                            Make your menu easy to find
                        </p>
                        <p className="text-[11px] text-gray-400">
                            Add your menu to the places customers look
                        </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${allDone
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                        }`}>
                        {allDone ? 'All set' : `${totalActive} place${totalActive !== 1 ? 's' : ''}`}
                    </span>
                </div>

                {/* ── Online Discovery ──────────────────────── */}
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-1">
                    Online discovery
                </p>

                {MANUAL_SURFACES.map(s => {
                    const active = isActive(s.id);
                    const isNext = !active && s.id === nextSurface?.id;
                    const guideOpen = expandedGuide === s.id;

                    return (
                        <div key={s.id}>
                            <div className="flex items-center gap-3 py-1.5">
                                <span className="shrink-0">
                                    {active
                                        ? <LuCheck size={16} className="text-green-500" />
                                        : <LuAlertTriangle size={16} className="text-amber-400" />
                                    }
                                </span>
                                <span className="shrink-0 text-gray-400">{s.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-sm text-gray-700 dark:text-gray-200">{s.label}</p>
                                        {isNext && manualActiveCount === 0 && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-500">Start here</span>
                                        )}
                                        {isNext && manualActiveCount > 0 && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-500">Next</span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-gray-400">
                                        {active ? 'Menu link added' : s.explanation}
                                    </p>
                                </div>
                                {!active && (
                                    <Button
                                        size="mini"
                                        color={isNext ? 'primary' : 'default'}
                                        fill={isNext ? 'solid' : 'outline'}
                                        loading={updating === s.id}
                                        onClick={() => handleCopyAndExpand(s)}
                                        style={{ fontSize: 11, minHeight: 28 }}
                                    >
                                        <LuClipboard size={10} className="inline mr-1" />
                                        Add
                                    </Button>
                                )}
                                {active && (
                                    <Button
                                        size="mini" fill="none"
                                        loading={updating === s.id}
                                        onClick={() => handleRemove(s)}
                                        style={{ fontSize: 11, color: '#999', minHeight: 28 }}
                                    >
                                        Remove
                                    </Button>
                                )}
                            </div>

                            {/* Inline micro-guide */}
                            {guideOpen && !active && (
                                <div className="ml-10 mt-1 mb-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                    <p className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-2">How to add:</p>
                                    <ol className="text-xs text-gray-500 pl-4 space-y-1 list-decimal">
                                        {s.guideSteps.map((step, i) => (
                                            <li key={i}>{step}</li>
                                        ))}
                                    </ol>
                                    <div className="flex gap-2 mt-3">
                                        {s.openUrl && (
                                            <Button
                                                size="mini" fill="outline"
                                                onClick={() => { window.open(s.openUrl, '_blank'); }}
                                                style={{ fontSize: 11, minHeight: 28 }}
                                            >
                                                <LuExternalLink size={10} className="inline mr-1" />
                                                Open
                                            </Button>
                                        )}
                                        <Button
                                            size="mini" color="primary" fill="solid"
                                            loading={updating === s.id}
                                            onClick={() => handleConfirm(s)}
                                            style={{ fontSize: 11, minHeight: 28 }}
                                        >
                                            Mark as Added
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* ── Inside Your Store ─────────────────────── */}
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-2">
                    Inside your store
                </p>

                {autoSurfaces.map(s => (
                    <div key={s.id} className="flex items-center gap-3 py-1">
                        <span className="shrink-0">
                            {s.active
                                ? <LuCheck size={16} className="text-green-500" />
                                : <LuAlertTriangle size={16} className="text-amber-400" />
                            }
                        </span>
                        <span className="shrink-0 text-gray-400">{s.icon}</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 dark:text-gray-200">{s.label}</p>
                            <p className="text-[11px] text-gray-400">{s.desc}</p>
                        </div>
                        {s.active && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-500">Auto</span>
                        )}
                    </div>
                ))}

                {/* Completion */}
                {allDone && (
                    <div className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2 mt-1">
                        <LuCheck size={14} className="text-green-500 shrink-0" />
                        <p className="text-xs text-green-600">
                            Your menu is easy to find everywhere customers look
                        </p>
                    </div>
                )}
            </div>
        </Card>
    );
}
