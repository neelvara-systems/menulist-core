import type { OwnerNotificationChannelResult } from '../types';
import type {
    WhatsAppOsMessageClass,
    WhatsAppOsProductCode,
    WhatsAppOsWorkflowKind,
} from '@data/shared/whatsappOs';
import { getWhatsAppOsTemplateDefinition } from '@data/shared/whatsappOs';
import { isWhatsAppOsConfigured, sendServerWhatsAppOs } from '@lib/whatsapp-os/provider';

export function isOwnerNotificationWhatsAppConfigured(productCode: 'ML' | 'AL' = 'ML'): boolean {
    return isWhatsAppOsConfigured(productCode);
}

export async function sendOwnerNotificationWhatsApp(params: {
    productCode?: WhatsAppOsProductCode;
    messageClass: WhatsAppOsMessageClass;
    workflow: WhatsAppOsWorkflowKind;
    localDeliveryReference: string;
    ownerDocumentId: string;
    consentGranted?: boolean;
    to: string;
    text: string;
    sessionActive?: boolean;
    templateKey?: string;
    templateName?: string;
    templateLanguage?: string;
    templateParameters?: string[];
}): Promise<OwnerNotificationChannelResult> {
    const templateDefinition = params.templateKey
        ? getWhatsAppOsTemplateDefinition(params.templateKey)
        : undefined;
    const useSession = params.sessionActive === true;
    const result = await sendServerWhatsAppOs({
        productCode: params.productCode || 'ML',
        messageClass: params.messageClass,
        localDeliveryReference: params.localDeliveryReference,
        ownerReference: {
            workflow: params.workflow,
            documentId: params.ownerDocumentId,
        },
        to: params.to,
        consentGranted: params.consentGranted,
        ...(!useSession && templateDefinition
            ? {
                template: {
                    registryKey: params.templateKey,
                    name: templateDefinition.metaName,
                    language: templateDefinition.language,
                    parameters: [params.text],
                },
            }
            : !useSession && params.templateName
                ? {
                    template: {
                        name: params.templateName,
                        language: params.templateLanguage || 'en',
                        parameters: params.templateParameters,
                    },
                }
            : {
                session: {
                    active: useSession,
                    text: params.text,
                },
            }),
    });

    if (result.accepted) {
        return {
            ok: true,
            providerMessageId: result.providerMessageId,
            ambiguous: result.ambiguous,
        };
    }
    return {
        ok: false,
        error: result.errorCode || 'whatsapp_os_send_failed',
        ambiguous: result.ambiguous,
    };
}
