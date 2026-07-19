import { SIGNALDESK_INTEGRATION_ENV, SIGNALDESK_META_GRAPH_VERSION } from "@constant/signaldesk/integrations";
import nodemailer from "@lib/email/nodemailerRuntime";
import { logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";
import type { SignalDeskOutboundChannel } from "@type/signaldesk";

type ProviderSendInput = {
    body: string;
    channel: SignalDeskOutboundChannel;
    recipient: string;
    senderDomain?: string | null;
    subject?: string | null;
};

export type ProviderSendResult = {
    provider: "smtp" | "meta-whatsapp" | "meta-instagram" | "meta-messenger";
    providerMessageId: string;
    status: "sent";
};

type ProviderRecipientChannel = Exclude<SignalDeskOutboundChannel, "manual">;
type MetaProviderChannel = Extract<ProviderRecipientChannel, "whatsapp" | "instagram" | "messenger">;
type MetaProviderSendInput = Omit<ProviderSendInput, "channel"> & { channel: MetaProviderChannel };

const env = (key: string) => process.env[key]?.trim() || "";
const SIGNALDESK_META_RESPONSE_JSON_MAX_BYTES = 64 * 1024;
const SIGNALDESK_META_RESPONSE_PARSE_FAILED = "signaldesk_meta_response_parse_failed";
const SIGNALDESK_META_REQUEST_TIMEOUT_MS = 15_000;
const SIGNALDESK_SMTP_CONNECTION_TIMEOUT_MS = 10_000;
const SIGNALDESK_SMTP_GREETING_TIMEOUT_MS = 10_000;
const SIGNALDESK_SMTP_SOCKET_TIMEOUT_MS = 20_000;
const SIGNALDESK_EMAIL_PHYSICAL_ADDRESS_MAX_LENGTH = 500;
const SIGNALDESK_EMAIL_UNSUBSCRIBE_URL_MAX_LENGTH = 500;
const SIGNALDESK_META_MESSAGE_ID_MAX_LENGTH = 512;
const SIGNALDESK_SMTP_MESSAGE_ID_MAX_LENGTH = 998;
const SIGNALDESK_SMTP_RESPONSE_MAX_LENGTH = 2_048;

const isTruthy = (value: string) => /^(1|true|yes)$/i.test(value);
const isBooleanEnvValue = (value: string) => /^(0|1|false|no|true|yes)$/i.test(value);

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

const isValidEmailDomain = (value: string) => {
    if (!value || value.length > 253 || !value.includes(".")) return false;
    return value.split(".").every((label) => (
        label.length >= 1
        && label.length <= 63
        && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)
    ));
};

const canonicalizeEmailMailbox = (value: string) => {
    if (/[\0\r\n,;<>]/.test(value)) return "";
    const mailbox = value.trim();
    if (!mailbox || mailbox.length > 254 || /\s/.test(mailbox)) return "";
    const match = mailbox.match(/^([^@]+)@([^@]+)$/);
    const localPart = match?.[1] || "";
    const domain = match?.[2]?.toLowerCase() || "";
    if (
        !localPart
        || localPart.length > 64
        || localPart.startsWith(".")
        || localPart.endsWith(".")
        || localPart.includes("..")
        || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(localPart)
        || !isValidEmailDomain(domain)
    ) return "";
    return `${localPart}@${domain}`;
};

export const canonicalizeSignalDeskProviderRecipient = (
    channel: SignalDeskOutboundChannel,
    value: string,
): string => {
    if (typeof value !== "string" || /[\0\r\n]/.test(value)) {
        throw new Error("PROVIDER_RECIPIENT_INVALID");
    }
    const recipient = value.trim();
    if (channel === "email") {
        const mailbox = canonicalizeEmailMailbox(recipient);
        if (!mailbox) throw new Error("EMAIL_RECIPIENT_INVALID");
        return mailbox;
    }
    if (channel === "whatsapp") {
        if (!/^\+?[1-9][0-9]{7,14}$/.test(recipient)) {
            throw new Error("WHATSAPP_RECIPIENT_INVALID");
        }
        return recipient.replace(/^\+/, "");
    }
    if (channel === "instagram" || channel === "messenger") {
        if (!/^[1-9][0-9]{0,63}$/.test(recipient)) {
            throw new Error(`${channel.toUpperCase()}_PROVIDER_SCOPED_RECIPIENT_INVALID`);
        }
        return recipient;
    }
    throw new Error("Channel is manual-only");
};

