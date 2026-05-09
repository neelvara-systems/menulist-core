export const MENU_SPECIAL_NOTE_SUGGESTION_KEYS = [
    'specialNoteSuggestionTaxes',
    'specialNoteSuggestionAvailability',
    'specialNoteSuggestionAllergies',
    'specialNoteSuggestionPeakHours',
    'specialNoteSuggestionTakeaway',
    'specialNoteSuggestionOutletVariation',
] as const;

export function getMenuSpecialNoteSuggestions(t: (key: string) => string): string[] {
    return MENU_SPECIAL_NOTE_SUGGESTION_KEYS
        .map((key) => t(key))
        .filter((value, index, values) => Boolean(value?.trim()) && values.indexOf(value) === index);
}
