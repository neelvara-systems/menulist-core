'use client'

import { isAnswerlatticeFirebaseConfigured } from '@lib/firebase/answerlatticeConfig';
import { setForceDesktopRoute } from '@lib/mobile/forceDesktopMode';
import AnswerlatticeConfigNotice from '@template/platform/AnswerlatticeConfigNotice';
import type { TenantDataType } from '@type/platform/tenant';
import { theme } from 'antd';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import type { ComponentType, Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import { LuExternalLink } from 'react-icons/lu';
import { Button, DotLoading, Flex, Text } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';

export type MobilePlatformInternalScreenKey =
    | 'entityBlocks'
    | 'ownerBusinessAssistantMonitor'
    | 'platformTenants'
    | 'platformStores'
    | 'platformUsers'
    | 'costPosture'
    | 'assetTemplates'
    | 'pricingPlans'
    | 'messagingOnboardingMonitor'
    | 'ownerNotificationMonitor'
    | 'platformNotificationMonitor'
    | 'supportTickets'
    | 'feedbackAdmin'
    | 'knowledgeBase'
    | 'kbGeneration'
    | 'changelog'
    | 'chatManagement'
    | 'chatInsights'
    | 'chatBackfill'
    | 'chatWeeklyDigest'
    | 'chatRoiCalculator'
    | 'answerlatticeIntake'
    | 'answerlatticeWidget';

type MobilePlatformInternalScreenProps = {
    onBack: () => void;
    screen: MobilePlatformInternalScreenKey;
};

type PlatformScreenConfig = {
    Component: ComponentType;
    description: string;
    desktopPath?: string;
    minWidth?: number;
    requiresAnswerlattice?: boolean;
    surface: string;
    title: string;
};

type TenantAdminDashboardProps = {
    tenantsList: TenantDataType[];
    setTenantsList: Dispatch<SetStateAction<TenantDataType[]>>;
};

const RouteLoading = () => (
    <Flex align="center" gap={8} justify="center" style={{ minHeight: 160 }} vertical>
        <DotLoading />
        <Text type="secondary">Loading screen...</Text>
    </Flex>
);

const TenantsDashboard = dynamic<TenantAdminDashboardProps>(() => import('@template/platform/tenants'), { loading: RouteLoading, ssr: false });
const StoresDashboard = dynamic<TenantAdminDashboardProps>(() => import('@template/platform/stores'), { loading: RouteLoading, ssr: false });
const EntityBlockSettings = dynamic(() => import('@template/platform/settings/EntityBlockSettings'), { loading: RouteLoading, ssr: false });
const PlatformUsers = dynamic(() => import('@template/platform/users'), { loading: RouteLoading, ssr: false });
const OwnerBusinessAssistantMonitor = dynamic(() => import('@template/main-app/platform/ownerBusinessAssistantMonitor'), { loading: RouteLoading, ssr: false });
const PlatformCostPosture = dynamic(() => import('@template/main-app/platform/costPosture'), { loading: RouteLoading, ssr: false });
const PlatformAssetTemplates = dynamic(() => import('@template/platform/assetTemplates'), { loading: RouteLoading, ssr: false });
const PricingPlans = dynamic(() => import('@template/platform/pricingPlans'), { loading: RouteLoading, ssr: false });
const MessagingOnboardingMonitor = dynamic(() => import('@template/main-app/platform/messagingOnboardingMonitor'), { loading: RouteLoading, ssr: false });
const OwnerNotificationMonitor = dynamic(() => import('@template/main-app/platform/ownerNotificationMonitor'), { loading: RouteLoading, ssr: false });
const PlatformNotificationMonitor = dynamic(() => import('@template/main-app/platform/platformNotificationMonitor'), { loading: RouteLoading, ssr: false });
const SupportTickets = dynamic(() => import('@template/platform/supportTickets'), { loading: RouteLoading, ssr: false });
const FeedbackAdmin = dynamic(() => import('@template/platform/feedbackAdmin'), { loading: RouteLoading, ssr: false });
const KnowledgeBase = dynamic(() => import('@template/platform/knowledgeBase'), { loading: RouteLoading, ssr: false });
const KBGeneration = dynamic(() => import('@template/platform/KBGeneration'), { loading: RouteLoading, ssr: false });
const Changelog = dynamic(() => import('@template/platform/changelog'), { loading: RouteLoading, ssr: false });
const ChatManagement = dynamic(() => import('@template/platform/chatManagement'), { loading: RouteLoading, ssr: false });
const ChatInsights = dynamic(() => import('@template/platform/chatManagement/ChatInsights'), { loading: RouteLoading, ssr: false });
const ChatBackfill = dynamic(() => import('@template/platform/admin/AnalyticsBackfill'), { loading: RouteLoading, ssr: false });
const ChatWeeklyDigest = dynamic(() => import('@template/platform/chatManagement/WeeklyDigest'), { loading: RouteLoading, ssr: false });
const ChatRoiCalculator = dynamic(() => import('@template/platform/chatManagement/ROICalculator'), { loading: RouteLoading, ssr: false });
const AnswerlatticeIntakeMonitor = dynamic(() => import('@template/main-app/platform/answerlatticeIntakeMonitor'), { loading: RouteLoading, ssr: false });
const AnswerlatticeWidgetManagement = dynamic(() => import('@template/answerlattice/widgetManagement/AnswerlatticeWidgetManagement'), { loading: RouteLoading, ssr: false });

function PlatformTenantsRoute() {
    const [tenantsList, setTenantsList] = useState<TenantDataType[]>([]);
    return <TenantsDashboard tenantsList={tenantsList} setTenantsList={setTenantsList} />;
}

function PlatformStoresRoute() {
    const [tenantsList, setTenantsList] = useState<TenantDataType[]>([]);
    return <StoresDashboard tenantsList={tenantsList} setTenantsList={setTenantsList} />;
}

function AnswerlatticeWidgetRoute() {
    return <AnswerlatticeWidgetManagement embeddedMobile />;
}

const PLATFORM_SCREEN_CONFIG: Record<MobilePlatformInternalScreenKey, PlatformScreenConfig> = {
    entityBlocks: {
        Component: EntityBlockSettings,
        description: 'Block or unblock tenants, stores, and users with audit details.',
        minWidth: 0,
        surface: 'Entity Blocks',
        title: 'Entity Blocks',
    },
    ownerBusinessAssistantMonitor: {
        Component: OwnerBusinessAssistantMonitor,
        desktopPath: '/platform/owner-business-assistant',
        description: 'Review Business Health questions, answers, support gaps, action usage, and cost.',
        minWidth: 680,
        surface: 'Business Health Monitor',
        title: 'Business Health Monitor',
    },
    platformTenants: {
        Component: PlatformTenantsRoute,
        description: 'Manage tenant accounts and tenant-level business records.',
        minWidth: 0,
        surface: 'Tenants',
        title: 'Tenants',
    },
    platformStores: {
        Component: PlatformStoresRoute,
        description: 'Manage stores, outlets, and store-level business records.',
        minWidth: 0,
        surface: 'Stores',
        title: 'Stores',
    },
    platformUsers: {
        Component: PlatformUsers,
        description: 'Manage tenant users, verification, roles, and store access.',
        minWidth: 0,
        surface: 'Users',
        title: 'Users',
    },
    costPosture: {
        Component: PlatformCostPosture,
        desktopPath: '/platform/cost-posture',
        description: 'Review platform cost posture, guardrails, and expensive-operation signals.',
        minWidth: 720,
        surface: 'Cost Posture',
        title: 'Cost Posture',
    },
    assetTemplates: {
        Component: PlatformAssetTemplates,
        desktopPath: '/platform/asset-templates',
        description: 'Manage platform print asset templates and business-category template coverage.',
        minWidth: 0,
        surface: 'Asset Templates',
        title: 'Asset Templates',
    },
    pricingPlans: {
        Component: PricingPlans,
        desktopPath: '/platform/pricing-plans',
        description: 'Manage pricing plans shown to MenuList owners.',
        minWidth: 760,
        surface: 'Pricing Plans',
        title: 'Pricing Plans',
    },
    messagingOnboardingMonitor: {
        Component: MessagingOnboardingMonitor,
        desktopPath: '/ops/messaging-onboarding',
        description: 'Monitor messaging onboarding sessions, preview fixes, and publish readiness.',
        minWidth: 760,
        surface: 'Messaging Onboarding',
        title: 'Messaging Onboarding',
    },
    ownerNotificationMonitor: {
        Component: OwnerNotificationMonitor,
        desktopPath: '/ops/owner-notifications',
        description: 'Review and send owner notification templates and delivery operations.',
        minWidth: 760,
        surface: 'Owner Notifications',
        title: 'Owner Notifications',
    },
    platformNotificationMonitor: {
        Component: PlatformNotificationMonitor,
        desktopPath: '/ops/platform-notifications',
        description: 'Manage platform notification templates and platform-wide delivery operations.',
        minWidth: 760,
        surface: 'Platform Notifications',
        title: 'Platform Notifications',
    },
    supportTickets: {
        Component: SupportTickets,
        desktopPath: '/platform/support-tickets',
        description: 'Platform support queue and ticket operations.',
        minWidth: 720,
        requiresAnswerlattice: true,
        surface: 'Support Tickets',
        title: 'Support Tickets',
    },
    feedbackAdmin: {
        Component: FeedbackAdmin,
        desktopPath: '/platform/feedback-admin',
        description: 'Internal feedback administration tools.',
        minWidth: 640,
        requiresAnswerlattice: true,
        surface: 'Feedback Admin',
        title: 'Feedback Admin',
    },
    knowledgeBase: {
        Component: KnowledgeBase,
        desktopPath: '/platform/knowledge-base',
        description: 'Platform knowledge base editing and publishing.',
        minWidth: 760,
        requiresAnswerlattice: true,
        surface: 'Knowledge Base',
        title: 'Knowledge Base',
    },
    kbGeneration: {
        Component: KBGeneration,
        desktopPath: '/platform/kb-generation',
        description: 'Generate, review, and reconcile knowledge base content.',
        minWidth: 680,
        requiresAnswerlattice: true,
        surface: 'KB Generation',
        title: 'KB Generation',
    },
    changelog: {
        Component: Changelog,
        desktopPath: '/platform/changelog',
        description: 'Create and publish platform release notes.',
        minWidth: 680,
        requiresAnswerlattice: true,
        surface: 'Changelog Management',
        title: 'Changelog',
    },
    chatManagement: {
        Component: ChatManagement,
        desktopPath: '/platform/chat-management',
        description: 'Review and manage customer chat conversations.',
        minWidth: 760,
        requiresAnswerlattice: true,
        surface: 'Chat Management',
        title: 'Chat Management',
    },
    chatInsights: {
        Component: ChatInsights,
        desktopPath: '/platform/chat-insights',
        description: 'Conversation analytics and chat quality signals.',
        minWidth: 680,
        requiresAnswerlattice: true,
        surface: 'Chat Insights',
        title: 'Chat Insights',
    },
    chatBackfill: {
        Component: ChatBackfill,
        desktopPath: '/platform/chat-backfill',
        description: 'Backfill chat analytics and operational data.',
        minWidth: 640,
        requiresAnswerlattice: true,
        surface: 'Chat Backfill',
        title: 'Chat Backfill',
    },
    chatWeeklyDigest: {
        Component: ChatWeeklyDigest,
        desktopPath: '/platform/chat-weekly-digest',
        description: 'Review weekly chat digest output.',
        requiresAnswerlattice: true,
        surface: 'Chat Weekly Digest',
        title: 'Chat Weekly Digest',
    },
    chatRoiCalculator: {
        Component: ChatRoiCalculator,
        desktopPath: '/platform/chat-roi-calculator',
        description: 'Internal ROI calculator for chat operations.',
        requiresAnswerlattice: true,
        surface: 'Chat ROI Calculator',
        title: 'Chat ROI Calculator',
    },
    answerlatticeIntake: {
        Component: AnswerlatticeIntakeMonitor,
        desktopPath: '/platform/answerlattice-intake',
        description: 'Answerlattice intake jobs, support-credit ledger, media extraction, and summary health.',
        minWidth: 760,
        surface: 'Answerlattice Intake',
        title: 'Answerlattice Intake',
    },
    answerlatticeWidget: {
        Component: AnswerlatticeWidgetRoute,
        desktopPath: '/answerlattice/widget',
        description: 'Configure widget keys, install snippets, origins, appearance, and cache strategy.',
        minWidth: 0,
        requiresAnswerlattice: true,
        surface: 'Widget Management',
        title: 'Widget Management',
    },
};

export default function MobilePlatformInternalScreen({ onBack, screen }: MobilePlatformInternalScreenProps) {
    const config = PLATFORM_SCREEN_CONFIG[screen];
    const Component = config.Component;
    const isAnswerlatticeRoute = Boolean(config.requiresAnswerlattice);
    const { token } = theme.useToken();
    const router = useRouter();

    const openDesktopTools = () => {
        if (!config.desktopPath) return;
        setForceDesktopRoute(config.desktopPath);
        router.push(config.desktopPath);
    };

    return (
        <Flex style={{ minHeight: '100%', minWidth: 0 }} vertical>
            <MobileSettingsScreenHeader
                description={config.description}
                onBack={onBack}
                right={config.desktopPath ? (
                    <Button
                        aria-label={`Open ${config.title} desktop tools`}
                        fill="none"
                        onClick={openDesktopTools}
                        style={{ minHeight: 44, minWidth: 44, paddingInline: 0 }}
                    >
                        <LuExternalLink size={18} />
                    </Button>
                ) : undefined}
                title={config.title}
            />
            <div
                data-mobile-answerlattice-admin={isAnswerlatticeRoute ? 'true' : undefined}
                data-mobile-platform-route
                data-mobile-platform-screen={screen}
                style={{
                    maxWidth: '100%',
                    minWidth: 0,
                    overflowX: config.minWidth ? 'auto' : 'hidden',
                    padding: 12,
                    WebkitOverflowScrolling: 'touch',
                }}
            >
                <style jsx global>{`
                    [data-mobile-platform-route] {
                        box-sizing: border-box;
                        width: 100%;
                    }

                    [data-mobile-platform-route] *,
                    [data-mobile-platform-route] *::before,
                    [data-mobile-platform-route] *::after {
                        box-sizing: border-box;
                    }

                    [data-mobile-platform-route] .ant-layout {
                        background: transparent !important;
                        min-height: auto !important;
                    }

                    [data-mobile-platform-route] .ant-layout-content {
                        padding: 0 !important;
                    }

                    [data-mobile-platform-route] .ant-card {
                        border-radius: 8px;
                        max-width: 100%;
                        min-width: 0;
                        overflow: hidden;
                        width: 100%;
                    }

                    [data-mobile-platform-route] .ant-card-body,
                    [data-mobile-platform-route] .ant-card-head {
                        padding-left: 12px;
                        padding-right: 12px;
                    }

                    [data-mobile-platform-route] .ant-card-head-title {
                        min-width: 0;
                        white-space: normal;
                    }

                    [data-mobile-platform-route] .ant-flex,
                    [data-mobile-platform-route] .ant-space {
                        max-width: 100%;
                        min-width: 0;
                    }

                    [data-mobile-platform-route] .ant-space,
                    [data-mobile-platform-route] .ant-row {
                        row-gap: 8px;
                    }

                    [data-mobile-platform-route] .ant-row {
                        margin-left: 0 !important;
                        margin-right: 0 !important;
                    }

                    [data-mobile-platform-route] .ant-col {
                        min-width: 0;
                    }

                    [data-mobile-platform-route] .ant-table-wrapper,
                    [data-mobile-platform-route] .ant-table-content,
                    [data-mobile-platform-route] .ant-descriptions-view,
                    [data-mobile-platform-route] .ant-segmented {
                        max-width: 100%;
                        overflow-x: auto;
                    }

                    [data-mobile-platform-route] .ant-table {
                        min-width: max-content;
                    }

                    [data-mobile-platform-route] .ant-select,
                    [data-mobile-platform-route] .ant-picker,
                    [data-mobile-platform-route] .ant-input,
                    [data-mobile-platform-route] .ant-input-affix-wrapper,
                    [data-mobile-platform-route] .ant-input-number,
                    [data-mobile-platform-route] textarea {
                        max-width: 100%;
                        min-width: 0;
                    }

                    [data-mobile-platform-route] .ant-statistic-title,
                    [data-mobile-platform-route] .ant-typography,
                    [data-mobile-platform-route] p,
                    [data-mobile-platform-route] span,
                    [data-mobile-platform-route] a,
                    [data-mobile-platform-route] button {
                        overflow-wrap: anywhere;
                        white-space: normal;
                    }

                    @media (max-width: 640px) {
                        [data-mobile-platform-route] {
                            padding: 12px 10px !important;
                        }

                        [data-mobile-platform-route] h1,
                        [data-mobile-platform-route] .ant-typography h1 {
                            font-size: 24px;
                            line-height: 1.25;
                        }

                        [data-mobile-platform-route] h2,
                        [data-mobile-platform-route] .ant-typography h2 {
                            font-size: 20px;
                            line-height: 1.3;
                        }

                        [data-mobile-platform-route] h3,
                        [data-mobile-platform-route] .ant-typography h3 {
                            font-size: 18px;
                            line-height: 1.35;
                        }

                        [data-mobile-platform-route] .ant-btn {
                            min-height: 44px;
                            white-space: normal;
                        }

                        [data-mobile-platform-route] .ant-card-body,
                        [data-mobile-platform-route] .ant-card-head {
                            padding-left: 10px;
                            padding-right: 10px;
                        }

                        [data-mobile-answerlattice-admin="true"] .ant-card-body {
                            padding-bottom: 12px;
                            padding-top: 12px;
                        }

                        [data-mobile-platform-route] .ant-space {
                            flex-wrap: wrap;
                        }

                        [data-mobile-platform-route] .ant-flex {
                            max-width: 100%;
                            min-width: 0;
                        }

                        [data-mobile-answerlattice-admin="true"] .ant-row {
                            gap: 12px 0 !important;
                        }

                        [data-mobile-answerlattice-admin="true"] .ant-row > .ant-col {
                            flex: 0 0 100% !important;
                            max-width: 100% !important;
                            padding-left: 0 !important;
                            padding-right: 0 !important;
                        }

                        [data-mobile-answerlattice-admin="true"] .ant-list-item {
                            align-items: flex-start;
                            min-height: 56px;
                            padding: 12px 0 !important;
                        }

                        [data-mobile-answerlattice-admin="true"] .ant-list-item-meta {
                            min-width: 0;
                        }

                        [data-mobile-answerlattice-admin="true"] .ant-list-item-meta-avatar {
                            margin-inline-end: 10px !important;
                        }

                        [data-mobile-answerlattice-admin="true"] .ant-list-item-meta-title > .ant-flex,
                        [data-mobile-answerlattice-admin="true"] .ant-list-item-meta-description > .ant-flex {
                            align-items: flex-start !important;
                            flex-wrap: wrap;
                        }

                        [data-mobile-answerlattice-admin="true"] .ant-segmented {
                            width: 100%;
                        }

                        [data-mobile-answerlattice-admin="true"] .ant-segmented-group {
                            min-width: max-content;
                        }

                        [data-mobile-answerlattice-admin="true"] .ant-form-item {
                            margin-bottom: 14px;
                        }

                        [data-mobile-answerlattice-admin="true"] .ant-form-item-label,
                        [data-mobile-answerlattice-admin="true"] .ant-form-item-control {
                            flex: 0 0 100%;
                            max-width: 100%;
                        }

                        [data-mobile-answerlattice-admin="true"] .ant-descriptions-view {
                            border-radius: 8px;
                        }

                        [data-mobile-answerlattice-admin="true"] .ant-descriptions-row,
                        [data-mobile-answerlattice-admin="true"] .ant-descriptions-item,
                        [data-mobile-answerlattice-admin="true"] .ant-descriptions-item-label,
                        [data-mobile-answerlattice-admin="true"] .ant-descriptions-item-content {
                            display: block;
                            width: 100% !important;
                        }

                        [data-mobile-answerlattice-admin="true"] .ant-statistic-content {
                            font-size: 22px;
                            line-height: 1.2;
                        }

                        [data-mobile-answerlattice-admin="true"] .ant-table-wrapper {
                            border: 1px solid ${token.colorBorderSecondary};
                            border-radius: 8px;
                        }

                        [data-mobile-answerlattice-admin="true"] .ant-table-cell {
                            padding: 10px 12px !important;
                            white-space: normal;
                        }

                        [data-mobile-answerlattice-admin="true"] .ant-table-cell-fix-left,
                        [data-mobile-answerlattice-admin="true"] .ant-table-cell-fix-right {
                            position: static !important;
                        }

                        [data-mobile-answerlattice-admin="true"] .ant-tabs-nav {
                            margin-bottom: 12px;
                            overflow-x: auto;
                        }

                        [data-mobile-answerlattice-admin="true"] .ant-splitter {
                            display: flex !important;
                            flex-direction: column !important;
                            gap: 12px;
                            height: auto !important;
                            min-height: 0 !important;
                            width: 100% !important;
                        }

                        [data-mobile-answerlattice-admin="true"] .ant-splitter-panel {
                            flex: 0 0 auto !important;
                            height: auto !important;
                            max-width: 100% !important;
                            min-height: 160px;
                            min-width: 0 !important;
                            width: 100% !important;
                        }

                        [data-mobile-answerlattice-admin="true"] .ant-splitter-bar {
                            display: none !important;
                        }

                        [data-mobile-answerlattice-admin="true"] .ant-upload-wrapper,
                        [data-mobile-answerlattice-admin="true"] .ant-upload-list,
                        [data-mobile-answerlattice-admin="true"] .ant-upload-list-item {
                            max-width: 100%;
                            min-width: 0;
                        }

                        .ant-drawer-content-wrapper {
                            width: 100vw !important;
                        }

                        .ant-modal {
                            max-width: calc(100vw - 24px);
                        }
                    }
                `}</style>
                <div style={{ minWidth: isAnswerlatticeRoute ? 0 : config.minWidth || 0, width: '100%' }}>
                    {config.requiresAnswerlattice && !isAnswerlatticeFirebaseConfigured ? (
                        <AnswerlatticeConfigNotice surface={config.surface} />
                    ) : (
                        <Component />
                    )}
                </div>
            </div>
        </Flex>
    );
}
