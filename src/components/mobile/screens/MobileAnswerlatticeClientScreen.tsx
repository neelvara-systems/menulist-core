'use client'

import { isAnswerlatticeFirebaseConfigured } from '@lib/firebase/answerlatticeFirebaseClient';
import AnswerlatticeConfigNotice from '@template/platform/AnswerlatticeConfigNotice';
import { theme } from 'antd';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { LuBookOpen, LuHelpCircle, LuReceipt, LuTicket } from 'react-icons/lu';
import { Card, DotLoading, Flex, List, Text } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';

export type MobileAnswerlatticeClientView = 'help' | 'docs' | 'support' | 'releaseNotes';

type MobileAnswerlatticeClientScreenProps = {
    initialView?: MobileAnswerlatticeClientView;
    onBack: () => void;
};

const RouteLoading = () => (
    <Flex align="center" gap={8} justify="center" style={{ minHeight: 160 }} vertical>
        <DotLoading />
        <Text type="secondary">Loading support screen...</Text>
    </Flex>
);

const KnowledgeBaseExplorer = dynamic(() => import('@organisms/KnowledgeBaseExplorer'), { loading: RouteLoading, ssr: false });
const TicketView = dynamic(() => import('@template/main-app/helpCenter/TicketView'), { loading: RouteLoading, ssr: false });
const ChangelogView = dynamic(() => import('@template/main-app/helpCenter/ChangelogView'), { loading: RouteLoading, ssr: false });

const viewMeta: Record<MobileAnswerlatticeClientView, { description: string; surface: string; title: string }> = {
    help: {
        description: 'Support, documentation, support tickets, and release notes.',
        surface: 'Answerlattice Help',
        title: 'Help Center',
    },
    docs: {
        description: 'Browse help articles and guides.',
        surface: 'Answerlattice Documentation',
        title: 'Documentation',
    },
    support: {
        description: 'Create or track support requests.',
        surface: 'Answerlattice Support',
        title: 'Support Tickets',
    },
    releaseNotes: {
        description: 'See recent fixes and product updates.',
        surface: 'Answerlattice Release Notes',
        title: 'Release Notes',
    },
};

