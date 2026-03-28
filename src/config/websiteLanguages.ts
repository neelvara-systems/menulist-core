/**
 * Website Language Configuration
 * 
 * Languages shown in the website language switcher.
 * Uses same locale codes as APP_LANGUAGES in constants/common.ts.
 * en-GB excluded — negligible difference for marketing copy.
 * 
 * @see __docs__/website-i18n/README.md
 */

export interface WebsiteLanguage {
    code: string;
    label: string;
    nativeName: string;
    direction: 'ltr' | 'rtl';
}

export const WEBSITE_LANGUAGES: WebsiteLanguage[] = [
    { code: 'en-US', label: 'English', nativeName: 'English', direction: 'ltr' },
    { code: 'hi-IN', label: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr' },
    { code: 'ta-IN', label: 'Tamil', nativeName: 'தமிழ்', direction: 'ltr' },
    { code: 'te-IN', label: 'Telugu', nativeName: 'తెలుగు', direction: 'ltr' },
    { code: 'mr-IN', label: 'Marathi', nativeName: 'मराठी', direction: 'ltr' },
    { code: 'bn-IN', label: 'Bengali', nativeName: 'বাংলা', direction: 'ltr' },
    { code: 'ar-SA', label: 'Arabic', nativeName: 'العربية', direction: 'rtl' },
    { code: 'es-ES', label: 'Spanish', nativeName: 'Español', direction: 'ltr' },
];

export const DEFAULT_WEBSITE_LANGUAGE = 'en-US';
