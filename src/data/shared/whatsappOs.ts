/** Pure cross-runtime WhatsAppOS request and provider-state contract. */

export type WhatsAppOsProductCode = 'ML' | 'AL' | 'CC' | 'SD' | 'MC';
export type WhatsAppOsMessageClass = 'authentication' | 'transactional' | 'operational' | 'conversational';
export type WhatsAppOsWorkflowKind = 'phone_otp' | 'messaging_onboarding' | 'owner_notification' | 'platform_notification';
export type WhatsAppOsProviderStatus = 'accepted' | 'sent' | 'delivered' | 'read' | 'failed';

export const WHATSAPP_OS_GRAPH_API_VERSION = 'v21.0' as const;

export type WhatsAppOsOwnerReference = {
    workflow: WhatsAppOsWorkflowKind;
    documentId: string;
};

export type WhatsAppOsSendRequest = {
    productCode: WhatsAppOsProductCode;
    messageClass: WhatsAppOsMessageClass;
    localDeliveryReference: string;
    ownerReference: WhatsAppOsOwnerReference;
    to: string;
    consentGranted?: boolean;
    template?: {
        registryKey?: string;
        name: string;
        language: string;
        parameters?: readonly string[];
        document?: {
            filename: string;
            contentBase64: string;
            contentType: 'application/pdf';
        };
    };
    session?: {
        active: boolean;
        text: string;
    };
};

export type WhatsAppOsTemplateDefinition = {
    productCode: 'ML' | 'AL';
    metaName: string;
    language: string;
    parameterCount: number;
    headerType?: 'document';
    messageClasses: readonly WhatsAppOsMessageClass[];
    approvalState: 'pending_approval' | 'approved';
    version: 1;
};

/**
 * Lifecycle template manifest. Entries stay fail-closed until the matching
 * product template is approved in Meta and certified during provider onboarding.
 */
export const WHATSAPP_OS_TEMPLATE_REGISTRY: Readonly<Record<string, WhatsAppOsTemplateDefinition>> = {
    'menulist.menu_publish_failed': { productCode: 'ML', metaName: 'menulist_menu_publish_failed_v1', language: 'en_US', parameterCount: 1, messageClasses: ['transactional'], approvalState: 'pending_approval', version: 1 },
    'menulist.payment_failed': { productCode: 'ML', metaName: 'menulist_payment_failed_v1', language: 'en_US', parameterCount: 1, messageClasses: ['transactional'], approvalState: 'pending_approval', version: 1 },
    'menulist.grace_period_started': { productCode: 'ML', metaName: 'menulist_grace_period_started_v1', language: 'en_US', parameterCount: 1, messageClasses: ['transactional'], approvalState: 'pending_approval', version: 1 },
    'menulist.suspension_warning': { productCode: 'ML', metaName: 'menulist_suspension_warning_v1', language: 'en_US', parameterCount: 1, messageClasses: ['transactional'], approvalState: 'pending_approval', version: 1 },
    'menulist.credits_exhausted': { productCode: 'ML', metaName: 'menulist_credits_exhausted_v1', language: 'en_US', parameterCount: 1, messageClasses: ['transactional'], approvalState: 'pending_approval', version: 1 },
    'menulist.billing_document_issued': { productCode: 'ML', metaName: 'menulist_billing_document_issued_v1', language: 'en_US', parameterCount: 1, headerType: 'document', messageClasses: ['transactional'], approvalState: 'pending_approval', version: 1 },
    'answerlattice.support_email_missing': { productCode: 'AL', metaName: 'answerlattice_support_email_missing_v1', language: 'en_US', parameterCount: 1, messageClasses: ['transactional'], approvalState: 'pending_approval', version: 1 },
    'answerlattice.payment_recovered': { productCode: 'AL', metaName: 'answerlattice_payment_recovered_v1', language: 'en_US', parameterCount: 1, messageClasses: ['transactional'], approvalState: 'pending_approval', version: 1 },
    'answerlattice.payment_failed': { productCode: 'AL', metaName: 'answerlattice_payment_failed_v1', language: 'en_US', parameterCount: 1, messageClasses: ['transactional'], approvalState: 'pending_approval', version: 1 },
    'answerlattice.grace_period_started': { productCode: 'AL', metaName: 'answerlattice_grace_period_started_v1', language: 'en_US', parameterCount: 1, messageClasses: ['transactional'], approvalState: 'pending_approval', version: 1 },
    'answerlattice.credits_exhausted': { productCode: 'AL', metaName: 'answerlattice_credits_exhausted_v1', language: 'en_US', parameterCount: 1, messageClasses: ['transactional'], approvalState: 'pending_approval', version: 1 },
    'answerlattice.billing_document_issued': { productCode: 'AL', metaName: 'answerlattice_billing_document_issued_v1', language: 'en_US', parameterCount: 1, headerType: 'document', messageClasses: ['transactional'], approvalState: 'pending_approval', version: 1 },
    'answerlattice.widget_connection_failed': { productCode: 'AL', metaName: 'answerlattice_widget_connection_failed_v1', language: 'en_US', parameterCount: 1, messageClasses: ['transactional'], approvalState: 'pending_approval', version: 1 },
    'answerlattice.source_sync_failed': { productCode: 'AL', metaName: 'answerlattice_source_sync_failed_v1', language: 'en_US', parameterCount: 1, messageClasses: ['transactional'], approvalState: 'pending_approval', version: 1 },
    'answerlattice.high_priority_escalation': { productCode: 'AL', metaName: 'answerlattice_high_priority_escalation_v1', language: 'en_US', parameterCount: 1, messageClasses: ['transactional'], approvalState: 'pending_approval', version: 1 },
};

