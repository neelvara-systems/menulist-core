'use client'

import { copyTodayGrowthPackText, TodayReadyActionKind, TodayWeeklyGrowthPack } from '@lib/today/weeklyGrowthPack';
import { theme } from 'antd';
import { LuAlertTriangle, LuCopy, LuMegaphone, LuShieldCheck } from 'react-icons/lu';
import { Button, Card, Flex, Tag, Text, Toast } from '../antd';

interface TodayWeeklyGrowthPackCardProps {
    pack: TodayWeeklyGrowthPack;
}

const actionKindLabel: Record<TodayReadyActionKind, string> = {
    critical_fix: 'Fix',
    growth_move: 'Growth',
    trust_move: 'Trust',
};

const actionKindIcon = {
    critical_fix: <LuAlertTriangle size={16} />,
    growth_move: <LuMegaphone size={16} />,
    trust_move: <LuShieldCheck size={16} />,
};

export default function TodayWeeklyGrowthPackCard({ pack }: TodayWeeklyGrowthPackCardProps) {
    const { token } = theme.useToken();
    const handleCopy = async (copy: string, title: string) => {
        const copied = await copyTodayGrowthPackText(copy);
        Toast.show({
            content: copied ? `${title} copied` : 'Could not copy. Select and copy manually.',
            duration: copied ? 1400 : 2200,
        });
    };

    return (
        <Card style={{ borderRadius: 20 }}>
            <Flex gap={12} vertical>
                <Flex align="flex-start" justify="space-between">
                    <Flex gap={4} vertical>
                        <Text type="secondary">Ready this week</Text>
                        <Text strong style={{ fontSize: 17 }}>Weekly pack</Text>
                    </Flex>
                    <Tag color="primary">{pack.primarySubject}</Tag>
                </Flex>

                <Text type="secondary">{pack.summary}</Text>

                <Flex gap={8} vertical>
                    {pack.readyActions.slice(0, 3).map((action) => (
                        <Flex
                            align="flex-start"
                            gap={10}
                            key={action.id}
                            style={{
                                background: 'var(--adm-color-background)',
                                border: '1px solid var(--adm-color-border)',
                                borderRadius: 14,
                                padding: 12,
                            }}
                        >
                            <Flex
                                align="center"
                                justify="center"
                                style={{
                                    background: token.colorPrimaryBg,
                                    borderRadius: 10,
                                    color: token.colorPrimary,
                                    flexShrink: 0,
                                    height: 32,
                                    width: 32,
                                }}
                            >
                                {actionKindIcon[action.kind]}
                            </Flex>
                            <Flex gap={4} style={{ minWidth: 0 }} vertical>
                                <Flex align="center" gap={6} wrap>
                                    <Text strong>{action.title}</Text>
                                    <Tag>{actionKindLabel[action.kind]}</Tag>
                                </Flex>
                                <Text type="secondary">{action.description}</Text>
                            </Flex>
                        </Flex>
                    ))}
                </Flex>

                <Flex gap={10} vertical>
                    {pack.assets.map((asset) => (
                        <Flex
                            gap={8}
                            key={asset.id}
                            style={{
                                borderTop: '1px solid var(--adm-color-border)',
                                paddingTop: 10,
                            }}
                            vertical
                        >
                            <Flex align="center" justify="space-between">
                                <Flex gap={2} vertical>
                                    <Text strong>{asset.title}</Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>{asset.destination}</Text>
                                </Flex>
                                <Button
                                    fill="outline"
                                    onClick={() => void handleCopy(asset.copy, asset.title)}
                                    size="small"
                                    style={{ minHeight: 44 }}
                                >
                                    <Flex align="center" gap={6}>
                                        <LuCopy size={14} />
                                        <Text>Copy</Text>
                                    </Flex>
                                </Button>
                            </Flex>
                            <Text
                                style={{
                                    background: 'var(--adm-color-background)',
                                    borderRadius: 12,
                                    fontSize: 13,
                                    padding: 10,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                }}
                            >
                                {asset.copy}
                            </Text>
                        </Flex>
                    ))}
                </Flex>
            </Flex>
        </Card>
    );
}
