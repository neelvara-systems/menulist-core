'use client';

import type { AiMenuManagerCardPayload } from '@type/aiMenuManager';
import { Button, Card, Space, Tag, Typography, theme } from 'antd';
import { LuCheck, LuExternalLink, LuX } from 'react-icons/lu';

const { Text, Title } = Typography;

function riskColor(risk: AiMenuManagerCardPayload['risk']) {
    if (risk === 'high') return 'red';
    if (risk === 'medium') return 'gold';
    return 'green';
}

export default function AiMenuProposalCard({
    card,
    disabled,
    onApprove,
    onCancel,
    onOpenExisting,
}: {
    card: AiMenuManagerCardPayload;
    disabled?: boolean;
    onApprove?: (card: AiMenuManagerCardPayload) => void;
    onCancel?: (card: AiMenuManagerCardPayload) => void;
    onOpenExisting?: (card: AiMenuManagerCardPayload) => void;
}) {
    const { token } = theme.useToken();
    const summary = card.beforeAfterSummary;

    return (
        <Card
            size="small"
            style={{
                borderColor: card.risk === 'high' ? token.colorErrorBorder : undefined,
                borderRadius: 8,
                maxWidth: 720,
                width: '100%',
            }}
        >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Space wrap>
                    <Tag color={riskColor(card.risk)}>{card.risk}</Tag>
                    <Tag>{card.actionType.replaceAll('_', ' ')}</Tag>
                    <Tag>{card.scope.label}</Tag>
                </Space>

                <div>
                    <Title level={5} style={{ margin: 0 }}>{card.title}</Title>
                    <Text type="secondary">{card.message}</Text>
                </div>

                <div
                    style={{
                        background: token.colorFillTertiary,
                        border: `1px solid ${token.colorBorderSecondary}`,
                        borderRadius: 8,
                        padding: 12,
                    }}
                >
                    <Text strong>{summary.title}</Text>
                    {summary.beforeValue || summary.afterValue ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                            <div>
                                <Text type="secondary">{summary.beforeLabel || 'Before'}</Text>
                                <div><Text>{summary.beforeValue || '-'}</Text></div>
                            </div>
                            <div>
                                <Text type="secondary">{summary.afterLabel || 'After'}</Text>
                                <div><Text strong>{summary.afterValue || '-'}</Text></div>
                            </div>
                        </div>
                    ) : null}
                    {summary.rows?.length ? (
                        <Space direction="vertical" size={4} style={{ width: '100%', marginTop: 8 }}>
                            {summary.rows.map((row) => (
                                <div
                                    key={`${row.label}:${row.before}:${row.after}`}
                                    style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8 }}
                                >
                                    <Text type="secondary">{row.label}</Text>
                                    <Text>
                                        {row.before ? `${row.before} -> ` : ''}
                                        <strong>{row.after || '-'}</strong>
                                    </Text>
                                </div>
                            ))}
                        </Space>
                    ) : null}
                    {summary.warnings?.map((warning) => (
                        <Text key={warning} type="warning" style={{ display: 'block', marginTop: 8 }}>
                            {warning}
                        </Text>
                    ))}
                </div>

                <Text type="secondary">{card.approvalPolicy.reason}</Text>

                <Space wrap>
                    {card.actions.includes('approve') ? (
                        <Button
                            type="primary"
                            icon={<LuCheck />}
                            disabled={disabled}
                            onClick={() => onApprove?.(card)}
                        >
                            Approve
                        </Button>
                    ) : null}
                    {card.actions.includes('mark_done') ? (
                        <Button
                            type="primary"
                            icon={<LuCheck />}
                            disabled={disabled}
                            onClick={() => onApprove?.(card)}
                        >
                            Mark done
                        </Button>
                    ) : null}
                    {card.actions.includes('open_existing_screen') ? (
                        <Button
                            icon={<LuExternalLink />}
                            disabled={disabled}
                            onClick={() => onOpenExisting?.(card)}
                        >
                            Open existing screen
                        </Button>
                    ) : null}
                    {card.actions.includes('cancel') ? (
                        <Button
                            icon={<LuX />}
                            disabled={disabled}
                            onClick={() => onCancel?.(card)}
                        >
                            Cancel
                        </Button>
                    ) : null}
                </Space>
            </Space>
        </Card>
    );
}
