import type { OwnerNotificationChannelResult } from '../types';
import { buildWhatsAppPhoneParam } from '@lib/phone/phoneNumber';
import { logNotificationFailure } from '@lib/notifications/notificationDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { menulistServerEnv } from '@lib/env/menulistServerEnv';

const GRAPH_API_VERSION = 'v21.0';
const MAX_WHATSAPP_PROVIDER_MESSAGE_ID_LENGTH = 200;
const OWNER_NOTIFICATION_WHATSAPP_RESPONSE_JSON_MAX_BYTES = 64 * 1024;
const OWNER_NOTIFICATION_WHATSAPP_RESPONSE_PARSE_FAILED = 'whatsapp_response_parse_failed';
const OWNER_NOTIFICATION_WHATSAPP_TIMEOUT_MS = 15_000;

function getWhatsAppProviderMessageId(value: unknown): string | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const messages = (value as { messages?: unknown }).messages;
    if (!Array.isArray(messages)) return undefined;
    const providerMessageId = (messages[0] as { id?: unknown } | undefined)?.id;
    if (typeof providerMessageId !== 'string') return undefined;
    const normalized = providerMessageId.trim();
    if (!normalized || normalized.length > MAX_WHATSAPP_PROVIDER_MESSAGE_ID_LENGTH) return undefined;
    return normalized;
}

function normalizeWhatsAppNumber(value: string): string {
    return buildWhatsAppPhoneParam({ phoneNumber: value });
}

async function readOwnerNotificationWhatsAppResponseJson(response: Response): Promise<unknown | null> {
    try {
        return await readJsonResponseWithLimit(response, OWNER_NOTIFICATION_WHATSAPP_RESPONSE_JSON_MAX_BYTES);
    } catch (error) {
        logNotificationFailure(OWNER_NOTIFICATION_WHATSAPP_RESPONSE_PARSE_FAILED, error, {
            responseStatus: response.status,
        });
        return null;
    }
}

export function isOwnerNotificationWhatsAppConfigured(): boolean {
    return Boolean(menulistServerEnv.whatsappPhoneNumberId && menulistServerEnv.whatsappAccessToken);
}

export async function sendOwnerNotificationWhatsApp(params: {
    to: string;
    text: string;
    sessionActive?: boolean;
    templateName?: string;
    templateLanguage?: string;
    templateParameters?: string[];
}): Promise<OwnerNotificationChannelResult> {
    const phoneNumberId = menulistServerEnv.whatsappPhoneNumberId;
    const accessToken = menulistServerEnv.whatsappAccessToken;

    if (!phoneNumberId || !accessToken) {
        return { ok: false, skippedReason: 'whatsapp_not_configured' };
    }
    const encodedPhoneNumberId = encodeURIComponent(phoneNumberId);

    const to = normalizeWhatsAppNumber(params.to);
    if (!to) {
        return { ok: false, skippedReason: 'whatsapp_recipient_missing' };
    }

    const body = params.templateName
        ? {
            messaging_product: 'whatsapp',
            to,
            type: 'template',
            template: {
                name: params.templateName,
                language: { code: params.templateLanguage || 'en' },
                ...(params.templateParameters?.length
                    ? {
                        components: [{
                            type: 'body',
                            parameters: params.templateParameters.map((text) => ({ type: 'text', text })),
                        }],
                    }
                    : {}),
            },
        }
        : params.sessionActive
            ? {
                messaging_product: 'whatsapp',
                to,
                type: 'text',
                text: { body: params.text },
            }
            : null;

    if (!body) {
        return { ok: false, skippedReason: 'whatsapp_template_or_session_required' };
    }

    try {
        const response = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${encodedPhoneNumberId}/messages`, {
            method: 'POST',
            redirect: 'manual',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(OWNER_NOTIFICATION_WHATSAPP_TIMEOUT_MS),
        });

        if (!response.ok) {
            return {
                ok: false,
                error: 'whatsapp_send_failed',
            };
        }

        const parsed = await readOwnerNotificationWhatsAppResponseJson(response);
        const providerMessageId = getWhatsAppProviderMessageId(parsed);

        return { ok: true, providerMessageId };
    } catch {
        return {
            ok: false,
            error: 'whatsapp_send_failed',
        };
    }
}
