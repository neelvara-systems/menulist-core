import * as crypto from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import { FUNCTION_FLAGS } from '../constants/features';
import { firestoreAdmin } from '../firebaseAdmin';
import {
  WHATSAPP_OS_GRAPH_API_VERSION,
  WHATSAPP_OS_LIMITS,
  type WhatsAppOsSendRequest,
  type WhatsAppOsSendResult,
  assertWhatsAppOsSendRequest,
} from '../sharedData/whatsappOs';
import { readJsonResponseWithLimit } from '../utils/boundedResponseBody';

const PROVIDER_TIMEOUT_MS = 15_000;

const sha256 = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');

function resolveConfig(productCode: 'ML' | 'AL') {
  if (productCode === 'AL') {
    return {
      phoneNumberId: process.env.ANSWERLATTICE_WHATSAPP_PHONE_NUMBER_ID?.trim(),
      accessToken: process.env.ANSWERLATTICE_WHATSAPP_ACCESS_TOKEN?.trim(),
    };
  }
  return {
    phoneNumberId: process.env.MENULIST_WHATSAPP_PHONE_NUMBER_ID?.trim()
      || process.env.WHATSAPP_PHONE_NUMBER_ID?.trim(),
    accessToken: process.env.MENULIST_WHATSAPP_ACCESS_TOKEN?.trim()
      || process.env.WHATSAPP_ACCESS_TOKEN?.trim(),
  };
}

function getProviderMessageId(value: unknown): string | undefined {
  const candidate = (value as { messages?: Array<{ id?: unknown }> } | null)?.messages?.[0]?.id;
  if (typeof candidate !== 'string') return undefined;
  const normalized = candidate.trim();
  return normalized
    && normalized.length <= WHATSAPP_OS_LIMITS.MAX_PROVIDER_MESSAGE_ID_LENGTH
    && !/[\u0000-\u001f\u007f]/.test(normalized)
    ? normalized
    : undefined;
}

export type WhatsAppOsProviderPostResult = {
  ok: boolean;
  status?: number;
  providerMessageId?: string;
  ambiguous: boolean;
};

export async function postWhatsAppOsProviderBody(params: {
  body: Record<string, unknown>;
  productCode?: 'ML' | 'AL';
}): Promise<WhatsAppOsProviderPostResult> {
  const productCode = params.productCode || 'ML';
  const config = resolveConfig(productCode);
  if (!FUNCTION_FLAGS.ENABLE_WHATSAPP_OS || !config.phoneNumberId || !config.accessToken) {
    return { ok: false, ambiguous: false };
  }
  try {
    const response = await fetch(
      `https://graph.facebook.com/${WHATSAPP_OS_GRAPH_API_VERSION}/${encodeURIComponent(config.phoneNumberId)}/messages`,
      {
        method: 'POST',
        redirect: 'manual',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params.body),
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      },
    );
    if (!response.ok) return { ok: false, ambiguous: false, status: response.status };
    const parsed = await readJsonResponseWithLimit(response, WHATSAPP_OS_LIMITS.MAX_PROVIDER_BODY_BYTES);
    return {
      ok: true,
      ambiguous: false,
      status: response.status,
      providerMessageId: getProviderMessageId(parsed),
    };
  } catch {
    return { ok: false, ambiguous: true };
  }
}

function buildProviderBody(request: WhatsAppOsSendRequest): Record<string, unknown> {
  if (request.template) {
    return {
      messaging_product: 'whatsapp',
      to: request.to,
      type: 'template',
      template: {
        name: request.template.name,
        language: { code: request.template.language },
        ...(request.template.parameters?.length ? {
          components: [{
            type: 'body',
            parameters: request.template.parameters.map((text) => ({ type: 'text', text })),
          }],
        } : {}),
      },
    };
  }
  return {
    messaging_product: 'whatsapp',
    to: request.to,
    type: 'text',
    text: { body: request.session?.text || '' },
  };
}

