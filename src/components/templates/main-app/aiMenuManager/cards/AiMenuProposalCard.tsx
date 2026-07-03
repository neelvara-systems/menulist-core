'use client';

import type { AiMenuManagerCardPayload } from '@type/aiMenuManager';
import { normalizeAiMenuManagerLocalActionUrl } from '@lib/ai-menu-manager/localActionUrl';
import {
    getBoundedRuntimeStringContext,
    hasRuntimeClipboardWrite,
    hasRuntimeCopyFallback,
    logRuntimeFailure,
} from '@lib/runtime/runtimeDiagnostics';
import { App, Button, Card, Space, Tag, Typography, theme } from 'antd';
import { LuCheck, LuCopy, LuDownload, LuExternalLink, LuPencil, LuX } from 'react-icons/lu';

const { Text, Title } = Typography;

type LocalAction = NonNullable<AiMenuManagerCardPayload['localActions']>[number];

function riskColor(risk: AiMenuManagerCardPayload['risk']) {
    if (risk === 'high') return 'red';
    if (risk === 'medium') return 'gold';
    return 'green';
}

async function copyTextToClipboard(value: string) {
    let clipboardWriteError: unknown;

    if (hasRuntimeClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(value);
            return;
        } catch (error) {
            clipboardWriteError = error;
        }
    }

    if (!hasRuntimeCopyFallback()) {
        throw Object.assign(new Error('ai_menu_manager_local_action_copy_unavailable'), {
            code: 'ai_menu_manager_local_action_copy_unavailable',
            clipboardWriteRejected: Boolean(clipboardWriteError),
        });
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.left = '-9999px';
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
        const copied = document.execCommand('copy');
        if (!copied) {
            throw Object.assign(new Error('ai_menu_manager_local_action_copy_fallback_failed'), {
                code: 'ai_menu_manager_local_action_copy_fallback_failed',
            });
        }
    } finally {
        document.body.removeChild(textarea);
    }
}

function getLocalActionIcon(type: LocalAction['type']) {
    if (type === 'download_qr' || type === 'download_text') return <LuDownload />;
    if (type === 'open_url') return <LuExternalLink />;
    return <LuCopy />;
}

