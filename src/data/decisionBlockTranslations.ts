/**
 * Decision Block Translations
 * 
 * Static translations for Decision Block reasons on customer-facing menu.
 * Customer menu doesn't use next-intl, so we use this lightweight lookup.
 * 
 * LANGUAGE STRATEGY:
 * - We support 95+ languages in the app (see languages.ts)
 * - It's impractical to translate 30+ short phrases into all languages
 * - English is used as the universal fallback
 * - We add translations for high-priority languages as needed
 * 
 * Current translations: English (default), Hindi
 * Fallback: English for all other languages
 * 
 * TO ADD A NEW LANGUAGE:
 * 1. Copy the 'en' block
 * 2. Rename to the language code (e.g., 'es', 'fr', 'ar')
 * 3. Translate each value
 * 4. The system will automatically use it
 */

export type DecisionBlockTranslationKey =
    | 'decision.popular.food.favorite'
    | 'decision.popular.food.trending'
    | 'decision.popular.food.mostOrdered'
    | 'decision.popular.service.mostBooked'
    | 'decision.popular.service.topChoice'
    | 'decision.popular.service.clientFavorite'
    | 'decision.popular.retail.bestSeller'
    | 'decision.popular.retail.trending'
    | 'decision.popular.retail.customerLove'
    | 'decision.popular.health.topRated'
    | 'decision.popular.health.clientFavorite'
    | 'decision.popular.default.popular'
    | 'decision.popular.default.favorite'
    | 'decision.quickPick.food.readyIn'
    | 'decision.quickPick.food.instant'
    | 'decision.quickPick.service.express'
    | 'decision.quickPick.service.quick'
    | 'decision.quickPick.health.express'
    | 'decision.quickPick.default.ready'
    | 'decision.quickPick.default.instant'
    | 'decision.bestValue.food.greatValue'
    | 'decision.bestValue.food.worthIt'
    | 'decision.bestValue.service.greatValue'
    | 'decision.bestValue.service.worthIt'
    | 'decision.bestValue.retail.bestDeal'
    | 'decision.bestValue.retail.smartChoice'
    | 'decision.bestValue.health.worthInvestment'
    | 'decision.bestValue.default.greatValue'
    | 'decision.pinned.ownerPick';

type TranslationMap = Record<DecisionBlockTranslationKey, string>;

/**
 * Decision Block Translations by Language
 * 
 * Keys with {minutes} are interpolated at runtime
 */
