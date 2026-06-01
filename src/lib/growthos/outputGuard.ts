import { GROWTHOS_FORBIDDEN_PUBLIC_PHRASES } from "@constant/growthos";
import type { GrowthOSPreflightResult } from "@type/growthos";

const WHITESPACE = /\s+/g;

export function normalizeGrowthOSText(value: string): string {
    return value.replace(WHITESPACE, " ").trim();
}

export function buildPreflight(blocks: string[] = [], warnings: string[] = []): GrowthOSPreflightResult {
    return {
        status: blocks.length ? "blocked" : warnings.length ? "limited" : "ready",
        blocks,
        warnings,
    };
}

export function guardGrowthOSOutput(text: string): { text: string; preflight: GrowthOSPreflightResult } {
    const normalized = normalizeGrowthOSText(text);
    const lower = normalized.toLowerCase();
    const blockedPhrases = GROWTHOS_FORBIDDEN_PUBLIC_PHRASES.filter((phrase) => lower.includes(phrase));

    if (blockedPhrases.length) {
        return {
            text: normalized,
            preflight: buildPreflight(
                ["Unsupported claim or offer removed before use."],
                [`Blocked phrase: ${blockedPhrases[0]}`],
            ),
        };
    }

    return {
        text: normalized,
        preflight: buildPreflight(),
    };
}

export function mergePreflightResults(results: GrowthOSPreflightResult[]): GrowthOSPreflightResult {
    const blocks = results.flatMap((result) => result.blocks);
    const warnings = results.flatMap((result) => result.warnings);
    return buildPreflight(Array.from(new Set(blocks)), Array.from(new Set(warnings)));
}