function downloadTextFile(action: LocalAction) {
    const blob = new Blob([action.value], { type: action.mimeType || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = action.filename || 'menulist-export.txt';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

function buildLocalActionLogContext(card: AiMenuManagerCardPayload, action: LocalAction) {
    return {
        surface: 'desktop_ai_menu_manager_card',
        flow: 'local_action',
        actionType: action.type,
        cardKind: card.kind,
        cardRisk: card.risk,
        hasLocalActionValue: Boolean(action.value),
        hasClipboardWrite: hasRuntimeClipboardWrite(),
        hasCopyFallback: hasRuntimeCopyFallback(),
        ...getBoundedRuntimeStringContext('cardId', card.cardId),
        ...getBoundedRuntimeStringContext('actionLabel', action.label),
        ...getBoundedRuntimeStringContext('actionValue', action.value),
        ...getBoundedRuntimeStringContext('filename', action.filename),
    };
}

export default function AiMenuProposalCard({
    card,
    disabled,
    onApprove,
    onCancel,
    onDraftPrompt,
    onEdit,
    onOpenExisting,
    onResolveClarification,
}: {
    card: AiMenuManagerCardPayload;
    disabled?: boolean;
    onApprove?: (card: AiMenuManagerCardPayload) => void;
    onCancel?: (card: AiMenuManagerCardPayload) => void;
    onDraftPrompt?: (prompt: string) => void;
    onEdit?: (card: AiMenuManagerCardPayload) => void;
    onOpenExisting?: (card: AiMenuManagerCardPayload) => void;
    onResolveClarification?: (card: AiMenuManagerCardPayload, prompt: string) => void;
}) {
    const { token } = theme.useToken();
    const { message } = App.useApp();
    const summary = card.beforeAfterSummary;
    const primaryLocalAction = card.localActions?.find((action) => action.type === 'copy_url' || action.type === 'copy_text');

    const handleLocalAction = async (action: LocalAction, sourceCard: AiMenuManagerCardPayload) => {
        try {
            if (action.type === 'copy_url') {
                await copyTextToClipboard(normalizeAiMenuManagerLocalActionUrl(action.value));
                message.success(`${action.label} copied`);
                return;
            }

            if (action.type === 'copy_text') {
                await copyTextToClipboard(action.value);
                message.success(`${action.label} copied`);
                return;
            }

            if (action.type === 'open_url') {
                const actionUrl = normalizeAiMenuManagerLocalActionUrl(action.value);
                const opened = window.open(actionUrl, '_blank', 'noopener,noreferrer');
                if (!opened) {
                    throw new Error('ai_menu_manager_local_action_open_blocked');
                }
                return;
            }

            if (action.type === 'download_text') {
                downloadTextFile(action);
                message.success(`${action.label} downloaded`);
                return;
            }

            const { downloadQrCode, generateBrandedQrCodeDataUrl } = await import('@lib/utils/qrCode');
            const actionUrl = normalizeAiMenuManagerLocalActionUrl(action.value);
            const qrDataUrl = await generateBrandedQrCodeDataUrl(actionUrl, {
                footer: action.qrFooter || actionUrl.replace(/^https?:\/\//, ''),
                storeName: action.qrStoreName,
                subtitle: action.qrSubtitle || 'Scan to open',
                title: action.qrTitle || action.label,
            });
            downloadQrCode(qrDataUrl, action.filename || 'menulist-qr');
            message.success(`${action.label} downloaded`);
        } catch (error) {
            logRuntimeFailure('ai_menu_manager_local_action_failed', error, buildLocalActionLogContext(sourceCard, action));
            message.error(`Could not ${action.label.toLowerCase()}`);
        }
    };

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

                {card.suggestedReplies?.length ? (
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        <Text strong>Choose an option</Text>
                        <div style={{ display: 'grid', gap: 8 }}>
                            {card.suggestedReplies.map((reply) => (
                                <button
                                    key={`${card.cardId}:${reply.prompt}`}
                                    onClick={() => {
                                        if (card.kind === 'clarification') {
                                            onResolveClarification?.(card, reply.prompt);
                                            return;
                                        }
                                        onDraftPrompt?.(reply.prompt);
                                    }}
                                    style={{
                                        background: token.colorBgContainer,
                                        border: `1px solid ${token.colorBorderSecondary}`,
                                        borderRadius: 10,
                                        color: token.colorText,
                                        cursor: 'pointer',
                                        minHeight: 44,
                                        padding: '10px 12px',
                                        textAlign: 'left',
                                    }}
                                    type="button"
                                >
                                    <Text strong>{reply.label}</Text>
                                    {reply.helper ? (
                                        <Text type="secondary" style={{ display: 'block' }}>{reply.helper}</Text>
                                    ) : null}
                                </button>
                            ))}
                        </div>
                    </Space>
                ) : null}

                {card.localActions?.length ? (
                    <div
                        style={{
                            background: token.colorFillSecondary,
                            border: `1px solid ${token.colorBorderSecondary}`,
                            borderRadius: 8,
                            padding: 12,
                    }}
                >
                    <Text strong>Ready to use</Text>
                        {primaryLocalAction?.value ? (
                            <Text
                                code
                                style={{
                                    display: 'block',
                                    marginTop: 8,
                                    maxHeight: primaryLocalAction.type === 'copy_text' ? 180 : undefined,
                                    maxWidth: '100%',
                                    overflow: primaryLocalAction.type === 'copy_text' ? 'auto' : undefined,
                                    whiteSpace: primaryLocalAction.type === 'copy_text' ? 'pre-wrap' : 'normal',
                                    wordBreak: 'break-word',
                                }}
                            >
                                {primaryLocalAction.value}
                            </Text>
                        ) : null}
                        <Space wrap style={{ marginTop: 10 }}>
                            {card.localActions.map((action) => (
                                <Button
                                    key={`${card.cardId}:${action.type}:${action.label}`}
                                    icon={getLocalActionIcon(action.type)}
                                    disabled={disabled}
                                    onClick={() => void handleLocalAction(action, card)}
                                >
                                    {action.label}
                                </Button>
                            ))}
                        </Space>
                    </div>
                ) : null}

                <Text type="secondary">{card.approvalPolicy.reason}</Text>

                <Space wrap>
                    {card.actions.includes('edit') ? (
                        <Button
                            icon={<LuPencil />}
                            disabled={disabled}
                            onClick={() => onEdit?.(card)}
                        >
                            Edit
                        </Button>
                    ) : null}
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
                            {card.localActions?.length ? 'Done' : 'Mark done'}
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
