// Re-export business types from shared data (primary source for copy-paste to functions)
export { BUSINESS_CATEGORIES, BUSINESS_TYPES, FALLBACK_BUSINESS_CATEGORY, FALLBACK_BUSINESS_TYPE, FILTER_ALLOWLIST, getBusinessCatalogKind, getBusinessCategory, getBusinessCategoryConfig, getBusinessOfferingKind, getBusinessSchemaOrgType, getBusinessTypeConfig, normalizeBusinessCategory, resolveBusinessCategory, resolveBusinessCategoryOrFallback, resolveStoreBusinessCategory } from "@data/shared/businessTypes";
export type { BusinessCatalogKind, BusinessCategory, BusinessOfferingKind, BusinessType, SystemFilter } from "@data/shared/businessTypes";
export const APP_NAME = 'MenulistAi'
export const APP_TAGLINE = 'Your Second Brain'
export const APP_THEME_COLOR = "#0054D0";
export const TOGGLE_DARK_MODE = 'TOGGLE_DARK_MODE';
export const BUILDER_CONTAINER = 'BUILDER';
export const OVERLAY_CONTAINER = 'OVERLAY';
export const PREVIEW_CONTAINER = 'PREVIEW';
export const SECTION_PAGE = 'SECTION';
export const CRAFT_BUILDER_APP = 'CRAFT BUILDER';
export const WEBSITE_BUILDER_APP = 'WEBSITE BUILDER';
export const PREVIEW_PAGE_LINK = 'PREVIEW_LINK';
export const PATTERN_PAGE = 'PATTERN';
export const EMPTY_ERROR = { id: '', message: '' };
export const NO_COLOR_VALUE = '#ffffff00';
export const SEARCHED_IMAGES_COUNT_PER_REQUEST_UNSPLASH = 30;
export const SEARCHED_IMAGES_COUNT_PER_REQUEST_PEXELS = 80;
export const SEARCHED_IMAGES_COUNT_PER_REQUEST_PIXABAY = 200;
export const IMAGE_COMPRESSION_LIMIT = 500000;//500kb
export const BGRCreditValueInPrice = 100;//1 credit = 100 paise(1rs) // used only when purchasing credits
export const BGRCreditValueInTokens = 500;//1 credit = 500 token (ex. 1mb image = 1000kb cost 1000token/500 = 2credits = 2rs)
// Platform URLs — import from @constant/urls for all domain references
export { DASHBOARD_URL as APP_DASHBOARD_URL, DASHBOARD_URL, HELP_URL, PLATFORM_URL, SUPPORT_URL } from "@constant/urls";
export const LOGO = '/icons/icon-192x192.png'
export const LOGO_TEXT = 'MenulistAi'
export const LOGO_LARGE = '/icons/icon-512x512.png';
export const LOGO_SMALL = '/icons/icon-192x192.png';
export const LOGO_ANIMATED = '/icons/icon-512x512.png';
export const BACKGROUND_IMAGES_ORIENTATIONS = {
    LANDSCAPE: 'landscape',
    PORTRAIT: 'portrait',
    SQUARE: 'square',
}

export const ERROR_TYPES = {
    FUNCTIONAL: "FUNCTIONAL"
}

export const BACKGROUND_TYPES = {
    COLOR: 'Color',
    GRADIENT: 'Gradient',
    IMAGE: 'image',
}

export const BACKGROUND_IMAGES_TYPES = {
    SMALL: 'small',
    LARGE: 'large',
    SQUARE: 'square',
}

export const AVAILABLE_LANGUAGES: any = [
    {
        value: 'en',
        label: 'English',
        // languageLabel: 'English',
    },
    {
        value: 'hi',
        label: 'Hindi',
        languageLabel: 'हिंदी',
    },
    {
        value: 'ar',
        label: 'Arebic',
        languageLabel: 'عربي',
    },
];

export const DEFAULT_PRIMARY_FONT = "poppins"
export const DEFAULT_LIGHT_COLOR = '#1E40AF'; // Professional blue for light mode
export const DEFAULT_DARK_COLOR = '#3B82F6'; // Vibrant blue for dark mode

// DARK MODE: Vibrant, saturated colors that pop on dark backgrounds
// Inspired by: Slack, Discord, Notion, Linear
export const DARK_COLORS = [
    '#3B82F6', // Blue - Professional & trustworthy
    '#8B5CF6', // Purple - Creative & modern
    '#EC4899', // Pink - Energetic & friendly
    '#10B981', // Green - Success & growth
    '#F59E0B', // Amber - Warning & attention
    '#06B6D4', // Cyan - Tech & innovation
    '#EF4444', // Red - Error & urgent
    '#6366F1', // Indigo - Deep & premium
    '#14B8A6', // Teal - Balance & calm
    '#F97316', // Orange - Warm & inviting
    '#A855F7', // Vibrant Purple - Bold
    '#22D3EE', // Sky Blue - Fresh
    '#84CC16', // Lime - Energy
];

