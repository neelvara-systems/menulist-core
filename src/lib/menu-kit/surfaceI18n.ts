/**
 * Menu Kit Surface Internationalization
 *
 * Translated surface strings for print/social assets.
 * These are the strings that appear ON the printed/generated surfaces
 * (not UI labels — those are in businessTypeLabels.ts).
 *
 * Supported locales: en (default), hi (Hindi — primary non-English market)
 * Other locales fall back to English.
 *
 * NOTE: jsPDF uses embedded Helvetica which only supports Latin characters.
 * Hindi strings are only used in canvas-based templates (sticker, social, guide).
 * PDF templates (tent card, entrance poster) always use English for font safety.
 *
 * @see __docs__/menu-kit/menu-kit_impl.md
 */

export interface SurfaceStrings {
    /** "Open camera → point at QR" */
    cameraInstruction: string;
    /** "Or open:" */
    orOpen: string;
    /** "Updated on:" */
    updatedOn: string;
    /** "Updated regularly" */
    updatedRegularly: string;
    /** "Powered by MenuList" */
    poweredBy: string;
    /** "WHERE TO PLACE YOUR QR CODE" */
    placementTitle: string;
    /** "PRINT SIZES" */
    printSizes: string;
    /** "BEFORE OPENING" */
    beforeOpening: string;
    /** Placement guide items */
    placementItems: {
        tables: string;
        tablesSub: string;
        counter: string;
        counterSub: string;
        entrance: string;
        entranceSub: string;
    };
    /** Print size items */
    sizeItems: {
        table: string;
        counter: string;
        entrance: string;
    };
    /** Pre-opening checklist */
    checklistItems: {
        scanQr: string;
        confirmLoad: string;
        replaceDamaged: string;
    };
    /** Placement guide tip */
    matteTip: string;
}

const EN_STRINGS: SurfaceStrings = {
    cameraInstruction: 'Open camera \u2192 point at QR',
    orOpen: 'Or open:',
    updatedOn: 'Updated on:',
    updatedRegularly: 'Updated regularly',
    poweredBy: 'Powered by MenuList',
    placementTitle: 'WHERE TO PLACE\nYOUR QR CODE',
    printSizes: 'PRINT SIZES',
    beforeOpening: 'BEFORE OPENING',
    placementItems: {
        tables: 'Tables: 1 QR per table (center)',
        tablesSub: 'Print 20% extra for replacements',
        counter: 'Counter: Near payment machine',
        counterSub: 'Highest scan rate \u2014 phone already in hand',
        entrance: 'Entrance: 1 poster near the door',
        entranceSub: 'Customers check menu before sitting',
    },
    sizeItems: {
        table: 'Table QR: 5\u00d75 cm minimum',
        counter: 'Counter QR: 8\u00d78 cm',
        entrance: 'Entrance poster: 12\u00d712 cm QR',
    },
    checklistItems: {
        scanQr: 'Scan QR from several tables',
        confirmLoad: 'Confirm menu loads quickly',
        replaceDamaged: 'Replace damaged QR cards',
    },
    matteTip: 'Tip: Matte finish recommended \u2014 glossy causes glare',
};

