import type { MenuCardDesignAdvisorRequest } from '@lib/validation/apiSchemas';

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

export default function menuCardDesignAdvisorPrompt(payload: MenuCardDesignAdvisorRequest): string {
    return [
        'Recommend one print menu layout recipe from the approved settings.',
        '',
        'Current settings:',
        JSON.stringify(payload.currentSettings),
        '',
        'Menu summary:',
        JSON.stringify(payload.sourceSummary),
        '',
        'Preflight warnings:',
        JSON.stringify(payload.preflightWarnings),
        '',
        `Source hash: ${payload.sourceHash}`,
    ].join('\n');
}
