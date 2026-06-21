/**
 * Multi-Product Platform — Product ID Constants
 * 
 * Every database-backed product document uses pId / tId / sId / docId.
 * pId is a 2-char uppercase string. Codes never change. Names may rebrand.
 * Static products can reserve a code here for internal metadata without
 * creating product Firestore writes.
 * 
 * @see __docs__/answerlattice/doctrine/07-multi-product-tenancy.md v4.3.0
 * @see __docs__/answerlattice/doctrine/09-multi-product-doctrine.md
 */

export const PRODUCT_IDS = {
    MENULIST: 'ML',
    ANSWERLATTICE: 'AL',
    CAMPAIGNCUE: 'CC',
    MYCODEX: 'MC',
    SURFACE_OS: 'SF',
    GROWTH_OS: 'GR',
    KITSTAMP: 'KS',
} as const;

export type ProductId = typeof PRODUCT_IDS[keyof typeof PRODUCT_IDS];

export const DEFAULT_PRODUCT_ID: ProductId = PRODUCT_IDS.MENULIST;
