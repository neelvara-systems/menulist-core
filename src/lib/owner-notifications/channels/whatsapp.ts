import type { OwnerNotificationChannelResult } from '../types';

const GRAPH_API_VERSION = 'v21.0';

function normalizeWhatsAppNumber(value: string): string {
    return value.replace(/[^\d]/g, '');
}

export function isOwnerNotificationWhatsAppConfigured(): boolean {
    return Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
}

export async function sendOwnerNotificationWhatsApp(params: {
    to: string;
    text: string;
    sessionActive?: boolean;
    templateName?: string;
    templateLanguage?: string;
    templateParameters?: string[];
}): Promise<OwnerNotificationChannelResult> {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
        return { ok: false, skippedReason: 'whatsapp_not_configured' };
    }

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
        const response = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const responseText = await response.text();
        if (!response.ok) {
            return {
                ok: false,
                error: `WhatsApp send failed: ${response.status} ${responseText.slice(0, 180)}`,
            };
        }

        let providerMessageId: string | undefined;
        try {
            const parsed = JSON.parse(responseText);
            providerMessageId = parsed?.messages?.[0]?.id;
        } catch {
            providerMessageId = undefined;
        }

        return { ok: true, providerMessageId };
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : 'Unknown WhatsApp error',
        };
    }
}
