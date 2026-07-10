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
import { Button, Card, Flex, Space, Tag, Text, Toast } from '../antd';
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
import { theme } from 'antd';

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

function getCardKindIcon(card: AiMenuManagerCardPayload) {
    if (card.localActions?.length) return <LuDownload size={17} />;
    if (card.kind === 'clarification') return <LuHelpCircle size={17} />;
    if (card.kind === 'manual_task') return <LuListChecks size={17} />;
    if (card.kind === 'unsupported') return <LuCircleSlash size={17} />;
    if (card.kind === 'answer') return <LuInfo size={17} />;
    return <LuClipboardCheck size={17} />;
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
        throw Object.assign(new Error('mobile_ai_menu_manager_local_action_copy_unavailable'), {
            code: 'mobile_ai_menu_manager_local_action_copy_unavailable',
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
            throw Object.assign(new Error('mobile_ai_menu_manager_local_action_copy_fallback_failed'), {
                code: 'mobile_ai_menu_manager_local_action_copy_fallback_failed',
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
        surface: 'mobile_ai_menu_manager_card',
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

export default function MobileAiMenuCardStack({
    cards,
    workingCardId,
    onApprove,
    onCancel,
    onDraftPrompt,
    onEdit,
    onResolveClarification,
}: {
    cards: AiMenuManagerCardPayload[];
    workingCardId?: string | null;
    onApprove: (card: AiMenuManagerCardPayload) => void;
    onCancel: (card: AiMenuManagerCardPayload) => void;
    onDraftPrompt?: (prompt: string) => void;
    onEdit?: (card: AiMenuManagerCardPayload) => void;
    onResolveClarification?: (card: AiMenuManagerCardPayload, reply: AiMenuManagerSuggestedReply) => void;
}) {
    const { token } = theme.useToken();

    const handleLocalAction = async (action: LocalAction, sourceCard: AiMenuManagerCardPayload) => {
        try {
            if (action.type === 'copy_url') {
                await copyTextToClipboard(normalizeAiMenuManagerLocalActionUrl(action.value));
                Toast.show({ content: `${action.label} copied`, icon: 'success' });
                return;
            }

            if (action.type === 'copy_text') {
                await copyTextToClipboard(action.value);
                Toast.show({ content: `${action.label} copied`, icon: 'success' });
                return;
            }

            if (action.type === 'open_url') {
                const actionUrl = normalizeAiMenuManagerLocalActionUrl(action.value);
                const opened = window.open(actionUrl, '_blank', 'noopener,noreferrer');
                if (!opened) {
                    throw new Error('mobile_ai_menu_manager_local_action_open_blocked');
                }
                return;
            }

            if (action.type === 'download_text') {
                downloadTextFile(action);
                Toast.show({ content: `${action.label} downloaded`, icon: 'success' });
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
            Toast.show({ content: `${action.label} downloaded`, icon: 'success' });
        } catch (error) {
            logRuntimeFailure('mobile_ai_menu_manager_local_action_failed', error, buildLocalActionLogContext(sourceCard, action));
            Toast.show({ content: `Could not ${action.label.toLowerCase()}` });
        }
    };

    if (!cards.length) {
        return null;
    }

    return (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {cards.map((card) => (
                <Card
                    key={card.cardId}
                    style={{
                        borderColor: card.risk === 'high' ? token.colorErrorBorder : token.colorBorderSecondary,
                        borderRadius: 8,
                        boxShadow: token.boxShadowTertiary,
                    }}
                >
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        <div style={{ display: 'flex', gap: 10 }}>
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
                                    height: 32,
                                    justifyContent: 'center',
                                    marginTop: 2,
                                    width: 32,
                                }}
                            >
                                {getCardKindIcon(card)}
                            </span>
                            <div style={{ minWidth: 0 }}>
                                <Flex gap={6} wrap="wrap" style={{ marginBottom: 6 }}>
                                    <Tag color={riskColor(card.risk)} style={{ borderRadius: 999 }}>
                                        {getCardKindLabel(card)}
                                    </Tag>
                                    <Tag
                                        style={{
                                            borderRadius: 999,
                                            lineHeight: '20px',
                                            maxWidth: '100%',
                                            whiteSpace: 'normal',
                                            wordBreak: 'break-word',
                                        }}
                                    >
                                        {card.scope.label}
                                    </Tag>
                                </Flex>
                                <Text strong style={{ display: 'block', fontSize: 16, lineHeight: 1.25 }}>{card.title}</Text>
                                <Text type="secondary">{card.message}</Text>
                            </div>
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
                                <div
                                    style={{
                                        alignItems: 'center',
                                        display: 'grid',
                                        gap: 8,
                                        gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
                                        marginTop: 8,
                                    }}
                                >
                                    <div style={{ minWidth: 0 }}>
                                        <Text type="secondary">{card.beforeAfterSummary.beforeLabel || 'Before'}</Text>
                                        <Text style={{ display: 'block', wordBreak: 'break-word' }}>{card.beforeAfterSummary.beforeValue || '-'}</Text>
                                    </div>
                                    <LuArrowRight color={token.colorTextQuaternary} size={16} />
                                    <div style={{ minWidth: 0 }}>
                                        <Text type="secondary">{card.beforeAfterSummary.afterLabel || 'After'}</Text>
                                        <Text strong style={{ display: 'block', wordBreak: 'break-word' }}>{card.beforeAfterSummary.afterValue || '-'}</Text>
                                    </div>
                                </div>
                            ) : null}
                            {card.beforeAfterSummary.rows?.map((row) => (
                                <div key={`${row.label}:${row.after}`} style={{ marginTop: 6 }}>
                                    <Text type="secondary">{row.label}: </Text>
                                    <Text>
                                        {row.before ? <>{row.before} <LuArrowRight size={13} style={{ verticalAlign: '-2px' }} /> </> : null}
                                        <Text strong>{row.after || '-'}</Text>
                                    </Text>
                                </div>
                            ))}
                        </div>
                        {card.suggestedReplies?.length ? (
                            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                <Text strong>{card.kind === 'clarification' ? 'Choose one to continue' : 'Next options'}</Text>
                                {card.suggestedReplies.map((reply) => (
                                    <button
                                        key={`${card.cardId}:${reply.prompt}`}
                                        disabled={Boolean(workingCardId)}
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
                                            color: token.colorText,
                                            cursor: workingCardId ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            gap: 8,
                                            justifyContent: 'space-between',
                                            minHeight: 48,
                                            opacity: workingCardId ? 0.56 : 1,
                                            padding: '10px 12px',
                                            textAlign: 'left',
                                            width: '100%',
                                        }}
                                        type="button"
                                    >
                                        <span style={{ minWidth: 0 }}>
                                            <Text strong style={{ display: 'block' }}>{reply.label}</Text>
                                            {reply.helper ? (
                                                <Text type="secondary" style={{ display: 'block' }}>{reply.helper}</Text>
                                            ) : null}
                                        </span>
                                        <LuArrowRight color={token.colorTextQuaternary} size={17} style={{ flexShrink: 0, marginTop: 3 }} />
                                    </button>
                                ))}
                            </Space>
                        ) : null}
                        {card.localActions?.length ? (
                            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                <Text strong>Available actions</Text>
                                {card.localActions.find((action) => action.type === 'copy_url' || action.type === 'copy_text')?.value ? (
                                    <Text
                                        style={{
                                            background: token.colorFillSecondary,
                                            border: `1px solid ${token.colorBorderSecondary}`,
                                            borderRadius: 8,
                                            display: 'block',
                                            maxHeight: card.localActions.find((action) => action.type === 'copy_text') ? 160 : undefined,
                                            overflow: card.localActions.find((action) => action.type === 'copy_text') ? 'auto' : undefined,
                                            padding: '8px 10px',
                                            whiteSpace: card.localActions.find((action) => action.type === 'copy_text') ? 'pre-wrap' : 'normal',
                                            wordBreak: 'break-word',
                                        }}
                                    >
                                        {card.localActions.find((action) => action.type === 'copy_url' || action.type === 'copy_text')?.value}
                                    </Text>
                                ) : null}
                                <Flex gap={8} wrap="wrap">
                                    {card.localActions.map((action) => (
                                        <Button
                                            key={`${card.cardId}:${action.type}:${action.label}`}
                                            fill="outline"
                                            disabled={Boolean(workingCardId)}
                                            loading={workingCardId === card.cardId}
                                            onClick={() => void handleLocalAction(action, card)}
                                            style={{ borderRadius: 999, minHeight: 44, paddingInline: 14 }}
                                        >
                                            {getLocalActionIcon(action.type)} {action.label}
                                        </Button>
                                    ))}
                                </Flex>
                            </Space>
                        ) : null}
                        {shouldShowAiMenuManagerApprovalReason(card) ? (
                            <Text type="secondary">{card.approvalPolicy.reason}</Text>
                        ) : null}
                        <Flex gap={8} wrap="wrap">
                            {card.actions.includes('approve') || card.actions.includes('mark_done') ? (
                                <Button
                                    block
                                    color="primary"
                                    fill="solid"
                                    disabled={Boolean(workingCardId)}
                                    loading={workingCardId === card.cardId}
                                    onClick={() => onApprove(card)}
                                    style={{ borderRadius: 999, minHeight: 44 }}
                                >
                                    <LuCheck /> {card.actions.includes('mark_done') ? (card.localActions?.length ? 'Done' : 'Mark done') : 'Approve'}
                                </Button>
                            ) : null}
                            {card.actions.includes('edit') ? (
                                <Button
                                    block
                                    fill="outline"
                                    disabled={Boolean(workingCardId)}
                                    loading={workingCardId === card.cardId}
                                    onClick={() => onEdit?.(card)}
                                    style={{ borderRadius: 999, minHeight: 44 }}
                                >
                                    <LuPencil /> Edit
                                </Button>
                            ) : null}
                            {card.actions.includes('cancel') ? (
                                <Button
                                    block
                                    fill="outline"
                                    disabled={Boolean(workingCardId)}
                                    loading={workingCardId === card.cardId}
                                    onClick={() => onCancel(card)}
                                    style={{ borderRadius: 999, minHeight: 44 }}
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
