"use client";

import {
    CAMPAIGNCUE_EXPORT_ARCHIVE,
    buildCampaignCueExportArchiveStoragePath,
    type CampaignCueExportArchiveSlot,
} from "@constant/campaigncue/exportArchive";
import { getCampaignCueExportArchiveApiPath } from "@constant/campaigncue/routes";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";
import type { CampaignCueExportArchivePointer } from "@type/campaigncue";

const RESPONSE_LIMIT_BYTES = 64 * 1024;
const SIGNED_UPLOAD_HEADER_NAMES = new Set([
    "cache-control",
    "content-type",
    "x-goog-hash",
    "x-goog-meta-archive-slot",
    "x-goog-meta-campaign-id",
    "x-goog-meta-retention-policy",
    "x-goog-meta-sha256",
    "x-goog-meta-upload-token-hash",
    "x-goog-meta-workspace-id",
]);

type FinalizeArchiveInput = {
    crc32c: string;
    filename: string;
    sha256: string;
    sizeBytes: number;
    storagePath: string;
    uploadToken: string;
};

export type CampaignCueExportArchiveUploadResult =
    | { status: "already_stored"; archive: CampaignCueExportArchivePointer }
    | { status: "uploaded"; finalize: FinalizeArchiveInput };

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(
    value && typeof value === "object" && !Array.isArray(value),
);

const CRC32C_TABLE = new Uint32Array(256).map((_, index) => {
    let crc = index;
    for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0x82f63b78 : 0);
    }
    return crc >>> 0;
});

