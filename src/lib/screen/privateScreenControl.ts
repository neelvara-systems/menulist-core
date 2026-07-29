import { createHash, randomBytes } from "node:crypto";

export const PRIVATE_SCREEN_CONTROL_PREFIX = "screenControl_";

export interface PrivateScreenControlDocument {
    createdAt: unknown;
    screenToken: string;
    storeId: string;
    tenantId: string;
    updatedAt: unknown;
}

export const getPrivateScreenControlDocId = (storeId: string | number): string => (
    `${PRIVATE_SCREEN_CONTROL_PREFIX}${String(storeId).trim()}`
);

export const generatePrivateScreenToken = (): string => (
    randomBytes(16).toString("base64url")
);

export const getPrivateScreenTokenCacheTag = (screenToken: string): string => (
    `screen-token-${createHash("sha256").update(screenToken).digest("hex").slice(0, 24)}`
);
