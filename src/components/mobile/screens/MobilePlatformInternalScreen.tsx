'use client'

import { isCanonicaFirebaseConfigured } from '@lib/firebase/canonicaFirebaseClient';
import CanonicaConfigNotice from '@template/platform/CanonicaConfigNotice';
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import { DotLoading, Flex, Text } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';

export type MobilePlatformInternalScreenKey =
    | 'platformSettings'
    | 'entityBlocks'
    | 'platformUsers'
    | 'supportTickets'
    | 'feedbackAdmin'
    | 'knowledgeBase'
    | 'kbGeneration'
    | 'changelog'
    | 'chatManagement'
    | 'chatInsights'
    | 'chatBackfill'
    | 'chatWeeklyDigest'
    | 'chatRoiCalculator';

type MobilePlatformInternalScreenProps = {
    onBack: () => void;
    screen: MobilePlatformInternalScreenKey;
};

type PlatformScreenConfig = {
    Component: ComponentType;
    description: string;
    minWidth?: number;
    requiresCanonica?: boolean;
    surface: string;
    title: string;
};

const RouteLoading = () => (
    <Flex align="center" gap={8} justify="center" style={{ minHeight: 160 }} vertical>
        <DotLoading />
        <Text type="secondary">Loading screen...</Text>
    </Flex>
);

const PlatformSettings = dynamic(() => import('@template/platform/settings'), { loading: RouteLoading, ssr: false });
const EntityBlockSettings = dynamic(() => import('@template/platform/settings/EntityBlockSettings'), { loading: RouteLoading, ssr: false });
const PlatformUsers = dynamic(() => import('@template/platform/users'), { loading: RouteLoading, ssr: false });
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

const PLATFORM_SCREEN_CONFIG: Record<MobilePlatformInternalScreenKey, PlatformScreenConfig> = {
    platformSettings: {
        Component: PlatformSettings,
        description: 'Logs, tenants, stores, pricing plans, and platform settings.',
        minWidth: 640,
        surface: 'Platform Settings',
        title: 'Platform Settings',
    },
    entityBlocks: {
        Component: EntityBlockSettings,
        description: 'Block or unblock tenants, stores, and users with audit details.',
        minWidth: 560,
        surface: 'Entity Blocks',
        title: 'Entity Blocks',
    },
    platformUsers: {
        Component: PlatformUsers,
        description: 'Manage platform-level users and access.',
        minWidth: 640,
        surface: 'Platform Users',
        title: 'Platform Users',
    },
    supportTickets: {
        Component: SupportTickets,
        description: 'Platform support queue and ticket operations.',
        minWidth: 720,
        requiresCanonica: true,
        surface: 'Support Tickets',
        title: 'Support Tickets',
    },
    feedbackAdmin: {
        Component: FeedbackAdmin,
        description: 'Internal feedback administration tools.',
        minWidth: 640,
        requiresCanonica: true,
        surface: 'Feedback Admin',
        title: 'Feedback Admin',
    },
    knowledgeBase: {
        Component: KnowledgeBase,
        description: 'Platform knowledge base editing and publishing.',
        minWidth: 760,
        requiresCanonica: true,
        surface: 'Knowledge Base',
        title: 'Knowledge Base',
    },
    kbGeneration: {
        Component: KBGeneration,
        description: 'Generate, review, and reconcile knowledge base content.',
        minWidth: 680,
        requiresCanonica: true,
        surface: 'KB Generation',
        title: 'KB Generation',
    },
    changelog: {
        Component: Changelog,
        description: 'Create and publish platform release notes.',
        minWidth: 680,
        requiresCanonica: true,
        surface: 'Changelog Management',
        title: 'Changelog',
    },
    chatManagement: {
        Component: ChatManagement,
        description: 'Review and manage customer chat conversations.',
        minWidth: 760,
        requiresCanonica: true,
        surface: 'Chat Management',
        title: 'Chat Management',
    },
    chatInsights: {
        Component: ChatInsights,
        description: 'Conversation analytics and chat quality signals.',
        minWidth: 680,
        requiresCanonica: true,
        surface: 'Chat Insights',
        title: 'Chat Insights',
    },
    chatBackfill: {
        Component: ChatBackfill,
        description: 'Backfill chat analytics and operational data.',
        minWidth: 640,
        requiresCanonica: true,
        surface: 'Chat Backfill',
        title: 'Chat Backfill',
    },
    chatWeeklyDigest: {
        Component: ChatWeeklyDigest,
        description: 'Review weekly chat digest output.',
        requiresCanonica: true,
        surface: 'Chat Weekly Digest',
        title: 'Chat Weekly Digest',
    },
    chatRoiCalculator: {
        Component: ChatRoiCalculator,
        description: 'Internal ROI calculator for chat operations.',
        requiresCanonica: true,
        surface: 'Chat ROI Calculator',
        title: 'Chat ROI Calculator',
    },
};

export default function MobilePlatformInternalScreen({ onBack, screen }: MobilePlatformInternalScreenProps) {
    const config = PLATFORM_SCREEN_CONFIG[screen];
    const Component = config.Component;

    return (
        <Flex style={{ minHeight: '100%', minWidth: 0 }} vertical>
            <MobileSettingsScreenHeader
                description={config.description}
                onBack={onBack}
                title={config.title}
            />
            <div
                data-mobile-platform-route
                style={{
                    maxWidth: '100%',
                    minWidth: 0,
                    overflowX: 'auto',
                    padding: 12,
                    WebkitOverflowScrolling: 'touch',
                }}
            >
                <style jsx global>{`
                    [data-mobile-platform-route] .ant-layout {
                        background: transparent !important;
                        min-height: auto !important;
                    }

                    [data-mobile-platform-route] .ant-layout-content {
                        padding: 0 !important;
                    }

                    [data-mobile-platform-route] .ant-card {
                        border-radius: 8px;
                    }

                    [data-mobile-platform-route] .ant-card-body,
                    [data-mobile-platform-route] .ant-card-head {
                        padding-left: 12px;
                        padding-right: 12px;
                    }

                    [data-mobile-platform-route] .ant-space {
                        max-width: 100%;
                    }

                    [data-mobile-platform-route] .ant-space,
                    [data-mobile-platform-route] .ant-row {
                        row-gap: 8px;
                    }

                    [data-mobile-platform-route] .ant-table-wrapper,
                    [data-mobile-platform-route] .ant-table-content,
                    [data-mobile-platform-route] .ant-descriptions-view,
                    [data-mobile-platform-route] .ant-segmented {
                        max-width: 100%;
                        overflow-x: auto;
                    }

                    [data-mobile-platform-route] .ant-statistic-title,
                    [data-mobile-platform-route] .ant-typography {
                        white-space: normal;
                    }

                    @media (max-width: 640px) {
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

                        [data-mobile-platform-route] .ant-btn {
                            min-height: 40px;
                        }

                        [data-mobile-platform-route] .ant-space {
                            flex-wrap: wrap;
                        }
                    }
                `}</style>
                <div style={{ minWidth: config.minWidth || 0, width: '100%' }}>
                    {config.requiresCanonica && !isCanonicaFirebaseConfigured ? (
                        <CanonicaConfigNotice surface={config.surface} />
                    ) : (
                        <Component />
                    )}
                </div>
            </div>
        </Flex>
    );
}
