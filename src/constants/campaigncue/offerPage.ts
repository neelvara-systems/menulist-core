export const CAMPAIGNCUE_OFFER_PAGE_SCHEMA_VERSION = 1 as const;
export const CAMPAIGNCUE_OFFER_PAGE_SLUG_LENGTH = 20;
export const CAMPAIGNCUE_OFFER_PAGE_CACHE_SECONDS = 60;
export const CAMPAIGNCUE_OFFER_PAGE_MAX_TTL_DAYS = 30;
export const CAMPAIGNCUE_OFFER_PAGE_SLUG_PATTERN = /^[a-z0-9]{20}$/;

export const CAMPAIGNCUE_OFFER_PAGE_COPY = {
    publish: "Publish page",
    unpublish: "Unpublish page",
    open: "Open page",
    copy: "Copy link",
    downloadQr: "Download QR",
    noTracking: "No visitor tracking or automatic posting.",
} as const;