export function getWhatsAppOsTemplateDefinition(key: string): WhatsAppOsTemplateDefinition | undefined {
    return WHATSAPP_OS_TEMPLATE_REGISTRY[key];
}

export type WhatsAppOsSendResult = {
    accepted: boolean;
    ambiguous: boolean;
    providerMessageId?: string;
    status: WhatsAppOsProviderStatus | 'configuration_rejected' | 'policy_rejected';
    errorCode?: string;
};

export const WHATSAPP_OS_LIMITS = {
    MAX_LOCAL_REFERENCE_LENGTH: 180,
    MAX_OWNER_DOCUMENT_ID_LENGTH: 200,
    MAX_PROVIDER_BODY_BYTES: 64 * 1024,
    MAX_PROVIDER_MESSAGE_ID_LENGTH: 256,
    MAX_DOCUMENT_BYTES: 8 * 1024 * 1024,
    MAX_DOCUMENT_FILENAME_LENGTH: 160,
    MAX_SESSION_TEXT_LENGTH: 4_096,
    MAX_TEMPLATE_LANGUAGE_LENGTH: 32,
    MAX_TEMPLATE_NAME_LENGTH: 128,
    MAX_TEMPLATE_PARAMETER_COUNT: 10,
    MAX_TEMPLATE_PARAMETER_LENGTH: 1_024,
    MAX_WEBHOOK_BODY_BYTES: 256 * 1024,
    PROVIDER_RECORD_RETENTION_DAYS: 90,
} as const;

export const WHATSAPP_OS_PROVIDER_STATUS_PRECEDENCE: Record<WhatsAppOsProviderStatus, number> = {
    accepted: 0,
    sent: 10,
    delivered: 20,
    read: 30,
    failed: 40,
};

const SAFE_REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const TEMPLATE_NAME_PATTERN = /^[a-z0-9_]+$/;
const LANGUAGE_PATTERN = /^[A-Za-z]{2,3}(?:_[A-Za-z]{2})?$/;

export class WhatsAppOsContractError extends Error {
    constructor(readonly code: string) {
        super(code);
        this.name = 'WhatsAppOsContractError';
    }
}

function boundedExactString(value: unknown, maxLength: number, code: string): string {
    if (
        typeof value !== 'string'
        || value.length === 0
        || value.length > maxLength
        || value !== value.trim()
        || /[\u0000-\u001f\u007f]/.test(value)
    ) throw new WhatsAppOsContractError(code);
    return value;
}