const emailAddressDomain = (value: string) => {
    const trimmed = value.trim();
    const namedMailbox = trimmed.match(/^[^<>\r\n]{1,120}<([^<>\s]+)>$/)?.[1]?.trim();
    const mailbox = namedMailbox || (!/[<>]/.test(trimmed) ? trimmed : "");
    const match = mailbox.match(/^([^@\s<>]+)@([^@\s<>]+)$/);
    const localPart = match?.[1] || "";
    const domain = match?.[2]?.toLowerCase().replace(/\.$/, "") || "";
    if (
        !localPart
        || localPart.length > 64
        || localPart.startsWith(".")
        || localPart.endsWith(".")
        || localPart.includes("..")
        || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(localPart)
        || !isValidEmailDomain(domain)
    ) return "";
    return domain;
};

const isValidHttpUrl = (value: string) => {
    if (!value || value.length > SIGNALDESK_EMAIL_UNSUBSCRIBE_URL_MAX_LENGTH) return false;
    try {
        const parsed = new URL(value);
        return (parsed.protocol === "http:" || parsed.protocol === "https:")
            && Boolean(parsed.hostname)
            && !parsed.username
            && !parsed.password;
    } catch {
        return false;
    }
};

export const assertSignalDeskEmailSenderDomainAuthority = (senderDomain?: string | null) => {
    const readiness = getSignalDeskChannelReadiness().email;
    if (!readiness.configured) throw new Error("Email provider is not configured");

    const from = env(SIGNALDESK_INTEGRATION_ENV.EMAIL_FROM);
    const configuredSenderDomain = emailAddressDomain(from);
    if (!configuredSenderDomain) throw new Error("EMAIL_SENDER_FROM_INVALID");
    const replyTo = env(SIGNALDESK_INTEGRATION_ENV.EMAIL_REPLY_TO);
    if (replyTo && !emailAddressDomain(replyTo)) throw new Error("EMAIL_REPLY_TO_INVALID");

    const approvedSenderDomain = senderDomain?.trim().toLowerCase().replace(/\.$/, "") || "";
    if (!approvedSenderDomain) throw new Error("EMAIL_SENDER_DOMAIN_AUTHORITY_REQUIRED");
    if (!isValidEmailDomain(approvedSenderDomain) || configuredSenderDomain !== approvedSenderDomain) {
        throw new Error("EMAIL_SENDER_DOMAIN_AUTHORITY_MISMATCH");
    }

    const rawPort = env(SIGNALDESK_INTEGRATION_ENV.SMTP_PORT);
    const port = rawPort ? Number(rawPort) : 587;
    if (!Number.isFinite(port) || !Number.isInteger(port) || port < 1 || port > 65_535) {
        throw new Error("EMAIL_SMTP_PORT_INVALID");
    }
    const rawSecure = env(SIGNALDESK_INTEGRATION_ENV.SMTP_SECURE);
    if (rawSecure && !isBooleanEnvValue(rawSecure)) throw new Error("EMAIL_SMTP_SECURE_INVALID");
    const secure = isTruthy(rawSecure) || port === 465;

    const unsubscribeUrl = env(SIGNALDESK_INTEGRATION_ENV.UNSUBSCRIBE_URL);
    if (!isValidHttpUrl(unsubscribeUrl)) throw new Error("EMAIL_UNSUBSCRIBE_URL_INVALID");

    const physicalAddress = env(SIGNALDESK_INTEGRATION_ENV.PHYSICAL_ADDRESS);
    if (!physicalAddress || physicalAddress.length > SIGNALDESK_EMAIL_PHYSICAL_ADDRESS_MAX_LENGTH) {
        throw new Error("EMAIL_PHYSICAL_ADDRESS_INVALID");
    }

    return { from, physicalAddress, port, replyTo, secure, unsubscribeUrl };
};

const assertRecipientArray = (value: unknown, field: string): string[] => {
    if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
        throw new Error(`SMTP_${field}_AMBIGUOUS`);
    }
    return value;
};

const assertOptionalEmptyRecipientArray = (value: unknown, field: string) => {
    if (value === undefined) return;
    const recipients = assertRecipientArray(value, field);
    if (recipients.length > 0) throw new Error(`SMTP_${field}_NOT_EMPTY`);
};

const readBoundedProviderId = (value: unknown, maxLength: number, errorCode: string) => {
    if (
        typeof value !== "string"
        || value.length < 1
        || value.length > maxLength
        || value !== value.trim()
        || !/^[\x21-\x7e]+$/.test(value)
    ) throw new Error(errorCode);
    return value;
};

