import { mergeAttributes } from '@tiptap/core';

type TiptapAttributeSource = Record<string, unknown> | null | undefined;

const sanitizeTiptapAttributeSource = (
    source: TiptapAttributeSource,
): Record<string, unknown> => {
    const sanitized: Record<string, unknown> = Object.create(null);

    for (const [key, value] of Object.entries(source ?? {})) {
        if (key === '__proto__') continue;

        Object.defineProperty(sanitized, key, {
            configurable: true,
            enumerable: true,
            value,
            writable: true,
        });
    }

    return sanitized;
};

/**
 * Keeps Tiptap v2 attribute merging behind an own-key boundary until the
 * separately scoped v3 editor migration can be completed and browser-tested.
 */
export const mergeSafeTiptapAttributes = (
    ...sources: TiptapAttributeSource[]
): Record<string, unknown> => mergeAttributes(
    ...sources.map(sanitizeTiptapAttributeSource),
);
