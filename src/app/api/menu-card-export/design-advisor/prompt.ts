import type { MenuCardDesignAdvisorRequest } from '@lib/validation/apiSchemas';

const PROMPT_INPUT_TEXT_MAX_LENGTH = 300;
const PROMPT_INPUT_LIST_ITEM_MAX_LENGTH = 120;
const PROMPT_INPUT_LIST_MAX_ITEMS = 20;

export const menuCardDesignAdvisorSystemInstruction = `You recommend safe print menu settings for a non-technical SMB owner.

Return JSON only. Do not return markdown.

Allowed values:
- preset: home_print, whatsapp, print_shop_packet, table_menu
- styleId: classic, compact, premium
- density: comfortable, balanced, compact

Rules:
- Recommend only the allowed values.
- Never rewrite menu item names, prices, descriptions, QR text, or business details.
- Never invent categories or menu content.
- Keep ownerNote and reason short, plain, and action-oriented.
- Treat autoDesignLabel and autoDesignReason as the deterministic baseline. Only change it when the content shape or warnings justify a safer choice.
- Respect businessProfile: use menu logic for food, service-list logic for services/professional/wellness, and catalog logic for products/retail.
- If the menu is long or has many warnings, prefer compact density.
- If descriptions are sparse, set includeDescriptions false.
- Keep includeQr true unless there is a QR warning.
- Return all keys in this exact shape:
{
  "preset": "home_print",
  "styleId": "classic",
  "density": "balanced",
  "includeDescriptions": true,
  "includeQr": true,
  "includeContactBlock": true,
  "ownerNote": "Short owner-facing note.",
  "reason": "Why this is the safest layout choice.",
  "warnings": []
}`;

function sanitizePromptText(
    value: unknown,
    fallback = 'Not provided',
    maxLength = PROMPT_INPUT_TEXT_MAX_LENGTH,
) {
    if (typeof value !== 'string') return fallback;

    const normalized = value
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/[{}<>`$\\]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength)
        .trim();

    return normalized || fallback;
}

function optionalPromptText(value: unknown, maxLength = PROMPT_INPUT_TEXT_MAX_LENGTH) {
    const normalized = sanitizePromptText(value, '', maxLength);
    return normalized || undefined;
}

function sanitizePromptList(items?: string[]) {
    const values = (items || [])
        .slice(0, PROMPT_INPUT_LIST_MAX_ITEMS)
        .map((item) => sanitizePromptText(item, '', PROMPT_INPUT_LIST_ITEM_MAX_LENGTH))
        .filter(Boolean);

    return values.length > 0 ? values : undefined;
}

function buildPromptPayload(payload: MenuCardDesignAdvisorRequest) {
    return {
        currentSettings: payload.currentSettings,
        preflightWarnings: payload.preflightWarnings
            .slice(0, PROMPT_INPUT_LIST_MAX_ITEMS)
            .map((warning) => ({
                code: sanitizePromptText(warning.code, 'warning', 80),
                message: sanitizePromptText(warning.message, 'Review print settings.', 180),
                severity: warning.severity,
            })),
        sourceHash: sanitizePromptText(payload.sourceHash, 'unknown', 160),
        sourceSummary: {
            ...payload.sourceSummary,
            autoDesignLabel: optionalPromptText(payload.sourceSummary.autoDesignLabel, 80),
            autoDesignReason: optionalPromptText(payload.sourceSummary.autoDesignReason, 220),
            businessCategory: optionalPromptText(payload.sourceSummary.businessCategory, 80),
            businessName: sanitizePromptText(payload.sourceSummary.businessName, 'Not provided', 120),
            businessProfile: optionalPromptText(payload.sourceSummary.businessProfile, 80),
            categoryNames: sanitizePromptList(payload.sourceSummary.categoryNames),
            menuTitle: sanitizePromptText(payload.sourceSummary.menuTitle, 'Not provided', 120),
        },
    };
}

export default function menuCardDesignAdvisorPrompt(payload: MenuCardDesignAdvisorRequest): string {
    const promptPayload = buildPromptPayload(payload);

    return [
        'Recommend one print menu layout recipe from the approved settings.',
        '',
        'Current settings:',
        JSON.stringify(promptPayload.currentSettings),
        '',
        'Menu summary:',
        JSON.stringify(promptPayload.sourceSummary),
        '',
        'Preflight warnings:',
        JSON.stringify(promptPayload.preflightWarnings),
        '',
        `Source hash: ${promptPayload.sourceHash}`,
    ].join('\n');
}
