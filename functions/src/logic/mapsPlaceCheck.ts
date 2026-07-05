import { GenerateContentResponse } from "@google/genai";
import * as functions from "firebase-functions";
import { HttpsError } from "firebase-functions/v2/https";
import { MAPS_PLACE_CHECK_MODEL } from "../constants/ai";
import { genAIClient } from "../genAiClient";

export type MapsPlaceCheckStatus = "needs_owner_confirmation" | "no_grounded_result";

export interface MapsPlaceCheckInput {
    tenantId: string;
    storeId: string;
    businessName: string;
    address?: string;
    latLng?: {
        latitude: number;
        longitude: number;
    };
    languageCode?: string;
}

export interface MapsPlaceCheckSource {
    title: string;
    uri: string;
    placeId?: string;
}

export interface MapsPlaceCheckProposedFacts {
    address?: string;
    openingHours?: string;
    amenities?: string[];
    paymentOptions?: string[];
    accessibility?: string[];
    serviceOptions?: string[];
}

export interface MapsPlaceCheckResult {
    status: MapsPlaceCheckStatus;
    attributionRequired: boolean;
    checkedAt: string;
    model: string;
    candidate: {
        title?: string;
        placeId?: string;
        uri?: string;
        proposedFacts: MapsPlaceCheckProposedFacts;
        sources: MapsPlaceCheckSource[];
    } | null;
}

type ParsedMapsPlaceFacts = {
    title?: unknown;
    placeId?: unknown;
    uri?: unknown;
    proposedFacts?: Record<string, unknown>;
};

const logger = functions.logger;
const MAX_TEXT_LENGTH = 500;
const MAX_FACT_LIST_ITEMS = 8;

function cleanRequiredText(value: unknown, fieldName: string, maxLength = MAX_TEXT_LENGTH): string {
    const text = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
    if (!text) {
        throw new HttpsError("invalid-argument", `${fieldName} is required.`);
    }
    if (text.length > maxLength) {
        throw new HttpsError("invalid-argument", `${fieldName} is too long.`);
    }
    return text;
}

function cleanOptionalText(value: unknown, maxLength = MAX_TEXT_LENGTH): string | undefined {
    const text = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
    if (!text) return undefined;
    return text.slice(0, maxLength);
}

function cleanDocumentId(value: unknown, fieldName: string): string {
    const id = cleanRequiredText(value, fieldName, 120);
    if (id === "." || id === ".." || id.includes("/") || /^__.*__$/.test(id)) {
        throw new HttpsError("invalid-argument", `${fieldName} must be a valid document ID.`);
    }
    return id;
}

function cleanLanguageCode(value: unknown): string | undefined {
    const languageCode = cleanOptionalText(value, 16);
    if (!languageCode) return undefined;
    if (!/^[a-z]{2,3}(-[a-zA-Z]{2,4})?$/.test(languageCode)) {
        throw new HttpsError("invalid-argument", "languageCode must be a valid BCP-47 style language code.");
    }
    if (!/^en(?:-|$)/i.test(languageCode)) {
        throw new HttpsError("invalid-argument", "Maps place check currently supports English language codes only.");
    }
    return languageCode;
}

function cleanLatLng(value: unknown): MapsPlaceCheckInput["latLng"] {
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    const record = value as Record<string, unknown>;
    const latitude = Number(record.latitude);
    const longitude = Number(record.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new HttpsError("invalid-argument", "latLng must include numeric latitude and longitude.");
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        throw new HttpsError("invalid-argument", "latLng is outside valid coordinate bounds.");
    }
    return { latitude, longitude };
}

export function normalizeMapsPlaceCheckInput(data: unknown): MapsPlaceCheckInput {
    const record = data && typeof data === "object" && !Array.isArray(data)
        ? data as Record<string, unknown>
        : {};

    return {
        tenantId: cleanDocumentId(record.tenantId, "tenantId"),
        storeId: cleanDocumentId(record.storeId, "storeId"),
        businessName: cleanRequiredText(record.businessName, "businessName", 200),
        address: cleanOptionalText(record.address, 300),
        latLng: cleanLatLng(record.latLng),
        languageCode: cleanLanguageCode(record.languageCode),
    };
}

function buildMapsPlaceCheckPrompt(input: MapsPlaceCheckInput): string {
    const lines = [
        "You are checking public place evidence for a MenuList store.",
        "Use Google Maps grounding only when it is relevant. Do not use general web knowledge.",
        "Return JSON only. Do not include markdown.",
        "",
        "Return this shape:",
        JSON.stringify({
            title: "Best matching Google Maps place title, if found",
            placeId: "places/{place_id}, if available",
            uri: "Google Maps source URI, if available",
            proposedFacts: {
                address: "public address if supported",
                openingHours: "public opening hours summary if supported",
                amenities: ["supported amenity"],
                paymentOptions: ["supported payment option"],
                accessibility: ["supported accessibility fact"],
                serviceOptions: ["supported service option"],
            },
        }),
        "",
        "Rules:",
        "- If facts are not supported by Google Maps evidence, omit them.",
        "- Do not include ratings, review claims, menus, prices, or availability.",
        "- Do not say anything is official or owner-approved.",
        "- Keep each field short and suitable for owner/admin review.",
        "",
        `Business name: ${input.businessName}`,
    ];

    if (input.address) lines.push(`Address entered in MenuList: ${input.address}`);
    if (input.latLng) lines.push(`Approximate coordinates: ${input.latLng.latitude}, ${input.latLng.longitude}`);
    if (input.languageCode) lines.push(`Preferred language: ${input.languageCode}`);

    return lines.join("\n");
}