export const DECISION_BLOCK_TRANSLATIONS: Record<string, TranslationMap> = {
    // ============================================
    // ENGLISH (Default - Universal Fallback)
    // ============================================
    en: {
        'decision.popular.food.favorite': 'Customer favorite',
        'decision.popular.food.trending': 'Trending this week',
        'decision.popular.food.mostOrdered': 'Most ordered',
        'decision.popular.service.mostBooked': 'Most booked',
        'decision.popular.service.topChoice': 'Top choice',
        'decision.popular.service.clientFavorite': 'Client favorite',
        'decision.popular.retail.bestSeller': 'Best seller',
        'decision.popular.retail.trending': 'Trending now',
        'decision.popular.retail.customerLove': 'Customers love this',
        'decision.popular.health.topRated': 'Top rated',
        'decision.popular.health.clientFavorite': 'Client favorite',
        'decision.popular.default.popular': 'Popular choice',
        'decision.popular.default.favorite': 'Customer favorite',
        'decision.quickPick.food.readyIn': 'Ready in {minutes} min',
        'decision.quickPick.food.instant': 'Ready instantly',
        'decision.quickPick.service.express': 'Express {minutes} min',
        'decision.quickPick.service.quick': 'Quick {minutes} min session',
        'decision.quickPick.health.express': 'Express {minutes} min session',
        'decision.quickPick.default.ready': 'Ready in {minutes} min',
        'decision.quickPick.default.instant': 'Ready instantly',
        'decision.bestValue.food.greatValue': 'Great value',
        'decision.bestValue.food.worthIt': 'Worth every bite',
        'decision.bestValue.service.greatValue': 'Great value',
        'decision.bestValue.service.worthIt': 'Worth every penny',
        'decision.bestValue.retail.bestDeal': 'Best deal',
        'decision.bestValue.retail.smartChoice': 'Smart choice',
        'decision.bestValue.health.worthInvestment': 'Worth the investment',
        'decision.bestValue.default.greatValue': 'Great value',
        'decision.pinned.ownerPick': "Owner's choice",
    },

    // ============================================
    // HINDI (हिन्दी)
    // ============================================
    hi: {
        'decision.popular.food.favorite': 'ग्राहकों की पसंद',
        'decision.popular.food.trending': 'इस हफ्ते ट्रेंडिंग',
        'decision.popular.food.mostOrdered': 'सबसे ज्यादा ऑर्डर',
        'decision.popular.service.mostBooked': 'सबसे ज्यादा बुक',
        'decision.popular.service.topChoice': 'टॉप चॉइस',
        'decision.popular.service.clientFavorite': 'ग्राहकों की पसंद',
        'decision.popular.retail.bestSeller': 'बेस्ट सेलर',
        'decision.popular.retail.trending': 'अभी ट्रेंडिंग',
        'decision.popular.retail.customerLove': 'ग्राहकों को पसंद',
        'decision.popular.health.topRated': 'टॉप रेटेड',
        'decision.popular.health.clientFavorite': 'ग्राहकों की पसंद',
        'decision.popular.default.popular': 'लोकप्रिय विकल्प',
        'decision.popular.default.favorite': 'ग्राहकों की पसंद',
        'decision.quickPick.food.readyIn': '{minutes} मिनट में तैयार',
        'decision.quickPick.food.instant': 'तुरंत तैयार',
        'decision.quickPick.service.express': 'एक्सप्रेस {minutes} मिनट',
        'decision.quickPick.service.quick': 'क्विक {minutes} मिनट सेशन',
        'decision.quickPick.health.express': 'एक्सप्रेस {minutes} मिनट सेशन',
        'decision.quickPick.default.ready': '{minutes} मिनट में तैयार',
        'decision.quickPick.default.instant': 'तुरंत तैयार',
        'decision.bestValue.food.greatValue': 'बेहतरीन वैल्यू',
        'decision.bestValue.food.worthIt': 'हर बाइट की कीमत',
        'decision.bestValue.service.greatValue': 'बेहतरीन वैल्यू',
        'decision.bestValue.service.worthIt': 'पैसा वसूल',
        'decision.bestValue.retail.bestDeal': 'बेस्ट डील',
        'decision.bestValue.retail.smartChoice': 'स्मार्ट चॉइस',
        'decision.bestValue.health.worthInvestment': 'निवेश के लायक',
        'decision.bestValue.default.greatValue': 'बेहतरीन वैल्यू',
        'decision.pinned.ownerPick': 'मालिक की पसंद',
    },

    // ============================================
    // ADD MORE LANGUAGES BELOW AS NEEDED
    // ============================================
    // Example for Spanish:
    // es: {
    //     'decision.popular.food.favorite': 'Favorito del cliente',
    //     ...
    // },
};

/**
 * Get translated text for a Decision Block reason
 * 
 * @param key - i18n key (e.g., "decision.popular.food.favorite")
 * @param language - Language code (e.g., "en", "hi", "en-US", "hi-IN")
 * @returns Translated text or English fallback
 */
export function getDecisionBlockTranslation(key: string, language: string): string {
    // Normalize language code (e.g., "en-US" -> "en", "hi-IN" -> "hi")
    const lang = language.split('-')[0].toLowerCase();

    // Try exact language match, fallback to English
    const translations = DECISION_BLOCK_TRANSLATIONS[lang] || DECISION_BLOCK_TRANSLATIONS['en'];

    if (translations[key as DecisionBlockTranslationKey]) {
        return translations[key as DecisionBlockTranslationKey];
    }

    // Fallback: extract readable text from key
    const parts = key.split('.');
    const lastPart = parts[parts.length - 1];
    // Convert camelCase to Title Case
    return lastPart.replace(/([A-Z])/g, ' $1').trim();
}

/**
 * Check if a language has Decision Block translations
 */
export function hasDecisionBlockTranslations(language: string): boolean {
    const lang = language.split('-')[0].toLowerCase();
    return lang in DECISION_BLOCK_TRANSLATIONS;
}

/**
 * Get list of supported languages for Decision Blocks
 */
export function getSupportedDecisionBlockLanguages(): string[] {
    return Object.keys(DECISION_BLOCK_TRANSLATIONS);
}
