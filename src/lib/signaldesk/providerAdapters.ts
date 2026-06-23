import { SIGNALDESK_INTEGRATION_ENV, SIGNALDESK_META_GRAPH_VERSION } from "@constant/signaldesk/integrations";
import type { SignalDeskOutboundChannel } from "@type/signaldesk";
import nodemailer from "nodemailer";

type ProviderSendInput = {
    body: string;
    channel: SignalDeskOutboundChannel;
    recipient: string;
    subject?: string | null;
};

type ProviderSendResult = {
    provider: string;
    providerMessageId?: string | null;
    status: "sent" | "failed";
};

const env = (key: string) => process.env[key]?.trim() || "";

const isTruthy = (value: string) => /^(1|true|yes)$/i.test(value);

export const getSignalDeskChannelReadiness = () => {
    const smtpReady = Boolean(
        env(SIGNALDESK_INTEGRATION_ENV.SMTP_HOST) &&
        env(SIGNALDESK_INTEGRATION_ENV.SMTP_USER) &&
        env(SIGNALDESK_INTEGRATION_ENV.SMTP_PASS) &&
        env(SIGNALDESK_INTEGRATION_ENV.EMAIL_FROM) &&
        env(SIGNALDESK_INTEGRATION_ENV.PHYSICAL_ADDRESS) &&
        env(SIGNALDESK_INTEGRATION_ENV.UNSUBSCRIBE_URL),
    );
    const metaToken = env(SIGNALDESK_INTEGRATION_ENV.META_ACCESS_TOKEN);
    return {
        email: {
            configured: smtpReady,
            missing: [
                ["smtp host", env(SIGNALDESK_INTEGRATION_ENV.SMTP_HOST)],
                ["smtp user", env(SIGNALDESK_INTEGRATION_ENV.SMTP_USER)],
                ["smtp password", env(SIGNALDESK_INTEGRATION_ENV.SMTP_PASS)],
                ["email from", env(SIGNALDESK_INTEGRATION_ENV.EMAIL_FROM)],
                ["physical address", env(SIGNALDESK_INTEGRATION_ENV.PHYSICAL_ADDRESS)],
                ["unsubscribe url", env(SIGNALDESK_INTEGRATION_ENV.UNSUBSCRIBE_URL)],
            ].filter(([, value]) => !value).map(([label]) => label),
        },
        whatsapp: {
            configured: Boolean(metaToken && env(SIGNALDESK_INTEGRATION_ENV.WHATSAPP_PHONE_NUMBER_ID)),
            missing: [
                ["meta token", metaToken],
                ["whatsapp phone number id", env(SIGNALDESK_INTEGRATION_ENV.WHATSAPP_PHONE_NUMBER_ID)],
            ].filter(([, value]) => !value).map(([label]) => label),
        },
        instagram: {
            configured: Boolean(metaToken && env(SIGNALDESK_INTEGRATION_ENV.INSTAGRAM_PAGE_ID)),
            missing: [
                ["meta token", metaToken],
                ["instagram page id", env(SIGNALDESK_INTEGRATION_ENV.INSTAGRAM_PAGE_ID)],
            ].filter(([, value]) => !value).map(([label]) => label),
        },
        messenger: {
            configured: Boolean(metaToken && env(SIGNALDESK_INTEGRATION_ENV.MESSENGER_PAGE_ID)),
            missing: [
                ["meta token", metaToken],
                ["messenger page id", env(SIGNALDESK_INTEGRATION_ENV.MESSENGER_PAGE_ID)],
            ].filter(([, value]) => !value).map(([label]) => label),
        },
    };
};

const appendEmailComplianceFooter = (body: string) => {
    const unsubscribeUrl = env(SIGNALDESK_INTEGRATION_ENV.UNSUBSCRIBE_URL);
    const physicalAddress = env(SIGNALDESK_INTEGRATION_ENV.PHYSICAL_ADDRESS);
    return `${body}\n\n--\nMenuList\n${physicalAddress}\nUnsubscribe: ${unsubscribeUrl}`;
};

const sendEmail = async (input: ProviderSendInput): Promise<ProviderSendResult> => {
    const readiness = getSignalDeskChannelReadiness().email;
    if (!readiness.configured) throw new Error("Email provider is not configured");

    const port = Number(env(SIGNALDESK_INTEGRATION_ENV.SMTP_PORT) || 587);
    const transporter = nodemailer.createTransport({
        auth: {
            pass: env(SIGNALDESK_INTEGRATION_ENV.SMTP_PASS),
            user: env(SIGNALDESK_INTEGRATION_ENV.SMTP_USER),
        },
        host: env(SIGNALDESK_INTEGRATION_ENV.SMTP_HOST),
        port,
        secure: isTruthy(env(SIGNALDESK_INTEGRATION_ENV.SMTP_SECURE)) || port === 465,
    });

    const info = await transporter.sendMail({
        from: env(SIGNALDESK_INTEGRATION_ENV.EMAIL_FROM),
        replyTo: env(SIGNALDESK_INTEGRATION_ENV.EMAIL_REPLY_TO) || undefined,
        subject: input.subject || "Quick note from MenuList",
        text: appendEmailComplianceFooter(input.body),
        to: input.recipient,
    });

    return {
        provider: "smtp",
        providerMessageId: info.messageId || null,
        status: "sent",
    };
};

const sendMetaMessage = async (input: ProviderSendInput): Promise<ProviderSendResult> => {
    const token = env(SIGNALDESK_INTEGRATION_ENV.META_ACCESS_TOKEN);
    const endpointId = input.channel === "whatsapp"
        ? env(SIGNALDESK_INTEGRATION_ENV.WHATSAPP_PHONE_NUMBER_ID)
        : input.channel === "instagram"
            ? env(SIGNALDESK_INTEGRATION_ENV.INSTAGRAM_PAGE_ID)
            : env(SIGNALDESK_INTEGRATION_ENV.MESSENGER_PAGE_ID);
    if (!token || !endpointId) throw new Error("Meta provider is not configured");

    const endpoint = `https://graph.facebook.com/${SIGNALDESK_META_GRAPH_VERSION}/${endpointId}/messages`;
    const payload = input.channel === "whatsapp"
        ? {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            text: { body: input.body },
            to: input.recipient,
            type: "text",
        }
        : {
            messaging_type: "RESPONSE",
            message: { text: input.body },
            recipient: { id: input.recipient },
        };

    const response = await fetch(endpoint, {
        body: JSON.stringify(payload),
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        method: "POST",
    });
    const responsePayload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Meta provider send failed: ${response.status}`);

    return {
        provider: input.channel === "whatsapp" ? "meta-whatsapp" : `meta-${input.channel}`,
        providerMessageId: responsePayload?.messages?.[0]?.id || responsePayload?.message_id || null,
        status: "sent",
    };
};

export async function sendSignalDeskProviderMessage(input: ProviderSendInput): Promise<ProviderSendResult> {
    if (input.channel === "email") return sendEmail(input);
    if (input.channel === "whatsapp" || input.channel === "instagram" || input.channel === "messenger") {
        return sendMetaMessage(input);
    }
    throw new Error("Channel is manual-only");
}