function getResponseText(response: GenerateContentResponse): string {
    return response.text
        || response.candidates?.[0]?.content?.parts?.map((part: any) => part?.text || "").join("")
        || "";
}

function extractJsonObject(text: string): Record<string, unknown> | null {
    const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) return null;

    try {
        return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
        return null;
    }
}

function cleanFactList(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const items = value
        .map((item) => cleanOptionalText(item, 120))
        .filter((item): item is string => Boolean(item))
        .slice(0, MAX_FACT_LIST_ITEMS);
    return items.length ? items : undefined;
}

function parseProposedFacts(parsed: ParsedMapsPlaceFacts | null): MapsPlaceCheckProposedFacts {
    const proposedFacts = parsed?.proposedFacts && typeof parsed.proposedFacts === "object"
        ? parsed.proposedFacts
        : {};

    return {
        address: cleanOptionalText(proposedFacts.address, 300),
        openingHours: cleanOptionalText(proposedFacts.openingHours, 500),
        amenities: cleanFactList(proposedFacts.amenities),
        paymentOptions: cleanFactList(proposedFacts.paymentOptions),
        accessibility: cleanFactList(proposedFacts.accessibility),
        serviceOptions: cleanFactList(proposedFacts.serviceOptions),
    };
}

function getGroundingSources(response: GenerateContentResponse): MapsPlaceCheckSource[] {
    const seen = new Set<string>();
    const sources: MapsPlaceCheckSource[] = [];

    for (const candidate of response.candidates || []) {
        for (const chunk of candidate.groundingMetadata?.groundingChunks || []) {
            const maps = chunk.maps;
            const title = cleanOptionalText(maps?.title, 180);
            const uri = cleanOptionalText(maps?.uri, 500);
            if (!title || !uri) continue;

            const placeId = cleanOptionalText(maps?.placeId, 160);
            const key = `${uri}|${placeId || ""}`;
            if (seen.has(key)) continue;
            seen.add(key);
            sources.push({ title, uri, ...(placeId ? { placeId } : {}) });
        }
    }

    return sources.slice(0, 8);
}

function hasGroundingMetadata(response: GenerateContentResponse): boolean {
    return Boolean(response.candidates?.some((candidate) => candidate.groundingMetadata));
}

function getProviderErrorContext(error: unknown): Record<string, string | number | undefined> {
    const record = error && typeof error === "object" ? error as Record<string, unknown> : {};
    const status = Number(record.status ?? record.statusCode);
    return {
        sourceErrorName: error instanceof Error ? error.name : typeof error,
        sourceErrorCode: typeof record.code === "string" ? record.code.slice(0, 80) : undefined,
        sourceStatusCode: Number.isFinite(status) ? status : undefined,
    };
}

export async function runMapsPlaceCheck(input: MapsPlaceCheckInput): Promise<MapsPlaceCheckResult> {
    const prompt = buildMapsPlaceCheckPrompt(input);
    const retrievalConfig = {
        ...(input.latLng ? { latLng: input.latLng } : {}),
        ...(input.languageCode ? { languageCode: input.languageCode } : {}),
    };

    try {
        const response: GenerateContentResponse = await genAIClient.models.generateContent({
            model: MAPS_PLACE_CHECK_MODEL,
            contents: prompt,
            config: {
                temperature: 0.1,
                maxOutputTokens: 2048,
                responseMimeType: "application/json",
                tools: [{ googleMaps: {} }],
                ...(Object.keys(retrievalConfig).length ? { toolConfig: { retrievalConfig } } : {}),
            },
        });

        const responseText = getResponseText(response);
        const parsed = extractJsonObject(responseText) as ParsedMapsPlaceFacts | null;
        const sources = getGroundingSources(response);
        const attributionRequired = hasGroundingMetadata(response) || sources.length > 0;
        const firstSource = sources[0];
        const proposedFacts = parseProposedFacts(parsed);
        const hasFacts = Object.values(proposedFacts).some((value) => Array.isArray(value) ? value.length > 0 : Boolean(value));

        logger.info("[mapsPlaceCheck] Completed", {
            tenantIdLength: input.tenantId.length,
            storeIdLength: input.storeId.length,
            sourceCount: sources.length,
            attributionRequired,
            hasFacts,
            responseTextLength: responseText.length,
            parsedResponse: Boolean(parsed),
            model: MAPS_PLACE_CHECK_MODEL,
            promptTokenCount: response.usageMetadata?.promptTokenCount,
            candidatesTokenCount: response.usageMetadata?.candidatesTokenCount,
            totalTokenCount: response.usageMetadata?.totalTokenCount,
        });

        if (!attributionRequired) {
            return {
                status: "no_grounded_result",
                attributionRequired: false,
                checkedAt: new Date().toISOString(),
                model: MAPS_PLACE_CHECK_MODEL,
                candidate: null,
            };
        }

        return {
            status: "needs_owner_confirmation",
            attributionRequired,
            checkedAt: new Date().toISOString(),
            model: MAPS_PLACE_CHECK_MODEL,
            candidate: {
                title: cleanOptionalText(parsed?.title, 180) || firstSource?.title,
                placeId: cleanOptionalText(parsed?.placeId, 160) || firstSource?.placeId,
                uri: cleanOptionalText(parsed?.uri, 500) || firstSource?.uri,
                proposedFacts,
                sources,
            },
        };
    } catch (error) {
        logger.error("[mapsPlaceCheck] Failed", {
            failureCode: "MAPS_PLACE_CHECK_FAILED",
            tenantIdLength: input.tenantId.length,
            storeIdLength: input.storeId.length,
            model: MAPS_PLACE_CHECK_MODEL,
            ...getProviderErrorContext(error),
        });
        throw error;
    }
}
