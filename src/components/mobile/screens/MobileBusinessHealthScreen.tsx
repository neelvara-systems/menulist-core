'use client'

import { FEATURE_FLAGS } from '@config/features';
import { useOwnerBusinessAssistantAction } from '@hook/ownerBusinessAssistant/useOwnerBusinessAssistantAction';
import { useOwnerBusinessAssistantAnswer } from '@hook/ownerBusinessAssistant/useOwnerBusinessAssistantAnswer';
import { useOwnerBusinessAssistantThread } from '@hook/ownerBusinessAssistant/useOwnerBusinessAssistantThread';
import { useOwnerBusinessHealthCurrent } from '@hook/ownerBusinessAssistant/useOwnerBusinessHealthCurrent';
import type { OwnerBusinessAssistantActionOption, OwnerBusinessHealthQuestion } from '@lib/ownerBusinessAssistant/types';
import { theme } from 'antd';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LuActivity, LuCheckCircle2, LuExternalLink, LuSend } from 'react-icons/lu';
import { Button, Card, Flex, Input, Tag, Text, Title, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';
import { useMobileProjects } from '../providers/MobileProjectsProvider';
import MobileBusinessHealthActionSheet from '../sheets/MobileBusinessHealthActionSheet';

interface MobileBusinessHealthScreenProps {
    onBack: () => void;
}

export default function MobileBusinessHealthScreen({ onBack }: MobileBusinessHealthScreenProps) {
    const { token } = theme.useToken();
    const router = useRouter();
    const { selectedProjectId } = useMobileProjects();
    const { current, isLoading, refresh } = useOwnerBusinessHealthCurrent(selectedProjectId || undefined);
    const { answer, ask, threadId, isLoading: isAnswering } = useOwnerBusinessAssistantAnswer(selectedProjectId || undefined, {
        currentRoute: '/business-health',
        mobileTab: 'more',
        selectedProjectId: selectedProjectId || undefined,
    });
    const { messages, refresh: refreshThread } = useOwnerBusinessAssistantThread(threadId);
    const { runAction, isLoading: isActioning } = useOwnerBusinessAssistantAction(selectedProjectId || undefined);
    const [question, setQuestion] = useState('');
    const [actionSheetOpen, setActionSheetOpen] = useState(false);

    const handleAsk = async (value: string, suggestedQuestionId?: string) => {
        const normalized = value.trim();
        if (!normalized) return;
        try {
            await ask(normalized, suggestedQuestionId);
            if (threadId) void refreshThread();
            setQuestion('');
        } catch (error) {
            Toast.show({ content: error instanceof Error ? error.message : 'Business Health could not answer that', duration: 2200 });
        }
    };

    const handleSuggested = (suggested: OwnerBusinessHealthQuestion) => {
        void handleAsk(suggested.question, suggested.id);
    };

    const handleAction = async (action: OwnerBusinessAssistantActionOption) => {
        try {
            const result = await runAction({
                operation: action.riskLevel === 'navigate' ? 'navigate' : 'prepare',
                actionType: action.actionType,
                targetKind: action.targetKind,
                targetId: action.targetId,
                payload: { source: 'mobile_business_health' },
            });
            setActionSheetOpen(false);
            Toast.show({ content: result.message, duration: 1600 });
            if (result.href) router.push(result.href);
        } catch (error) {
            Toast.show({ content: error instanceof Error ? error.message : 'Action could not be completed', duration: 2200 });
        }
    };

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description="Daily business status, checks, and owner questions."
                onBack={onBack}
                title="Business Health"
            />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <Card>
                    <Flex gap={12} vertical>
                        <Flex align="center" gap={12}>
                            <Flex
                                align="center"
                                justify="center"
                                style={{
                                    background: token.colorSuccessBg,
                                    borderRadius: 8,
                                    color: token.colorSuccess,
                                    height: 40,
                                    width: 40,
                                }}
                            >
                                <LuActivity size={22} />
                            </Flex>
                            <Flex flex={1} style={{ minWidth: 0 }} vertical>
                                <Title level={4} style={{ margin: 0 }}>{current?.summary.headline || 'Latest check'}</Title>
                                <Text type="secondary">{current?.sourceRefs?.[0]?.freshnessLabel || current?.localDate || 'Loading'}</Text>
                            </Flex>
                        </Flex>
                        <Text>{current?.summary.ownerMessage || (isLoading ? 'Loading Business Health...' : 'Business Health is not ready yet.')}</Text>
                        {current?.summary.noActionNeeded ? (
                            <Tag color="success"><LuCheckCircle2 size={14} /> No action needed</Tag>
                        ) : null}
                        <Button block fill="outline" onClick={() => void refresh()}>
                            Refresh
                        </Button>
                    </Flex>
                </Card>

                {current?.analyticsTeaser ? (
                    <Card title="Today">
                        <Flex gap={8} vertical>
                            {current.analyticsTeaser.today ? <Metric label={current.analyticsTeaser.today.label} value={current.analyticsTeaser.today.value} /> : null}
                            {current.analyticsTeaser.thisWeek ? <Metric label={current.analyticsTeaser.thisWeek.label} value={current.analyticsTeaser.thisWeek.value} /> : null}
                            {current.analyticsTeaser.topItem ? <Metric label={current.analyticsTeaser.topItem.label} value={current.analyticsTeaser.topItem.value} /> : null}
                        </Flex>
                    </Card>
                ) : null}

                {current?.suggestedChecks?.length ? (
                    <Card title="Checks">
                        <Flex gap={8} vertical>
                            {current.suggestedChecks.slice(0, 4).map((check) => (
                                <Flex
                                    gap={8}
                                    key={check.id}
                                    style={{
                                        border: `1px solid ${token.colorBorder}`,
                                        borderRadius: 8,
                                        padding: 12,
                                    }}
                                    vertical
                                >
                                    <Flex align="center" justify="space-between">
                                        <Text strong>{check.title}</Text>
                                        <Tag color={check.priority === 'high' ? 'error' : check.priority === 'medium' ? 'warning' : 'default'}>{check.priority}</Tag>
                                    </Flex>
                                    <Text>{check.message}</Text>
                                </Flex>
                            ))}
                        </Flex>
                    </Card>
                ) : null}

                <Card title="Ask">
                    <Flex gap={10} vertical>
                        {FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_SUGGESTED_QUESTIONS ? current?.suggestedQuestions?.slice(0, 5).map((suggested) => (
                            <Button
                                block
                                fill="outline"
                                key={suggested.id}
                                loading={isAnswering}
                                onClick={() => handleSuggested(suggested)}
                            >
                                {suggested.label}
                            </Button>
                        )) : null}
                        <Flex gap={8}>
                            <Input
                                disabled={!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_FREE_TEXT}
                                onChange={setQuestion}
                                placeholder="Ask about today or this week"
                                value={question}
                            />
                            <Button
                                disabled={!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_FREE_TEXT}
                                icon={<LuSend />}
                                loading={isAnswering}
                                onClick={() => void handleAsk(question)}
                            />
                        </Flex>
                        {messages.length ? (
                            <Flex gap={8} vertical>
                                {messages.slice(-8).map((message: any, index: number) => (
                                    <Flex
                                        gap={4}
                                        key={message.id || `${message.role || 'message'}-${index}`}
                                        style={{
                                            alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                                            background: message.role === 'user' ? token.colorPrimaryBg : token.colorFillQuaternary,
                                            border: `1px solid ${message.role === 'user' ? token.colorPrimaryBorder : token.colorBorder}`,
                                            borderRadius: 8,
                                            maxWidth: '92%',
                                            padding: 10,
                                        }}
                                        vertical
                                    >
                                        <Text type="secondary">{message.role === 'user' ? 'You' : 'Business Health'}</Text>
                                        <Text>{message.content}</Text>
                                    </Flex>
                                ))}
                            </Flex>
                        ) : answer ? (
                            <Flex
                                gap={8}
                                style={{
                                    background: token.colorFillQuaternary,
                                    border: `1px solid ${token.colorBorder}`,
                                    borderRadius: 8,
                                    padding: 12,
                                }}
                                vertical
                            >
                                <Text>{answer.text}</Text>
                                <Text type="secondary">{answer.freshnessLabel}</Text>
                                {FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_ACTION_SUPPORT && answer.actions?.length ? (
                                    <Button
                                        block
                                        fill="outline"
                                        icon={<LuExternalLink />}
                                        loading={isActioning}
                                        onClick={() => setActionSheetOpen(true)}
                                    >
                                        Open action
                                    </Button>
                                ) : null}
                            </Flex>
                        ) : null}
                    </Flex>
                </Card>
            </Flex>
            <MobileBusinessHealthActionSheet
                actions={answer?.actions}
                onClose={() => setActionSheetOpen(false)}
                onSelect={(action) => void handleAction(action)}
                open={actionSheetOpen}
            />
        </Flex>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <Flex align="center" justify="space-between">
            <Text type="secondary">{label}</Text>
            <Text strong>{value}</Text>
        </Flex>
    );
}