const HI_STRINGS: SurfaceStrings = {
    cameraInstruction: '\u0915\u0948\u092e\u0930\u093e \u0916\u094b\u0932\u0947\u0902 \u2192 QR \u092a\u0930 \u0930\u0916\u0947\u0902',
    orOpen: '\u092f\u093e \u0916\u094b\u0932\u0947\u0902:',
    updatedOn: '\u0905\u092a\u0921\u0947\u091f:',
    updatedRegularly: '\u0928\u093f\u092f\u092e\u093f\u0924 \u0930\u0942\u092a \u0938\u0947 \u0905\u092a\u0921\u0947\u091f \u0939\u094b\u0924\u093e \u0939\u0948',
    poweredBy: 'Powered by MenuList',
    placementTitle: 'QR \u0915\u094b\u0921 \u0915\u0939\u093e\u0901\n\u0930\u0916\u0947\u0902',
    printSizes: '\u092a\u094d\u0930\u093f\u0902\u091f \u0938\u093e\u0907\u091c\u093c',
    beforeOpening: '\u0916\u094b\u0932\u0928\u0947 \u0938\u0947 \u092a\u0939\u0932\u0947',
    placementItems: {
        tables: '\u091f\u0947\u092c\u0932: \u092a\u094d\u0930\u0924\u093f \u091f\u0947\u092c\u0932 1 QR (\u092c\u0940\u091a \u092e\u0947\u0902)',
        tablesSub: '\u092c\u0926\u0932\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f 20% \u0905\u0924\u093f\u0930\u093f\u0915\u094d\u0924 \u092a\u094d\u0930\u093f\u0902\u091f \u0915\u0930\u0947\u0902',
        counter: '\u0915\u093e\u0909\u0902\u091f\u0930: \u092d\u0941\u0917\u0924\u093e\u0928 \u092e\u0936\u0940\u0928 \u0915\u0947 \u092a\u093e\u0938',
        counterSub: '\u0938\u092c\u0938\u0947 \u091c\u094d\u092f\u093e\u0926\u093e \u0938\u094d\u0915\u0948\u0928 \u2014 \u092b\u094b\u0928 \u092a\u0939\u0932\u0947 \u0938\u0947 \u0939\u093e\u0925 \u092e\u0947\u0902',
        entrance: '\u092a\u094d\u0930\u0935\u0947\u0936: \u0926\u0930\u0935\u093e\u091c\u0947 \u0915\u0947 \u092a\u093e\u0938 1 \u092a\u094b\u0938\u094d\u091f\u0930',
        entranceSub: '\u0917\u094d\u0930\u093e\u0939\u0915 \u092c\u0948\u0920\u0928\u0947 \u0938\u0947 \u092a\u0939\u0932\u0947 \u092e\u0947\u0928\u0942 \u0926\u0947\u0916\u0924\u0947 \u0939\u0948\u0902',
    },
    sizeItems: {
        table: '\u091f\u0947\u092c\u0932 QR: \u0928\u094d\u092f\u0942\u0928\u0924\u092e 5\u00d75 cm',
        counter: '\u0915\u093e\u0909\u0902\u091f\u0930 QR: 8\u00d78 cm',
        entrance: '\u092a\u094b\u0938\u094d\u091f\u0930 QR: 12\u00d712 cm',
    },
    checklistItems: {
        scanQr: '\u0915\u0908 \u091f\u0947\u092c\u0932\u094b\u0902 \u0938\u0947 QR \u0938\u094d\u0915\u0948\u0928 \u0915\u0930\u0947\u0902',
        confirmLoad: '\u092e\u0947\u0928\u0942 \u091c\u0932\u094d\u0926\u0940 \u0932\u094b\u0921 \u0939\u094b \u0915\u0949\u0928\u094d\u092b\u0930\u094d\u092e \u0915\u0930\u0947\u0902',
        replaceDamaged: '\u0916\u0930\u093e\u092c QR \u0915\u093e\u0930\u094d\u0921 \u092c\u0926\u0932\u0947\u0902',
    },
    matteTip: '\u0938\u0941\u091d\u093e\u0935: \u092e\u0948\u091f \u092b\u093f\u0928\u093f\u0936 \u0938\u092c\u0938\u0947 \u0905\u091a\u094d\u091b\u0940 \u2014 \u0917\u094d\u0932\u0949\u0938\u0940 \u092e\u0947\u0902 \u091a\u092e\u0915 \u0906\u0924\u0940 \u0939\u0948',
};

const LOCALE_MAP: Record<string, SurfaceStrings> = {
    'en': EN_STRINGS,
    'en-US': EN_STRINGS,
    'en-GB': EN_STRINGS,
    'hi': HI_STRINGS,
    'hi-IN': HI_STRINGS,
};

/**
 * Get translated surface strings for a given locale.
 * Falls back to English for unsupported locales.
 *
 * @param locale - BCP 47 locale string (e.g., 'en-US', 'hi-IN')
 */
export function getSurfaceStrings(locale?: string): SurfaceStrings {
    if (!locale) return EN_STRINGS;
    return LOCALE_MAP[locale] || LOCALE_MAP[locale.split('-')[0]] || EN_STRINGS;
}

/**
 * Check if the locale uses a non-Latin script that jsPDF cannot render.
 * Used to decide whether PDF templates should fall back to English.
 */
export function isLatinLocale(locale?: string): boolean {
    if (!locale) return true;
    const nonLatinPrefixes = ['hi', 'ar', 'ta', 'te', 'mr', 'bn'];
    const prefix = locale.split('-')[0];
    return !nonLatinPrefixes.includes(prefix);
}