export const assertSignalDeskProviderSendResult = (value: unknown): ProviderSendResult => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("PROVIDER_SEND_RESULT_INVALID");
    }
    const result = value as Record<string, unknown>;
    if (
        result.provider !== "smtp"
        && result.provider !== "meta-whatsapp"
        && result.provider !== "meta-instagram"
        && result.provider !== "meta-messenger"
    ) throw new Error("PROVIDER_SEND_RESULT_PROVIDER_INVALID");
    if (result.status !== "sent") throw new Error("PROVIDER_SEND_RESULT_STATUS_INVALID");
    const providerMessageId = readBoundedProviderId(
        result.providerMessageId,
        result.provider === "smtp"
            ? SIGNALDESK_SMTP_MESSAGE_ID_MAX_LENGTH
            : SIGNALDESK_META_MESSAGE_ID_MAX_LENGTH,
        "PROVIDER_SEND_RESULT_MESSAGE_ID_INVALID",
    );
    return {
        provider: result.provider,
        providerMessageId,
        status: "sent",
    };
};

export const assertSignalDeskSmtpSendAcknowledgement = (
    value: unknown,
    expectedRecipient: string,
): string => {
    const recipient = canonicalizeSignalDeskProviderRecipient("email", expectedRecipient);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("SMTP_SEND_ACKNOWLEDGEMENT_INVALID");
    }
    const acknowledgement = value as Record<string, unknown>;
    const envelope = acknowledgement.envelope;
    if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
        throw new Error("SMTP_ENVELOPE_AMBIGUOUS");
    }
    const envelopeRecipients = assertRecipientArray((envelope as Record<string, unknown>).to, "ENVELOPE");
    if (
        envelopeRecipients.length !== 1
        || canonicalizeSignalDeskProviderRecipient("email", envelopeRecipients[0]) !== recipient
    ) throw new Error("SMTP_ENVELOPE_RECIPIENT_MISMATCH");

    const acceptedRecipients = assertRecipientArray(acknowledgement.accepted, "ACCEPTED");
    if (
        acceptedRecipients.length !== 1
        || canonicalizeSignalDeskProviderRecipient("email", acceptedRecipients[0]) !== recipient
    ) throw new Error("SMTP_ACCEPTED_RECIPIENT_MISMATCH");
    const rejectedRecipients = assertRecipientArray(acknowledgement.rejected, "REJECTED");
    if (rejectedRecipients.length > 0) throw new Error("SMTP_REJECTED_NOT_EMPTY");
    assertOptionalEmptyRecipientArray(acknowledgement.pending, "PENDING");

    const response = acknowledgement.response;
    if (
        typeof response !== "string"
        || response.length < 3
        || response.length > SIGNALDESK_SMTP_RESPONSE_MAX_LENGTH
        || !/^2[0-9]{2}(?: [\x20-\x7e]*)?$/.test(response)
    ) throw new Error("SMTP_FINAL_RESPONSE_UNRESOLVED");

    return readBoundedProviderId(
        acknowledgement.messageId,
        SIGNALDESK_SMTP_MESSAGE_ID_MAX_LENGTH,
        "SMTP_MESSAGE_ID_UNRESOLVED",
    );
};

const sendEmail = async (input: ProviderSendInput): Promise<ProviderSendResult> => {
    const { port, replyTo, secure } = assertSignalDeskEmailSenderDomainAuthority(input.senderDomain);
    const transporter = nodemailer.createTransport({
        auth: {
            pass: env(SIGNALDESK_INTEGRATION_ENV.SMTP_PASS),
            user: env(SIGNALDESK_INTEGRATION_ENV.SMTP_USER),
        },
        connectionTimeout: SIGNALDESK_SMTP_CONNECTION_TIMEOUT_MS,
        greetingTimeout: SIGNALDESK_SMTP_GREETING_TIMEOUT_MS,
        host: env(SIGNALDESK_INTEGRATION_ENV.SMTP_HOST),
        port,
        secure,
        socketTimeout: SIGNALDESK_SMTP_SOCKET_TIMEOUT_MS,
    });

    const info = await transporter.sendMail({
        from: env(SIGNALDESK_INTEGRATION_ENV.EMAIL_FROM),
        replyTo: replyTo || undefined,
        subject: input.subject || "Quick note from MenuList",
        text: appendEmailComplianceFooter(input.body),
        to: input.recipient,
    });

    const providerMessageId = assertSignalDeskSmtpSendAcknowledgement(info, input.recipient);
    return {
        provider: "smtp",
        providerMessageId,
        status: "sent",
    };
};

