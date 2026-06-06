import { answerlatticeTokenize } from './tokenizer';

const MIN_PREFIX_LENGTH = 3;
const MAX_PREFIX_LENGTH = 18;
const MAX_PREFIX_TOKENS = 80;

const normalizeTokenList = (values: unknown[]): string[] => Array.from(
    new Set(
        values
            .flatMap(value => Array.isArray(value) ? value : [value])
            .flatMap(value => answerlatticeTokenize(String(value || ''), MIN_PREFIX_LENGTH))
            .filter(Boolean),
    ),
);

export function buildAnswerlatticeEntityPrefixTokens(input: {
    canonicalName?: string;
    normalizedTokens?: string[];
    synonyms?: string[];
}): string[] {
    const tokens = normalizeTokenList([
        input.canonicalName,
        ...(input.normalizedTokens || []),
        ...(input.synonyms || []),
    ]);

    const prefixes = new Set<string>();
    for (const token of tokens) {
        const upperBound = Math.min(token.length, MAX_PREFIX_LENGTH);
        for (let length = MIN_PREFIX_LENGTH; length <= upperBound; length += 1) {
            prefixes.add(token.slice(0, length));
            if (prefixes.size >= MAX_PREFIX_TOKENS) return Array.from(prefixes);
        }
        prefixes.add(token);
        if (prefixes.size >= MAX_PREFIX_TOKENS) return Array.from(prefixes);
    }

    return Array.from(prefixes);
}
