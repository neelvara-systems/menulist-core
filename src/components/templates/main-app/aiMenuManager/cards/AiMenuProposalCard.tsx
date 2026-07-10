'use client';

import type { AiMenuManagerCardPayload, AiMenuManagerSuggestedReply } from '@type/aiMenuManager';
import { normalizeAiMenuManagerLocalActionUrl } from '@lib/ai-menu-manager/localActionUrl';
import { shouldShowAiMenuManagerApprovalReason } from '@lib/ai-menu-manager/presentation';
import {
    getBoundedRuntimeStringContext,
    hasRuntimeClipboardWrite,
    hasRuntimeCopyFallback,
    logRuntimeFailure,
} from '@lib/runtime/runtimeDiagnostics';
import { App, Button, Card, Space, Tag, Typography, theme } from 'antd';
import {
    LuArrowRight,
    LuCheck,
    LuCircleSlash,
    LuClipboardCheck,
    LuCopy,
    LuDownload,
    LuExternalLink,
    LuHelpCircle,
    LuInfo,
    LuListChecks,
    LuPencil,
    LuX,
} from 'react-icons/lu';

const { Text, Title } = Typography;

type LocalAction = NonNullable<AiMenuManagerCardPayload['localActions']>[number];

function riskColor(risk: AiMenuManagerCardPayload['risk']) {
    if (risk === 'high') return 'red';
    if (risk === 'medium') return 'gold';
    return 'green';
}

function getCardKindLabel(card: AiMenuManagerCardPayload) {
    if (card.localActions?.length) return 'Ready to use';
    if (card.kind === 'clarification') return 'Choose one';
    if (card.kind === 'manual_task') return 'Manual step';
    if (card.kind === 'unsupported') return 'Not available here';
    if (card.kind === 'answer') return 'Answer';
    return 'Prepared update';
}

function getPrimaryActionLabel(card: AiMenuManagerCardPayload) {
    if (card.actions.includes('approve')) return 'Approve';
    if (card.actions.includes('mark_done')) return card.localActions?.length ? 'Done' : 'Mark done';
    if (card.actions.includes('open_existing_screen')) return 'Open';
    return null;
}