async function readMetaProviderResponseJson(response: Response): Promise<unknown> {
    try {
        return await readJsonResponseWithLimit<unknown>(response, SIGNALDESK_META_RESPONSE_JSON_MAX_BYTES);
    } catch (error) {
        logRuntimeFailure(SIGNALDESK_META_RESPONSE_PARSE_FAILED, error, {
            product: "signaldesk",
            responseStatus: response.status,
        });
        throw error;
    }
}

export const extractSignalDeskMetaProviderMessageId = (
    channel: MetaProviderChannel,
    expectedRecipient: string,
    value: unknown,
): string => {
    const recipient = canonicalizeSignalDeskProviderRecipient(channel, expectedRecipient);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("META_SEND_ACKNOWLEDGEMENT_INVALID");
    }
    const acknowledgement = value as Record<string, unknown>;
    if (channel === "whatsapp") {
        const contacts = acknowledgement.contacts;
        if (
            acknowledgement.messaging_product !== "whatsapp"
            || !Array.isArray(contacts)
            || contacts.length !== 1
        ) throw new Error("META_WHATSAPP_RECIPIENT_ACKNOWLEDGEMENT_INVALID");
        const contact = contacts[0];
        if (
            !contact
            || typeof contact !== "object"
            || Array.isArray(contact)
            || (contact as Record<string, unknown>).input !== recipient
        ) throw new Error("META_WHATSAPP_RECIPIENT_ACKNOWLEDGEMENT_INVALID");

        const messages = acknowledgement.messages;
        if (!Array.isArray(messages) || messages.length !== 1) {
            throw new Error("META_WHATSAPP_SEND_ACKNOWLEDGEMENT_INVALID");
        }
        const message = messages[0];
        if (!message || typeof message !== "object" || Array.isArray(message)) {
            throw new Error("META_WHATSAPP_SEND_ACKNOWLEDGEMENT_INVALID");
        }
        return readBoundedProviderId(
            (message as Record<string, unknown>).id,
            SIGNALDESK_META_MESSAGE_ID_MAX_LENGTH,
            "META_WHATSAPP_MESSAGE_ID_UNRESOLVED",
        );
    }
    if (acknowledgement.recipient_id !== recipient) {
        throw new Error(`META_${channel.toUpperCase()}_RECIPIENT_ACKNOWLEDGEMENT_INVALID`);
    }
    return readBoundedProviderId(
        acknowledgement.message_id,
        SIGNALDESK_META_MESSAGE_ID_MAX_LENGTH,
        `META_${channel.toUpperCase()}_MESSAGE_ID_UNRESOLVED`,
    );
};

const sendMetaMessage = async (input: MetaProviderSendInput): Promise<ProviderSendResult> => {
    const token = env(SIGNALDESK_INTEGRATION_ENV.META_ACCESS_TOKEN);
    const endpointId = input.channel === "whatsapp"
        ? env(SIGNALDESK_INTEGRATION_ENV.WHATSAPP_PHONE_NUMBER_ID)
        : input.channel === "instagram"
            ? env(SIGNALDESK_INTEGRATION_ENV.INSTAGRAM_PAGE_ID)
            : env(SIGNALDESK_INTEGRATION_ENV.MESSENGER_PAGE_ID);
    if (!token || !endpointId) throw new Error("Meta provider is not configured");

    const encodedEndpointId = encodeURIComponent(endpointId);
    const endpoint = `https://graph.facebook.com/${SIGNALDESK_META_GRAPH_VERSION}/${encodedEndpointId}/messages`;
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
        redirect: "manual",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        method: "POST",
        signal: AbortSignal.timeout(SIGNALDESK_META_REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Meta provider send failed: ${response.status}`);
    const responsePayload = await readMetaProviderResponseJson(response);
    const providerMessageId = extractSignalDeskMetaProviderMessageId(
        input.channel,
        input.recipient,
        responsePayload,
    );

    return {
        provider: input.channel === "whatsapp" ? "meta-whatsapp" : `meta-${input.channel}`,
        providerMessageId,
        status: "sent",
    };
};

export async function sendSignalDeskProviderMessage(input: ProviderSendInput): Promise<ProviderSendResult> {
    const recipient = canonicalizeSignalDeskProviderRecipient(input.channel, input.recipient);
    const canonicalInput = { ...input, recipient };
    if (input.channel === "email") {
        return assertSignalDeskProviderSendResult(await sendEmail(canonicalInput));
    }
    if (input.channel === "whatsapp" || input.channel === "instagram" || input.channel === "messenger") {
        return assertSignalDeskProviderSendResult(await sendMetaMessage({
            ...canonicalInput,
            channel: input.channel,
        }));
    }
    throw new Error("Channel is manual-only");
}