export default function MobileAnswerlatticeClientScreen({ initialView = 'help', onBack }: MobileAnswerlatticeClientScreenProps) {
    const { token } = theme.useToken();
    const [view, setView] = useState<MobileAnswerlatticeClientView>(initialView);
    const [history, setHistory] = useState<MobileAnswerlatticeClientView[]>([]);
    const meta = viewMeta[view];

    useEffect(() => {
        setView(initialView);
        setHistory([]);
    }, [initialView]);

    const openView = (nextView: MobileAnswerlatticeClientView) => {
        if (nextView === view) return;
        setHistory((current) => [...current, view]);
        setView(nextView);
    };

    const handleBack = () => {
        const previousView = history[history.length - 1];
        if (previousView) {
            setHistory((current) => current.slice(0, -1));
            setView(previousView);
            return;
        }
        onBack();
    };

    const content = useMemo(() => {
        if (view === 'help') {
            return (
                <Flex gap={12} style={{ padding: 16 }} vertical>
                    <Card title="Answerlattice">
                        <List>
                            <List.Item
                                arrow
                                description={<Text type="secondary">Browse help articles and guides.</Text>}
                                onClick={() => openView('docs')}
                                prefix={<LuBookOpen color={token.colorPrimary} size={20} />}
                                title={<Text strong>Documentation</Text>}
                            />
                            <List.Item
                                arrow
                                description={<Text type="secondary">Create or track a support request.</Text>}
                                onClick={() => openView('support')}
                                prefix={<LuTicket color={token.colorWarning} size={20} />}
                                title={<Text strong>Support Tickets</Text>}
                            />
                            <List.Item
                                arrow
                                description={<Text type="secondary">See recent product changes and fixes.</Text>}
                                onClick={() => openView('releaseNotes')}
                                prefix={<LuReceipt color={token.colorInfo} size={20} />}
                                title={<Text strong>Release Notes</Text>}
                            />
                        </List>
                    </Card>
                </Flex>
            );
        }

        return (
            <div
                data-mobile-answerlattice-route
                style={{
                    maxWidth: '100%',
                    minWidth: 0,
                    overflowX: 'auto',
                    padding: '12px 12px calc(12px + env(safe-area-inset-bottom))',
                    scrollPaddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
                    WebkitOverflowScrolling: 'touch',
                }}
            >
                <style jsx global>{`
                    [data-mobile-answerlattice-route] .ant-layout {
                        background: transparent !important;
                        min-height: auto !important;
                    }

                    [data-mobile-answerlattice-route] .ant-card {
                        border-radius: 8px;
                        max-width: 100% !important;
                        min-width: 0 !important;
                        width: 100%;
                    }

                    [data-mobile-answerlattice-route] .ant-card-body,
                    [data-mobile-answerlattice-route] .ant-card-head {
                        padding-left: 12px;
                        padding-right: 12px;
                        min-width: 0;
                    }

                    [data-mobile-answerlattice-route] .ant-row {
                        row-gap: 8px;
                    }

                    [data-mobile-answerlattice-route] .ant-flex,
                    [data-mobile-answerlattice-route] .ant-space {
                        min-width: 0;
                        max-width: 100%;
                    }

                    [data-mobile-answerlattice-route] .ant-space {
                        flex-wrap: wrap;
                    }

                    [data-mobile-answerlattice-route] .ant-table-wrapper,
                    [data-mobile-answerlattice-route] .ant-table-content,
                    [data-mobile-answerlattice-route] .ant-segmented {
                        max-width: 100%;
                        overflow-x: auto;
                    }

                    [data-mobile-answerlattice-route] .ant-form .ant-flex {
                        align-items: stretch !important;
                    }

                    [data-mobile-answerlattice-route] .ant-form-item {
                        margin-bottom: 14px;
                    }

                    [data-mobile-answerlattice-route] .ant-upload-wrapper,
                    [data-mobile-answerlattice-route] .ant-upload-list,
                    [data-mobile-answerlattice-route] .ant-upload-list-item {
                        max-width: 100%;
                        min-width: 0;
                    }

                    [data-mobile-answerlattice-route] .ant-btn {
                        min-height: 44px;
                    }

                    [data-mobile-answerlattice-route] .ant-btn-sm {
                        min-height: 44px;
                    }

                    [data-mobile-answerlattice-route] h1,
                    [data-mobile-answerlattice-route] .ant-typography h1 {
                        font-size: 24px;
                        line-height: 1.25;
                    }

                    [data-mobile-answerlattice-route] h2,
                    [data-mobile-answerlattice-route] .ant-typography h2 {
                        font-size: 20px;
                        line-height: 1.3;
                    }

                    [data-mobile-answerlattice-route] h3,
                    [data-mobile-answerlattice-route] .ant-typography h3 {
                        font-size: 18px;
                        line-height: 1.35;
                    }

                    [data-mobile-answerlattice-route] .ant-typography {
                        white-space: normal;
                    }
                `}</style>
                {!isAnswerlatticeFirebaseConfigured ? (
                    <AnswerlatticeConfigNotice surface={meta.surface} />
                ) : view === 'docs' ? (
                    <KnowledgeBaseExplorer />
                ) : view === 'support' ? (
                    <TicketView />
                ) : (
                    <ChangelogView />
                )}
            </div>
        );
    }, [meta.surface, token.colorInfo, token.colorPrimary, token.colorWarning, view, history]);

    return (
        <Flex style={{ minHeight: '100%', minWidth: 0 }} vertical>
            <MobileSettingsScreenHeader
                description={meta.description}
                infoContent={(
                    <Flex gap={4} style={{ maxWidth: 240 }} vertical>
                        <Text strong>{meta.title}</Text>
                        <Text type="secondary">{meta.description}</Text>
                        <Text type="secondary">Use the back arrow to return to the app.</Text>
                    </Flex>
                )}
                onBack={handleBack}
                right={view === 'help' ? <LuHelpCircle color={token.colorInfo} size={18} /> : null}
                title={meta.title}
            />
            {content}
        </Flex>
    );
}