export function normalizeWhatsAppOsRecipient(value: unknown): string {
    const input = typeof value === 'string' ? value.trim() : '';
    if (!input || input.length > 40 || !/^\+?[0-9().\s-]+$/.test(input)) {
        throw new WhatsAppOsContractError('WHATSAPP_OS_RECIPIENT_INVALID');
    }
    const digits = input.replace(/\D/g, '');
    if (!/^\d{10,15}$/.test(digits)) throw new WhatsAppOsContractError('WHATSAPP_OS_RECIPIENT_INVALID');
    return digits;
}

export function assertWhatsAppOsSendRequest(value: WhatsAppOsSendRequest): WhatsAppOsSendRequest {
    if (value.productCode !== 'ML' && value.productCode !== 'AL') {
        throw new WhatsAppOsContractError('WHATSAPP_OS_PRODUCT_SEND_PROHIBITED');
    }
    if (!['authentication', 'transactional', 'operational', 'conversational'].includes(value.messageClass)) {
        throw new WhatsAppOsContractError('WHATSAPP_OS_MESSAGE_CLASS_INVALID');
    }
    if (!['phone_otp', 'messaging_onboarding', 'owner_notification', 'platform_notification'].includes(value.ownerReference?.workflow)) {
        throw new WhatsAppOsContractError('WHATSAPP_OS_WORKFLOW_INVALID');
    }
    if (
        (value.ownerReference.workflow === 'phone_otp' && value.messageClass !== 'authentication')
        || (value.ownerReference.workflow === 'owner_notification' && value.messageClass !== 'transactional' && value.messageClass !== 'operational')
        || (value.ownerReference.workflow === 'platform_notification' && value.messageClass !== 'operational')
        || (value.ownerReference.workflow === 'messaging_onboarding' && value.messageClass !== 'conversational')
    ) throw new WhatsAppOsContractError('WHATSAPP_OS_WORKFLOW_CLASS_MISMATCH');
    const localDeliveryReference = boundedExactString(
        value.localDeliveryReference,
        WHATSAPP_OS_LIMITS.MAX_LOCAL_REFERENCE_LENGTH,
        'WHATSAPP_OS_LOCAL_REFERENCE_INVALID',
    );
    if (!SAFE_REFERENCE_PATTERN.test(localDeliveryReference)) {
        throw new WhatsAppOsContractError('WHATSAPP_OS_LOCAL_REFERENCE_INVALID');
    }
    const documentId = boundedExactString(
        value.ownerReference?.documentId,
        WHATSAPP_OS_LIMITS.MAX_OWNER_DOCUMENT_ID_LENGTH,
        'WHATSAPP_OS_OWNER_REFERENCE_INVALID',
    );
    if (!SAFE_REFERENCE_PATTERN.test(documentId)) {
        throw new WhatsAppOsContractError('WHATSAPP_OS_OWNER_REFERENCE_INVALID');
    }
    const to = normalizeWhatsAppOsRecipient(value.to);
    const hasTemplate = Boolean(value.template);
    const hasSession = value.session?.active === true;
    if (hasTemplate === hasSession) throw new WhatsAppOsContractError('WHATSAPP_OS_TEMPLATE_OR_SESSION_REQUIRED');

    if (
        (value.messageClass === 'transactional' || value.messageClass === 'operational')
        && value.consentGranted !== true
    ) throw new WhatsAppOsContractError('WHATSAPP_OS_CONSENT_REQUIRED');

    let template = value.template;
    if (template) {
        const registryKey = template.registryKey
            ? boundedExactString(template.registryKey, 160, 'WHATSAPP_OS_TEMPLATE_KEY_INVALID')
            : undefined;
        const name = boundedExactString(
            template.name,
            WHATSAPP_OS_LIMITS.MAX_TEMPLATE_NAME_LENGTH,
            'WHATSAPP_OS_TEMPLATE_INVALID',
        );
        const language = boundedExactString(
            template.language,
            WHATSAPP_OS_LIMITS.MAX_TEMPLATE_LANGUAGE_LENGTH,
            'WHATSAPP_OS_TEMPLATE_LANGUAGE_INVALID',
        );
        if (!TEMPLATE_NAME_PATTERN.test(name) || !LANGUAGE_PATTERN.test(language)) {
            throw new WhatsAppOsContractError('WHATSAPP_OS_TEMPLATE_INVALID');
        }
        const parameters = Array.from(template.parameters || []);
        if (parameters.length > WHATSAPP_OS_LIMITS.MAX_TEMPLATE_PARAMETER_COUNT) {
            throw new WhatsAppOsContractError('WHATSAPP_OS_TEMPLATE_PARAMETERS_INVALID');
        }
        parameters.forEach((parameter) => boundedExactString(
            parameter,
            WHATSAPP_OS_LIMITS.MAX_TEMPLATE_PARAMETER_LENGTH,
            'WHATSAPP_OS_TEMPLATE_PARAMETERS_INVALID',
        ));
        if (value.messageClass === 'transactional' || value.messageClass === 'operational') {
            const definition = registryKey ? getWhatsAppOsTemplateDefinition(registryKey) : undefined;
            if (!definition) throw new WhatsAppOsContractError('WHATSAPP_OS_TEMPLATE_NOT_REGISTERED');
            if (definition.approvalState !== 'approved') throw new WhatsAppOsContractError('WHATSAPP_OS_TEMPLATE_NOT_APPROVED');
            if (
                definition.productCode !== value.productCode
                || definition.metaName !== name
                || definition.language !== language
                || definition.parameterCount !== parameters.length
                || definition.headerType !== (template.document ? 'document' : undefined)
                || !definition.messageClasses.includes(value.messageClass)
            ) throw new WhatsAppOsContractError('WHATSAPP_OS_TEMPLATE_POLICY_MISMATCH');
        }
        const document = template.document;
        if (document && (
            document.contentType !== 'application/pdf'
            || typeof document.filename !== 'string'
            || document.filename.length < 5
            || document.filename.length > WHATSAPP_OS_LIMITS.MAX_DOCUMENT_FILENAME_LENGTH
            || !/^[A-Za-z0-9][A-Za-z0-9._-]*\.pdf$/.test(document.filename)
            || typeof document.contentBase64 !== 'string'
            || document.contentBase64.length === 0
            || document.contentBase64.length % 4 !== 0
            || document.contentBase64.length > Math.ceil(WHATSAPP_OS_LIMITS.MAX_DOCUMENT_BYTES / 3) * 4
            || !document.contentBase64.startsWith('JVBERi0')
            || !/^[A-Za-z0-9+/]+={0,2}$/.test(document.contentBase64)
            || Math.floor((document.contentBase64.length * 3) / 4)
                - (document.contentBase64.endsWith('==') ? 2 : document.contentBase64.endsWith('=') ? 1 : 0)
                > WHATSAPP_OS_LIMITS.MAX_DOCUMENT_BYTES
        )) throw new WhatsAppOsContractError('WHATSAPP_OS_DOCUMENT_INVALID');
        template = {
            ...(registryKey ? { registryKey } : {}),
            name,
            language,
            ...(parameters.length ? { parameters } : {}),
            ...(document ? { document } : {}),
        };
    }

    let session = value.session;
    if (session?.active) {
        session = {
            active: true,
            text: boundedExactString(
                session.text,
                WHATSAPP_OS_LIMITS.MAX_SESSION_TEXT_LENGTH,
                'WHATSAPP_OS_SESSION_TEXT_INVALID',
            ),
        };
    }

    return { ...value, localDeliveryReference, ownerReference: { ...value.ownerReference, documentId }, to, template, session };
}

export function shouldAdvanceWhatsAppOsProviderStatus(
    current: WhatsAppOsProviderStatus,
    next: WhatsAppOsProviderStatus,
    currentOccurredAtMillis = 0,
    nextOccurredAtMillis = 0,
): boolean {
    const currentRank = WHATSAPP_OS_PROVIDER_STATUS_PRECEDENCE[current];
    const nextRank = WHATSAPP_OS_PROVIDER_STATUS_PRECEDENCE[next];
    if (nextRank > currentRank) return true;
    return nextRank === currentRank && nextOccurredAtMillis > currentOccurredAtMillis;
}