function getCardKindIcon(card: AiMenuManagerCardPayload) {
    if (card.localActions?.length) return <LuDownload size={18} />;
    if (card.kind === 'clarification') return <LuHelpCircle size={18} />;
    if (card.kind === 'manual_task') return <LuListChecks size={18} />;
    if (card.kind === 'unsupported') return <LuCircleSlash size={18} />;
    if (card.kind === 'answer') return <LuInfo size={18} />;
    return <LuClipboardCheck size={18} />;
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
    onResolveClarification?: (card: AiMenuManagerCardPayload, reply: AiMenuManagerSuggestedReply) => void;
}) {
    const { token } = theme.useToken();
    const { message } = App.useApp();
    const summary = card.beforeAfterSummary;
    const primaryLocalAction = card.localActions?.find((action) => action.type === 'copy_url' || action.type === 'copy_text');
    const primaryActionLabel = getPrimaryActionLabel(card);
    const pillButtonStyle = {
        borderRadius: 999,
        minHeight: 38,
        paddingInline: 16,
    };

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
                background: token.colorBgContainer,
                borderColor: card.risk === 'high' ? token.colorErrorBorder : token.colorBorderSecondary,
                borderRadius: 8,
                boxShadow: token.boxShadowTertiary,
                maxWidth: 720,
                width: '100%',
            }}
            styles={{
                body: {
                    padding: 16,
                },
            }}
        >
            <Space direction="vertical" size={14} style={{ width: '100%' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                    <span
                        aria-hidden
                        style={{
                            alignItems: 'center',
                            background: token.colorFillSecondary,
                            border: `1px solid ${token.colorBorderSecondary}`,
                            borderRadius: 999,
                            color: token.colorPrimary,
                            display: 'inline-flex',
                            flexShrink: 0,
                            height: 34,
                            justifyContent: 'center',
                            marginTop: 2,
                            width: 34,
                        }}
                    >
                        {getCardKindIcon(card)}
                    </span>
                    <div style={{ minWidth: 0 }}>
                        <Space size={6} wrap style={{ marginBottom: 6 }}>
                            <Tag
                                color={riskColor(card.risk)}
                                style={{ borderRadius: 999, fontWeight: 600, marginInlineEnd: 0 }}
                            >
                                {getCardKindLabel(card)}
                            </Tag>
                            <Tag
                                style={{
                                    borderRadius: 999,
                                    lineHeight: '20px',
                                    marginInlineEnd: 0,
                                    maxWidth: '100%',
                                    whiteSpace: 'normal',
                                    wordBreak: 'break-word',
                                }}
                            >
                                {card.scope.label}
                            </Tag>
                        </Space>
                        <Title level={5} style={{ margin: 0 }}>{card.title}</Title>
                        <Text type="secondary">{card.message}</Text>
                    </div>
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
                        <div
                            style={{
                                alignItems: 'center',
                                display: 'grid',
                                gap: 10,
                                gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
                                marginTop: 10,
                            }}
                        >
                            <div style={{ minWidth: 0 }}>
                                <Text type="secondary">{summary.beforeLabel || 'Before'}</Text>
                                <Text style={{ display: 'block', wordBreak: 'break-word' }}>
                                    {summary.beforeValue || '-'}
                                </Text>
                            </div>
                            <LuArrowRight color={token.colorTextQuaternary} size={18} />
                            <div style={{ minWidth: 0 }}>
                                <Text type="secondary">{summary.afterLabel || 'After'}</Text>
                                <Text strong style={{ display: 'block', wordBreak: 'break-word' }}>
                                    {summary.afterValue || '-'}
                                </Text>
                            </div>
                        </div>
                    ) : null}
                    {summary.rows?.length ? (
                        <Space direction="vertical" size={6} style={{ width: '100%', marginTop: 10 }}>
                            {summary.rows.map((row) => (
                                <div
                                    key={`${row.label}:${row.before}:${row.after}`}
                                    style={{
                                        alignItems: 'center',
                                        display: 'grid',
                                        gap: 8,
                                        gridTemplateColumns: 'minmax(120px, 0.45fr) minmax(0, 1fr)',
                                    }}
                                >
                                    <Text type="secondary" style={{ wordBreak: 'break-word' }}>{row.label}</Text>
                                    <Text style={{ wordBreak: 'break-word' }}>
                                        {row.before ? <>{row.before} <LuArrowRight size={13} style={{ verticalAlign: '-2px' }} /> </> : null}
                                        <Text strong>{row.after || '-'}</Text>
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
                        <Text strong>{card.kind === 'clarification' ? 'Choose one to continue' : 'Next options'}</Text>
                        <div style={{ display: 'grid', gap: 8 }}>
                            {card.suggestedReplies.map((reply) => (
                                <button
                                    key={`${card.cardId}:${reply.prompt}`}
                                    disabled={disabled}
                                    onClick={() => {
                                        if (card.kind === 'clarification') {
                                            onResolveClarification?.(card, reply);
                                            return;
                                        }
                                        onDraftPrompt?.(reply.prompt);
                                    }}
                                    style={{
                                        background: token.colorFillQuaternary,
                                        border: `1px solid ${token.colorBorderSecondary}`,
                                        borderRadius: 8,
                                        boxShadow: 'none',
                                        color: token.colorText,
                                        cursor: disabled ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        gap: 10,
                                        justifyContent: 'space-between',
                                        minHeight: 44,
                                        opacity: disabled ? 0.56 : 1,
                                        padding: '10px 12px',
                                        textAlign: 'left',
                                        transition: 'border-color 160ms ease, background 160ms ease',
                                    }}
                                    type="button"
                                >
                                    <span style={{ minWidth: 0 }}>
                                        <Text strong style={{ display: 'block' }}>{reply.label}</Text>
                                        {reply.helper ? (
                                            <Text type="secondary" style={{ display: 'block' }}>{reply.helper}</Text>
                                        ) : null}
                                    </span>
                                    <LuArrowRight color={token.colorTextQuaternary} size={18} style={{ flexShrink: 0, marginTop: 2 }} />
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
                            boxShadow: 'none',
                            padding: 12,
                        }}
                    >
                        <Text strong>Available actions</Text>
                        {primaryLocalAction?.value ? (
                            <Text
                                code
                                style={{
                                    display: 'block',
                                    marginTop: 8,
                                    maxHeight: primaryLocalAction.type === 'copy_text' ? 180 : undefined,
                                    maxWidth: '100%',
                                    overflow: primaryLocalAction.type === 'copy_text' ? 'auto' : undefined,
                                    padding: '6px 8px',
                                    whiteSpace: primaryLocalAction.type === 'copy_text' ? 'pre-wrap' : 'normal',
                                    wordBreak: 'break-word',
                                }}
                            >
                                {primaryLocalAction.value}
                            </Text>
                        ) : null}
                        <Space wrap style={{ marginTop: 12 }}>
                            {card.localActions.map((action) => (
                                <Button
                                    key={`${card.cardId}:${action.type}:${action.label}`}
                                    icon={getLocalActionIcon(action.type)}
                                    disabled={disabled}
                                    onClick={() => void handleLocalAction(action, card)}
                                    style={pillButtonStyle}
                                >
                                    {action.label}
                                </Button>
                            ))}
                        </Space>
                    </div>
                ) : null}

                <div
                    style={{
                        alignItems: 'center',
                        borderTop: `1px solid ${token.colorSplit}`,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                        justifyContent: 'space-between',
                        paddingTop: 12,
                    }}
                >
                    {shouldShowAiMenuManagerApprovalReason(card) ? (
                        <Text type="secondary" style={{ flex: '1 1 240px', fontSize: 12 }}>
                            {card.approvalPolicy.reason}
                        </Text>
                    ) : <span />}
                    <Space wrap>
                        {card.actions.includes('approve') ? (
                            <Button
                                type="primary"
                                icon={<LuCheck />}
                                disabled={disabled}
                                onClick={() => onApprove?.(card)}
                                style={pillButtonStyle}
                            >
                                {primaryActionLabel}
                            </Button>
                        ) : null}
                        {card.actions.includes('mark_done') ? (
                            <Button
                                type="primary"
                                icon={<LuCheck />}
                                disabled={disabled}
                                onClick={() => onApprove?.(card)}
                                style={pillButtonStyle}
                            >
                                {primaryActionLabel}
                            </Button>
                        ) : null}
                        {card.actions.includes('open_existing_screen') ? (
                            <Button
                                icon={<LuExternalLink />}
                                disabled={disabled}
                                onClick={() => onOpenExisting?.(card)}
                                style={pillButtonStyle}
                            >
                                {primaryActionLabel}
                            </Button>
                        ) : null}
                        {card.actions.includes('edit') ? (
                            <Button
                                icon={<LuPencil />}
                                disabled={disabled}
                                onClick={() => onEdit?.(card)}
                                style={pillButtonStyle}
                            >
                                Edit
                            </Button>
                        ) : null}
                        {card.actions.includes('cancel') ? (
                            <Button
                                icon={<LuX />}
                                disabled={disabled}
                                onClick={() => onCancel?.(card)}
                                style={pillButtonStyle}
                            >
                                Cancel
                            </Button>
                        ) : null}
                    </Space>
                </div>
            </Space>
        </Card>
    );
}