// LIGHT MODE: Deeper, saturated colors with good contrast on light backgrounds  
// Inspired by: GitHub, Figma, Asana, Stripe
export const LIGHT_COLORS = [
    '#1E40AF', // Deep Blue - Professional
    '#7C3AED', // Deep Purple - Creative
    '#BE185D', // Deep Pink - Bold
    '#047857', // Deep Green - Success
    '#D97706', // Deep Amber - Attention
    '#0E7490', // Deep Cyan - Tech
    '#DC2626', // Deep Red - Error
    '#4F46E5', // Deep Indigo - Premium
    '#0F766E', // Deep Teal - Balanced
    '#EA580C', // Deep Orange - Warm
    '#9333EA', // Deep Purple - Distinctive
    '#0284C7', // Deep Sky - Clear
    '#65A30D', // Deep Lime - Fresh
];

export const NEON_COLORS = ['#79E0EE', '#FFB84C', '#FF55BB', '#F6F1E9', '#F0FF42', '#060047'];
export const PASTEL_COLORS = ['#C4DFDF', '#F5F0BB', '#ACB1D6', '#DDFFBB', '#B9F3E4'];

export const SUCCESS_RESPONSE = { status: 200, data: "", message: "success", apiStatus: true }

export const ERROR_RESPONSE = { status: 400, data: "", message: "failed", apiStatus: false }

export const APP_LANGUAGES = [
    { label: "English (American English)", value: "en-US" },
    { label: "English (British English)", value: "en-GB" },
    { label: "हिन्दी (Hindi)", value: "hi-IN" },
    { label: "العربية (Arabic)", value: "ar-SA" },
    { label: "español (Spanish)", value: "es-ES" },
    { label: "தமிழ் (Tamil)", value: "ta-IN" },
    { label: "తెలుగు (Telugu)", value: "te-IN" },
    { label: "मराठी (Marathi)", value: "mr-IN" },
    { label: "বাংলা (Bengali)", value: "bn-IN" },
    { label: "ગુજરાતી (Gujarati)", value: "gu-IN" },
    { label: "ಕನ್ನಡ (Kannada)", value: "kn-IN" },
    { label: "മലയാളം (Malayalam)", value: "ml-IN" },
    { label: "ਪੰਜਾਬੀ (Punjabi)", value: "pa-IN" },
    { label: "اردو (Urdu)", value: "ur-IN" },
    { label: "ଓଡ଼ିଆ (Odia)", value: "or-IN" },
    { label: "অসমীয়া (Assamese)", value: "as-IN" },
    { label: "नेपाली (Nepali)", value: "ne-NP" },
    { label: "मैथिली (Maithili)", value: "mai-IN" },
    { label: "कोंकणी (Konkani)", value: "kok-IN" },
    { label: "سنڌي (Sindhi)", value: "sd-IN" },
    { label: "کٲشُر (Kashmiri)", value: "ks-IN" },
    { label: "डोगरी (Dogri)", value: "doi-IN" },
    { label: "ꯃꯩꯇꯩꯂꯣꯟ (Manipuri)", value: "mni-IN" },
    { label: "ᱥᱟᱱᱛᱟᱲᱤ (Santali)", value: "sat-IN" },
    { label: "बड़ो (Bodo)", value: "brx-IN" },
    { label: "français (French)", value: "fr-FR" },
    { label: "português do Brasil (Portuguese - Brazil)", value: "pt-BR" },
    { label: "Deutsch (German)", value: "de-DE" },
    { label: "italiano (Italian)", value: "it-IT" },
    { label: "日本語 (Japanese)", value: "ja-JP" },
    { label: "中文（简体）(Chinese - Simplified)", value: "zh-CN" },
    { label: "Bahasa Indonesia (Indonesian)", value: "id-ID" },
    { label: "Tiếng Việt (Vietnamese)", value: "vi-VN" },
    { label: "ไทย (Thai)", value: "th-TH" },
    { label: "한국어 (Korean)", value: "ko-KR" },
    { label: "Türkçe (Turkish)", value: "tr-TR" },
    { label: "Bahasa Melayu (Malay)", value: "ms-MY" },
    { label: "Nederlands (Dutch)", value: "nl-NL" },
    { label: "polski (Polish)", value: "pl-PL" },
    { label: "українська (Ukrainian)", value: "uk-UA" },
    { label: "čeština (Czech)", value: "cs-CZ" },
    { label: "română (Romanian)", value: "ro-RO" },
    { label: "Ελληνικά (Greek)", value: "el-GR" },
    { label: "magyar (Hungarian)", value: "hu-HU" },
    { label: "svenska (Swedish)", value: "sv-SE" },
    { label: "dansk (Danish)", value: "da-DK" },
    { label: "suomi (Finnish)", value: "fi-FI" },
    { label: "Filipino (Filipino)", value: "fil-PH" },
    { label: "中文（繁體）(Chinese - Traditional)", value: "zh-TW" },
    { label: "עברית (Hebrew)", value: "he-IL" },
    { label: "فارسی (Persian)", value: "fa-IR" },
    { label: "Kiswahili (Swahili)", value: "sw-KE" },
]

