import { MSG_EMAIL_DOMAIN, STAFF_EMAIL_DOMAIN } from "@constant/urls";

export type AuthLoginMethod = "email" | "staff_id" | "whatsapp_phone";

export const STAFF_LOGIN_DISPLAY_PREFIX = "S-";

export const normalizeLoginDigits = (value?: string | null) => String(value || "").replace(/[^0-9]/g, "");

export const normalizeStaffLoginUsername = (value?: string | null) => normalizeLoginDigits(value);

export const formatStaffLoginId = (value?: string | null) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const upper = raw.toUpperCase();
    if (upper.startsWith(STAFF_LOGIN_DISPLAY_PREFIX)) return upper;

    const digits = normalizeStaffLoginUsername(raw);
    return digits ? `${STAFF_LOGIN_DISPLAY_PREFIX}${digits}` : upper;
};

export const buildPhoneUsername = (...parts: Array<string | number | null | undefined>) => {
    const joined = parts
        .filter((part) => part !== null && part !== undefined)
        .map((part) => String(part))
        .join("");
    return normalizeLoginDigits(joined);
};

export const getPhoneLookupCandidates = (value?: string | null) => {
    const raw = String(value || "").toLowerCase().trim();
    const digits = normalizeLoginDigits(raw);
    const candidates = [
        raw,
        digits,
        digits ? `+${digits}` : "",
    ].filter(Boolean);

    return Array.from(new Set(candidates));
};

export const isInternalAuthEmail = (email?: string | null) => {
    const normalized = String(email || "").toLowerCase().trim();
    return normalized.endsWith(`@${MSG_EMAIL_DOMAIN}`)
        || normalized.endsWith(`@${STAFF_EMAIL_DOMAIN}`);
};

export const getDisplayEmail = (email?: string | null) => (
    isInternalAuthEmail(email) ? "" : String(email || "")
);

export const getPrimaryLoginLabel = (user: any) => {
    if (user?.staffLoginId || user?.loginUsername) {
        return formatStaffLoginId(user.staffLoginId || user.loginUsername);
    }

    if (user?.phoneUsername || user?.phone || user?.phoneNumber) {
        return user.phone || user.phoneUsername || user.phoneNumber;
    }

    return getDisplayEmail(user?.displayEmail || user?.email);
};
