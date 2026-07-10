import type {
    AiMenuManagerCommandContextSelection,
    AiMenuManagerProjectPatch,
} from '@type/aiMenuManager';
import {
    resolveAiMenuManagerCommand,
    type AiMenuManagerResolvedCommand,
} from './commandResolver';
import type { AiMenuManagerContextPacket } from './contextPacket';

const MAX_COMPOUND_CONNECTORS = 5;
const MAX_COMPOUND_OPERATIONS = 4;
const COMPOUND_CONNECTOR_PATTERN = /\s+(and|also|then)\s+|\s*;\s*/gi;

type ResolvedCompoundPart = {
    card: ReturnType<typeof resolveAiMenuManagerCommand>['card'];
    resolved: AiMenuManagerResolvedCommand;
    text: string;
};

function normalizePart(value: string) {
    return value
        .replace(/^\s*(?:yes|please|also|then)\s+/i, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function splitAtConnectors(text: string) {
    const fragments: string[] = [];
    const connectors: string[] = [];
    let cursor = 0;
    let match: RegExpExecArray | null;
    const pattern = new RegExp(COMPOUND_CONNECTOR_PATTERN.source, COMPOUND_CONNECTOR_PATTERN.flags);

    while ((match = pattern.exec(text)) !== null) {
        fragments.push(text.slice(cursor, match.index));
        connectors.push(match[0]);
        cursor = match.index + match[0].length;
        if (connectors.length > MAX_COMPOUND_CONNECTORS) return null;
    }
    fragments.push(text.slice(cursor));

    return connectors.length ? { connectors, fragments } : null;
}

function buildPartition(params: {
    connectors: string[];
    fragments: string[];
    mask: number;
}) {
    const parts: string[] = [];
    let current = params.fragments[0] || '';

    params.connectors.forEach((connector, index) => {
        if ((params.mask & (1 << index)) !== 0) {
            parts.push(normalizePart(current));
            current = params.fragments[index + 1] || '';
            return;
        }
        current += `${connector}${params.fragments[index + 1] || ''}`;
    });
    parts.push(normalizePart(current));
    return parts.filter(Boolean);
}

export function getAiMenuManagerPatchTouchKeys(patch: AiMenuManagerProjectPatch) {
    const keys = new Set<string>();

    if (patch.kind === 'item_update' || patch.kind === 'bulk_item_update') {
        for (const itemId of patch.itemIds || []) {
            for (const field of Object.keys(patch.updates || {})) {
                keys.add(`item:${itemId}:${field}`);
            }
            for (const field of Object.keys(patch.itemUpdates?.[itemId] || {})) {
                keys.add(`item:${itemId}:${field}`);
            }
        }
    }
    if (patch.kind === 'category_update') {
        for (const categoryId of patch.categoryIds || []) {
            for (const field of Object.keys(patch.updates || {})) {
                keys.add(`category:${categoryId}:${field}`);
            }
        }
    }
    if (patch.kind === 'attribute_update') {
        for (const attributeId of patch.attributeIds || (patch.attributeId ? [patch.attributeId] : [])) {
            for (const field of Object.keys(patch.updates || {})) {
                keys.add(`attribute:${attributeId}:${field}`);
            }
        }
    }
    for (const field of Object.keys(patch.menuSettings || {})) {
        keys.add(`menu-settings:${field}`);
    }
    for (const field of Object.keys(patch.decisionBlocks || {})) {
        keys.add(`decision-blocks:${field}`);
    }
    for (const field of Object.keys(patch.designPatch?.menu || {})) {
        keys.add(`design-menu:${field}`);
    }
    for (const field of Object.keys(patch.designPatch?.brand || {})) {
        keys.add(`design-brand:${field}`);
    }

    return keys;
}

export function aiMenuManagerPatchesConflict(patches: AiMenuManagerProjectPatch[]) {
    const seen = new Set<string>();
    for (const patch of patches) {
        for (const key of Array.from(getAiMenuManagerPatchTouchKeys(patch))) {
            if (seen.has(key)) return true;
            seen.add(key);
        }
    }
    return false;
}

export function resolveAiMenuManagerCompoundCommand(params: {
    composerContext?: AiMenuManagerCommandContextSelection;
    context: AiMenuManagerContextPacket;
    createdAt: string;
    projectId: string;
    sId: string | number;
    tId: string | number;
    text: string;
}): ResolvedCompoundPart[] | null {
    const split = splitAtConnectors(params.text);
    if (!split) return null;

    const possibleMasks = Array.from(
        { length: (1 << split.connectors.length) - 1 },
        (_, index) => index + 1,
    ).sort((left, right) => {
        const leftCuts = left.toString(2).replace(/0/g, '').length;
        const rightCuts = right.toString(2).replace(/0/g, '').length;
        return leftCuts - rightCuts;
    });

    for (const mask of possibleMasks) {
        const parts = buildPartition({ ...split, mask });
        if (parts.length < 2 || parts.length > MAX_COMPOUND_OPERATIONS) continue;

        const resolvedParts = parts.map((text, index) => {
            const result = resolveAiMenuManagerCommand({
                text,
                tId: params.tId,
                sId: params.sId,
                projectId: params.projectId,
                context: params.context,
                composerContext: params.composerContext,
                cardId: `amm_compound_draft_${index}`,
                createdAt: params.createdAt,
            });
            if (
                !result.resolved?.patch
                || result.resolved.executionMode !== 'client_project_mutation'
                || result.card.kind !== 'proposal'
            ) {
                return null;
            }
            return { card: result.card, resolved: result.resolved, text };
        });
        if (resolvedParts.some((entry) => entry === null)) continue;

        const validParts = resolvedParts.filter((entry): entry is ResolvedCompoundPart => Boolean(entry));
        if (aiMenuManagerPatchesConflict(validParts.map((entry) => entry.resolved.patch!))) continue;
        return validParts;
    }

    return null;
}
