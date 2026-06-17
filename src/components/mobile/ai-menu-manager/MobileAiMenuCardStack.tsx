'use client';

import type { AiMenuManagerCardPayload } from '@type/aiMenuManager';
import { Button, Card, Flex, Space, Tag, Text } from '../antd';
import { LuCheck, LuX } from 'react-icons/lu';
import { theme } from 'antd';

function riskColor(risk: AiMenuManagerCardPayload['risk']) {
    if (risk === 'high') return 'red';
    if (risk === 'medium') return 'gold';
    return 'green';
}

export default function MobileAiMenuCardStack({
    cards,
    workingCardId,
    onApprove,
    onCancel,
}: {
    cards: AiMenuManagerCardPayload[];
    workingCardId?: string | null;
    onApprove: (card: AiMenuManagerCardPayload) => void;
    onCancel: (card: AiMenuManagerCardPayload) => void;
}) {
    const { token } = theme.useToken();

    if (!cards.length) {
        return (
            <Card>
                <Text type="secondary">No pending cards.</Text>
            </Card>
        );
    }

    return (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {cards.map((card) => (
                <Card key={card.cardId} style={{ borderRadius: 8 }}>
                    <Space direction="vertical" size={10} style={{ width: '100%' }}>
                        <Flex gap={6} wrap="wrap">
                            <Tag color={riskColor(card.risk)}>{card.risk}</Tag>
                            <Tag>{card.actionType.replaceAll('_', ' ')}</Tag>
                        </Flex>
                        <div>
                            <Text strong style={{ display: 'block', fontSize: 16 }}>{card.title}</Text>
                            <Text type="secondary">{card.message}</Text>
                        </div>
                        <div
                            style={{
                                background: token.colorFillTertiary,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                borderRadius: 8,
                                padding: 10,
                            }}
                        >
                            <Text strong>{card.beforeAfterSummary.title}</Text>
                            {card.beforeAfterSummary.beforeValue || card.beforeAfterSummary.afterValue ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                                    <div>
                                        <Text type="secondary">{card.beforeAfterSummary.beforeLabel || 'Before'}</Text>
                                        <Text style={{ display: 'block' }}>{card.beforeAfterSummary.beforeValue || '-'}</Text>
                                    </div>
                                    <div>
                                        <Text type="secondary">{card.beforeAfterSummary.afterLabel || 'After'}</Text>
                                        <Text strong style={{ display: 'block' }}>{card.beforeAfterSummary.afterValue || '-'}</Text>
                                    </div>
                                </div>
                            ) : null}
                            {card.beforeAfterSummary.rows?.map((row) => (
                                <div key={`${row.label}:${row.after}`} style={{ marginTop: 6 }}>
                                    <Text type="secondary">{row.label}: </Text>
                                    <Text>{row.before ? `${row.before} -> ` : ''}<strong>{row.after || '-'}</strong></Text>
                                </div>
                            ))}
                        </div>
                        <Text type="secondary">{card.approvalPolicy.reason}</Text>
                        <Flex gap={8}>
                            {card.actions.includes('approve') || card.actions.includes('mark_done') ? (
                                <Button
                                    block
                                    color="primary"
                                    fill="solid"
                                    loading={workingCardId === card.cardId}
                                    onClick={() => onApprove(card)}
                                    style={{ minHeight: 44 }}
                                >
                                    <LuCheck /> {card.actions.includes('mark_done') ? 'Mark done' : 'Approve'}
                                </Button>
                            ) : null}
                            {card.actions.includes('cancel') ? (
                                <Button
                                    block
                                    fill="outline"
                                    loading={workingCardId === card.cardId}
                                    onClick={() => onCancel(card)}
                                    style={{ minHeight: 44 }}
                                >
                                    <LuX /> Cancel
                                </Button>
                            ) : null}
                        </Flex>
                    </Space>
                </Card>
            ))}
        </Space>
    );
}