export const AI_ACTIONS_TYPES = {
    IMAGE_PROCESSING: "image_processing",
    IMAGE_GENERATION: "image_generation",
    BATCH_IMAGE_GENERATION: "batch_image_generation",
    IMAGE_EDITING: "image_editing",
    //translations actions
    LANGUAGE_ADDITION: "language_addition",
    IMAGE_TRANSLATION: "image_translation",
    ITEM_TRANSLATION: "item_translation",
    //description actions
    ADD_DESCRIPTION: "add_description",
    REWRITE_DESCRIPTION: "rewrite_description",
    SEO_AEO_GENERATION: "seo_aeo_generation",
    BUSINESS_COPY_GENERATION: "business_copy_generation",
    CAMPAIGN_CAPTION: "campaign_caption",
    MENU_CARD_EXPORT_DESIGN_ADVISOR: "menu_card_export_design_advisor",
    MENU_INTAKE_IDENTITY: "menu_intake_identity",
    PUBLIC_MENU_EXTRACTION: "public_menu_extraction",
    REVIEW_REPLY_SUGGESTION: "review_reply_suggestion",
    OWNER_BUSINESS_ASSISTANT_ANSWER: "owner_business_assistant_answer",
    AI_MENU_MANAGER_PLANNER: "ai_menu_manager_planner",
    WEEKLY_NARRATIVE: "weekly_narrative",
    HELP_CENTER_SEARCH: "help_center_search",
    HELP_CENTER_EMBEDDING: "help_center_embedding",
    ANSWERLATTICE_TRANSLATION: "answerlattice_translation",
    ANSWERLATTICE_FAQ_GENERATION: "answerlattice_faq_generation",
    ANSWERLATTICE_WIDGET_SEARCH: "answerlattice_widget_search",
    ANSWERLATTICE_SUPPORT_SEARCH: "answerlattice_support_search",
    ANSWERLATTICE_KB_EMBEDDING: "answerlattice_kb_embedding",
    ANSWERLATTICE_DRAFT_GENERATION: "answerlattice_draft_generation",
    ANSWERLATTICE_TICKET_KNOWLEDGE_EXTRACTION: "answerlattice_ticket_knowledge_extraction",
    ANSWERLATTICE_ONBOARDING_BOOTSTRAP: "answerlattice_onboarding_bootstrap",
    ANSWERLATTICE_ENTITY_EXTRACTION: "answerlattice_entity_extraction",
    ANSWERLATTICE_FRICTION_INSIGHT: "answerlattice_friction_insight",
    ANSWERLATTICE_ANSWER_TEST: "answerlattice_answer_test",
    ANSWERLATTICE_PRODUCT_STARTER_PACK: "answerlattice_product_starter_pack",
    ANSWERLATTICE_INTAKE_OCR: "answerlattice_intake_ocr",
    ANSWERLATTICE_INTAKE_TRANSCRIPTION: "answerlattice_intake_transcription",
    ANSWERLATTICE_INTAKE_EMBEDDING: "answerlattice_intake_embedding",
    //new item metadata actions
    NEW_ITEM_METADATA: "new_item_metadata",
} as const;

export const TOKENS_PER_CREDIT = 500;
export const CHARGE_PER_CREDIT = 100;//in paise

export const ASPECT_RATIOS_LIST = [
    { value: '1:1', width: 40, height: 40, title: "Square", useCase: "Best for Instagram, Menu Cards" },
    { value: '9:16', width: 25, height: 40, title: "Mobile vertical", useCase: "Best for Stories, Reels, TikTok" },
    { value: '16:9', width: 50, height: 28, title: "Widescreen", useCase: "Best for Website Banners, YouTube" },
    { value: '3:4', width: 30, height: 40, title: "Portrait", useCase: "Best for Pinterest, Print Menus" },
    { value: '4:3', width: 40, height: 30, title: "Landscape", useCase: "Best for Facebook, Google Business" }
];

// BUSINESS_CATEGORIES, BUSINESS_TYPES, FILTER_ALLOWLIST, business type/category helpers,
// BusinessCategory, BusinessCatalogKind, BusinessOfferingKind, BusinessType, SystemFilter
// — All re-exported from @data/shared/businessTypes.ts (see top of file)
// Primary source: src/data/shared/businessTypes.ts
// Copy-paste target: functions/src/sharedData/businessTypes.ts