async function persistReference(request: WhatsAppOsSendRequest, providerMessageId: string): Promise<void> {
  const id = sha256(providerMessageId);
  const now = Timestamp.now();
  const ref = firestoreAdmin.collection(DB_COLLECTIONS.WHATSAPP_OS_MESSAGE_REFS).doc(id);
  await firestoreAdmin.runTransaction(async (transaction) => {
    const current = await transaction.get(ref);
    if (current.exists) {
      if (current.get('unresolved') === true && !current.get('ownerDocumentId')) {
        const providerStatus = current.get('providerStatus');
        const statusOccurredAt = current.get('statusOccurredAt');
        transaction.set(ref, {
          productCode: request.productCode,
          workflow: request.ownerReference.workflow,
          ownerDocumentId: request.ownerReference.documentId,
          localDeliveryReference: request.localDeliveryReference,
          unresolved: false,
          updatedAt: now,
        }, { merge: true });
        if (
          (providerStatus === 'sent' || providerStatus === 'delivered' || providerStatus === 'read' || providerStatus === 'failed')
          && statusOccurredAt instanceof Timestamp
          && request.ownerReference.workflow === 'owner_notification'
        ) {
          transaction.set(
            firestoreAdmin.collection(DB_COLLECTIONS.OWNER_NOTIFICATION_DELIVERIES).doc(request.ownerReference.documentId),
            { providerStatus, providerStatusAt: statusOccurredAt },
            { merge: true },
          );
        }
        return;
      }
      if (
        current.get('productCode') !== request.productCode
        || current.get('workflow') !== request.ownerReference.workflow
        || current.get('ownerDocumentId') !== request.ownerReference.documentId
        || current.get('localDeliveryReference') !== request.localDeliveryReference
      ) throw new Error('WHATSAPP_OS_PROVIDER_REFERENCE_COLLISION');
      return;
    }
    transaction.create(ref, {
      productCode: request.productCode,
      workflow: request.ownerReference.workflow,
      ownerDocumentId: request.ownerReference.documentId,
      localDeliveryReference: request.localDeliveryReference,
      providerMessageIdHash: id,
      providerStatus: 'accepted',
      statusOccurredAt: now,
      createdAt: now,
      updatedAt: now,
      expiresAt: Timestamp.fromMillis(
        now.toMillis() + WHATSAPP_OS_LIMITS.PROVIDER_RECORD_RETENTION_DAYS * 86_400_000,
      ),
    });
  });
}

export async function sendFunctionsWhatsAppOs(input: WhatsAppOsSendRequest): Promise<WhatsAppOsSendResult> {
  let request: WhatsAppOsSendRequest;
  try {
    request = assertWhatsAppOsSendRequest(input);
  } catch (error) {
    return {
      accepted: false,
      ambiguous: false,
      status: 'policy_rejected',
      errorCode: error instanceof Error ? error.message : 'WHATSAPP_OS_REQUEST_REJECTED',
    };
  }
  const result = await postWhatsAppOsProviderBody({
    productCode: request.productCode === 'AL' ? 'AL' : 'ML',
    body: buildProviderBody(request),
  });
  if (!result.ok) {
    return {
      accepted: false,
      ambiguous: result.ambiguous,
      status: 'failed',
      errorCode: result.ambiguous ? 'WHATSAPP_OS_PROVIDER_OUTCOME_UNKNOWN' : 'WHATSAPP_OS_PROVIDER_REJECTED',
    };
  }
  if (result.providerMessageId) {
    try {
      await persistReference(request, result.providerMessageId);
    } catch {
      return {
        accepted: true,
        ambiguous: true,
        providerMessageId: result.providerMessageId,
        status: 'accepted',
        errorCode: 'WHATSAPP_OS_PROVIDER_REFERENCE_PERSIST_UNKNOWN',
      };
    }
  }
  return {
    accepted: true,
    ambiguous: !result.providerMessageId,
    providerMessageId: result.providerMessageId,
    status: 'accepted',
    ...(!result.providerMessageId ? { errorCode: 'WHATSAPP_OS_PROVIDER_ID_MISSING' } : {}),
  };
}