const crc32cBase64 = (bytes: Uint8Array): string => {
    let crc = 0xffffffff;
    for (let index = 0; index < bytes.length; index += 1) {
        const byte = bytes[index];
        crc = CRC32C_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
    const value = (crc ^ 0xffffffff) >>> 0;
    return globalThis.btoa(String.fromCharCode(
        (value >>> 24) & 0xff,
        (value >>> 16) & 0xff,
        (value >>> 8) & 0xff,
        value & 0xff,
    ));
};

export const hashCampaignCueExportArchiveBlob = async (blob: Blob): Promise<{
    crc32c: string;
    sha256: string;
}> => {
    if (!globalThis.crypto?.subtle) throw new Error("Secure file verification is unavailable in this browser.");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return {
        crc32c: crc32cBase64(bytes),
        sha256: Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(""),
    };
};

const parseUploadHeaders = (value: unknown): Record<string, string> => {
    if (!isRecord(value)) throw new Error("CampaignCue returned invalid cloud-copy upload instructions.");
    const entries = Object.entries(value);
    if (entries.length !== SIGNED_UPLOAD_HEADER_NAMES.size) {
        throw new Error("CampaignCue returned invalid cloud-copy upload instructions.");
    }
    const headers: Record<string, string> = {};
    for (const [rawName, rawValue] of entries) {
        const name = rawName.toLowerCase();
        if (!SIGNED_UPLOAD_HEADER_NAMES.has(name) || typeof rawValue !== "string" || rawValue.length > 500) {
            throw new Error("CampaignCue returned invalid cloud-copy upload instructions.");
        }
        headers[name] = rawValue;
    }
    if (
        Object.keys(headers).length !== SIGNED_UPLOAD_HEADER_NAMES.size
        || Array.from(SIGNED_UPLOAD_HEADER_NAMES).some((name) => !(name in headers))
    ) {
        throw new Error("CampaignCue returned invalid cloud-copy upload instructions.");
    }
    return headers;
};

const parseAlreadyStoredArchive = (
    value: unknown,
    campaignId: string,
    workspaceId: string,
): CampaignCueExportArchivePointer => {
    if (
        !isRecord(value)
        || value.schemaVersion !== 1
        || typeof value.assetId !== "string"
        || !/^[a-zA-Z0-9_-]{3,120}$/.test(value.assetId)
        || typeof value.crc32c !== "string"
        || !/^[A-Za-z0-9+/]{6}==$/.test(value.crc32c)
        || typeof value.filename !== "string"
        || value.filename.length < 5
        || value.filename.length > 120
        || value.mimeType !== CAMPAIGNCUE_EXPORT_ARCHIVE.contentType
        || value.retentionPolicy !== CAMPAIGNCUE_EXPORT_ARCHIVE.retentionPolicy
        || typeof value.sha256 !== "string"
        || !/^[a-f0-9]{64}$/.test(value.sha256)
        || typeof value.sizeBytes !== "number"
        || !Number.isSafeInteger(value.sizeBytes)
        || value.sizeBytes < 1
        || value.sizeBytes > CAMPAIGNCUE_EXPORT_ARCHIVE.maxBytes
        || (value.slot !== "a" && value.slot !== "b")
        || typeof value.storageGeneration !== "string"
        || !/^[1-9][0-9]{0,29}$/.test(value.storageGeneration)
        || typeof value.storagePath !== "string"
        || value.storagePath.length > 500
        || value.storagePath !== buildCampaignCueExportArchiveStoragePath(
            workspaceId,
            campaignId,
            value.slot,
        )
    ) {
        throw new Error("CampaignCue returned an invalid saved cloud copy.");
    }
    return {
        schemaVersion: 1,
        assetId: value.assetId,
        crc32c: value.crc32c,
        filename: value.filename,
        mimeType: CAMPAIGNCUE_EXPORT_ARCHIVE.contentType,
        retentionPolicy: CAMPAIGNCUE_EXPORT_ARCHIVE.retentionPolicy,
        sha256: value.sha256,
        sizeBytes: value.sizeBytes,
        slot: value.slot,
        storageGeneration: value.storageGeneration,
        storagePath: value.storagePath,
        archivedAt: value.archivedAt,
    };
};

export async function uploadCampaignCueExportArchive(params: {
    blob: Blob;
    campaignId: string;
    filename: string;
    workspaceId: string;
}): Promise<CampaignCueExportArchiveUploadResult> {
    if (params.blob.type && params.blob.type !== CAMPAIGNCUE_EXPORT_ARCHIVE.contentType) {
        throw new Error("Campaign Pack cloud copies must be ZIP files.");
    }
    if (!params.blob.size || params.blob.size > CAMPAIGNCUE_EXPORT_ARCHIVE.maxBytes) {
        throw new Error("Campaign Pack cloud copies must be non-empty and no larger than 25 MB.");
    }
    const { crc32c, sha256 } = await hashCampaignCueExportArchiveBlob(params.blob);
    const prepareResponse = await fetch(getCampaignCueExportArchiveApiPath(params.campaignId), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            crc32c,
            filename: params.filename,
            sha256,
            sizeBytes: params.blob.size,
        }),
    });
    const envelope = await readJsonResponseWithLimit<unknown>(prepareResponse, RESPONSE_LIMIT_BYTES);
    if (!prepareResponse.ok || !isRecord(envelope) || !isRecord(envelope.data)) {
        throw new Error("Campaign Pack cloud copy could not be prepared.");
    }
    const preparation = envelope.data;
    if (preparation.status === "already_stored") {
        return {
            status: "already_stored",
            archive: parseAlreadyStoredArchive(preparation.archive, params.campaignId, params.workspaceId),
        };
    }
    const preparationSlot: CampaignCueExportArchiveSlot | null = preparation.slot === "a" || preparation.slot === "b"
        ? preparation.slot
        : null;
    const expectedStoragePath = preparationSlot
        ? buildCampaignCueExportArchiveStoragePath(params.workspaceId, params.campaignId, preparationSlot)
        : "";
    if (
        preparation.status !== "upload_required"
        || preparation.storagePath !== expectedStoragePath
        || typeof preparation.expiresAt !== "number"
        || !Number.isSafeInteger(preparation.expiresAt)
        || preparation.expiresAt <= Date.now()
        || preparation.expiresAt > Date.now() + CAMPAIGNCUE_EXPORT_ARCHIVE.uploadLeaseTtlMs
        || typeof preparation.uploadToken !== "string"
        || !/^[a-zA-Z0-9_-]{16,120}$/.test(preparation.uploadToken)
        || typeof preparation.uploadUrl !== "string"
    ) {
        throw new Error("CampaignCue returned invalid cloud-copy upload instructions.");
    }
    let uploadUrl: URL;
    let decodedUploadPath = "";
    try {
        uploadUrl = new URL(preparation.uploadUrl);
        decodedUploadPath = decodeURIComponent(uploadUrl.pathname);
    } catch {
        throw new Error("CampaignCue returned invalid cloud-copy upload instructions.");
    }
    if (
        uploadUrl.protocol !== "https:"
        || (
            uploadUrl.hostname !== "storage.googleapis.com"
            && !uploadUrl.hostname.endsWith(".storage.googleapis.com")
        )
        || !decodedUploadPath.endsWith(`/${expectedStoragePath}`)
        || !uploadUrl.searchParams.has("X-Goog-Signature")
    ) {
        throw new Error("CampaignCue returned invalid cloud-copy upload instructions.");
    }
    const uploadHeaders = parseUploadHeaders(preparation.uploadHeaders);
    if (
        uploadHeaders["cache-control"] !== "private, max-age=0, no-store"
        || uploadHeaders["content-type"] !== CAMPAIGNCUE_EXPORT_ARCHIVE.contentType
        || uploadHeaders["x-goog-hash"] !== `crc32c=${crc32c}`
        || !preparationSlot
        || uploadHeaders["x-goog-meta-archive-slot"] !== preparationSlot
        || uploadHeaders["x-goog-meta-campaign-id"] !== params.campaignId
        || uploadHeaders["x-goog-meta-retention-policy"] !== CAMPAIGNCUE_EXPORT_ARCHIVE.retentionPolicy
        || uploadHeaders["x-goog-meta-sha256"] !== sha256
        || !/^[a-f0-9]{24}$/.test(uploadHeaders["x-goog-meta-upload-token-hash"])
        || uploadHeaders["x-goog-meta-workspace-id"] !== params.workspaceId
    ) {
        throw new Error("CampaignCue returned invalid cloud-copy upload instructions.");
    }
    const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: params.blob,
        cache: "no-store",
        credentials: "omit",
        headers: uploadHeaders,
    });
    if (!uploadResponse.ok) {
        throw new Error(uploadResponse.status === 412
            ? "Another cloud-copy save finished first. Try saving again."
            : "Campaign Pack cloud copy upload failed.");
    }
    return {
        status: "uploaded",
        finalize: {
            crc32c,
            filename: params.filename,
            sha256,
            sizeBytes: params.blob.size,
            storagePath: preparation.storagePath,
            uploadToken: preparation.uploadToken,
        },
    };
}
