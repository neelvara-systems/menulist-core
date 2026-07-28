import {
    SIGNALDESK_APIFY_API_BASE,
    SIGNALDESK_FHRS_API_BASE,
    SIGNALDESK_GOOGLE_PLACES_FIELD_MASK,
    SIGNALDESK_GOOGLE_PLACES_TEXT_SEARCH_ENDPOINT,
    SIGNALDESK_INTEGRATION_ENV,
} from "@constant/signaldesk/integrations";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";
import {
    SignalDeskTargetImportRowSchema,
    type SignalDeskTargetImportRow,
} from "@lib/signaldesk/targetContracts";
import type { SignalDeskSourceProviderId } from "@type/signaldesk";
import { getBoundedErrorName } from '@lib/monitoring/boundedLogContext';

type SourceProviderInput = {
    city?: string;
    country?: string;
    maxResults: number;
    provider: SignalDeskSourceProviderId;
    query: string;
};

type UnknownRecord = Record<string, unknown>;

const env = (key: string) => process.env[key]?.trim() || "";
const clampMaxResults = (value: number) => Number.isFinite(value)
    ? Math.min(Math.max(Math.floor(value), 1), 30)
    : 1;
const SIGNALDESK_SOURCE_PROVIDER_JSON_MAX_BYTES = 512 * 1024;
const SIGNALDESK_SOURCE_PROVIDER_RESPONSE_PARSE_FAILED = "signaldesk_source_provider_response_parse_failed";
const SOURCE_PROVIDER_REQUEST_FAILED = "SOURCE_PROVIDER_REQUEST_FAILED";
const SOURCE_PROVIDER_TIMEOUT = "SOURCE_PROVIDER_TIMEOUT";
const estimateApifyCostCapUsd = (maxResults: number) => (
    Math.min(0.3, Math.max(0.05, clampMaxResults(maxResults) * 0.01))
);
const normalizeApifyActorId = (actorId: string) => actorId.trim().replace(/\//g, "~");
const FHRS_BUSINESS_TYPE_IDS: Array<{ id: number; tokens: string[] }> = [
    { id: 1, tokens: ["restaurant", "cafe", "canteen", "coffee"] },
    { id: 7844, tokens: ["takeaway", "sandwich"] },
    { id: 7843, tokens: ["pub", "bar", "nightclub"] },
    { id: 7846, tokens: ["mobile caterer", "food truck", "food van", "caterer"] },
    { id: 7842, tokens: ["hotel", "bed and breakfast", "guest house"] },
    { id: 7841, tokens: ["catering", "caterers"] },
];

class SourceProviderResponseError extends Error {
    readonly code: string;
    readonly provider: SignalDeskSourceProviderId;
    readonly status: number;

    constructor(provider: SignalDeskSourceProviderId, status: number) {
        super(SIGNALDESK_SOURCE_PROVIDER_RESPONSE_PARSE_FAILED);
        this.code = SIGNALDESK_SOURCE_PROVIDER_RESPONSE_PARSE_FAILED;
        this.provider = provider;
        this.status = status;
    }
}

async function readSourceProviderJsonResponse(
    response: Response,
    provider: SignalDeskSourceProviderId,
): Promise<unknown> {
    try {
        return await readJsonResponseWithLimit<unknown>(response, SIGNALDESK_SOURCE_PROVIDER_JSON_MAX_BYTES);
    } catch (error) {
        logRuntimeFailure(SIGNALDESK_SOURCE_PROVIDER_RESPONSE_PARSE_FAILED, error, {
            product: "signaldesk",
            responseStatus: response.status,
            ...getBoundedRuntimeStringContext("provider", provider),
        });
        throw new SourceProviderResponseError(provider, response.status);
    }
}

const asRecord = (value: unknown): UnknownRecord | null => (
    typeof value === "object" && value !== null && !Array.isArray(value)
        ? value as UnknownRecord
        : null
);

const at = (value: unknown, ...path: string[]): unknown => {
    let current: unknown = value;
    for (const key of path) {
        const record = asRecord(current);
        if (!record) return undefined;
        current = record[key];
    }
    return current;
};

const firstString = (maximum: number, ...values: unknown[]) => {
    for (const value of values) {
        if (typeof value === "string" && value.trim()) {
            const normalized = value.trim();
            if (normalized.length <= maximum) return normalized;
        }
        if (typeof value === "number" && Number.isFinite(value)) {
            const normalized = String(value);
            if (normalized.length <= maximum) return normalized;
        }
    }
    return "";
};

const firstArrayString = (value: unknown) => {
    if (!Array.isArray(value)) return "";
    return value.slice(0, 20).map((item) => firstString(
        80,
        item,
        at(item, "name"),
        at(item, "title"),
        at(item, "category"),
    )).filter(Boolean).join(", ").slice(0, 120);
};

const normalizeProviderRow = (value: unknown): SignalDeskTargetImportRow | null => {
    const parsed = SignalDeskTargetImportRowSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
};

type OptionalProviderField = Exclude<keyof SignalDeskTargetImportRow, "displayName">;

const normalizeOptionalProviderField = <Field extends OptionalProviderField>(
    field: Field,
    value: unknown,
): SignalDeskTargetImportRow[Field] | undefined => {
    if (value === undefined || value === null || value === "") return undefined;
    const parsed = SignalDeskTargetImportRowSchema.safeParse({
        displayName: "Provider field validation",
        [field]: value,
    });
    return parsed.success ? parsed.data[field] : undefined;
};

const firstValidProviderUrl = (
    field: "currentListUrl" | "providerRecordUrl" | "website",
    ...values: unknown[]
) => {
    for (const value of values) {
        const candidate = firstString(500, value);
        const normalized = normalizeOptionalProviderField(field, candidate);
        if (normalized) return normalized;
    }
    return undefined;
};

const normalizeInstagramHandle = (...values: unknown[]) => {
    for (const value of values) {
        const candidate = firstString(500, value);
        if (!candidate) continue;
        let handle = candidate;
        try {
            const url = new URL(candidate);
            if (!/(^|\.)instagram\.com$/i.test(url.hostname)) continue;
            handle = url.pathname.split("/").filter(Boolean)[0] || "";
        } catch {
            // A plain handle remains valid input for the shared row contract.
        }
        const normalized = normalizeOptionalProviderField("instagram", handle);
        if (normalized) return normalized;
    }
    return undefined;
};

const providerFetch = async (provider: SignalDeskSourceProviderId, url: string, init: RequestInit, timeoutMs: number) => {
    try {
        return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
        if (["AbortError", "TimeoutError"].includes(getBoundedErrorName(error) || "")) {
            throw new Error(SOURCE_PROVIDER_TIMEOUT);
        }
        logRuntimeFailure("signaldesk_source_provider_request_failed", error, {
            product: "signaldesk",
            ...getBoundedRuntimeStringContext("provider", provider),
        });
        throw new Error(SOURCE_PROVIDER_REQUEST_FAILED);
    }
};

const inferFhrsBusinessTypeId = (query: string) => {
    const normalized = query.toLowerCase();
    return FHRS_BUSINESS_TYPE_IDS.find((entry) => (
        entry.tokens.some((token) => normalized.includes(token))
    ))?.id || null;
};

const joinAddress = (item: unknown) => [
    at(item, "AddressLine1"),
    at(item, "AddressLine2"),
    at(item, "AddressLine3"),
    at(item, "AddressLine4"),
    at(item, "PostCode"),
].map((part) => firstString(120, part)).filter(Boolean).join(", ").slice(0, 300);

const normalizePlaceRow = (place: unknown, input: SourceProviderInput): SignalDeskTargetImportRow | null => {
    const displayName = firstString(180, at(place, "displayName", "text"));
    if (!displayName) return null;
    const businessStatus = firstString(80, at(place, "businessStatus"));
    const formattedAddress = firstString(240, at(place, "formattedAddress"));
    const mapsUrl = firstValidProviderUrl("providerRecordUrl", at(place, "googleMapsUri"));
    return normalizeProviderRow({
        category: firstString(120, at(place, "primaryType")).replace(/_/g, " ") || undefined,
        city: firstString(120, input.city) || undefined,
        country: firstString(120, input.country) || undefined,
        displayName,
        notes: [
            businessStatus ? `Google business status: ${businessStatus}` : "",
            formattedAddress ? `Address: ${formattedAddress}` : "",
        ].filter(Boolean).join(" | ").slice(0, 500) || undefined,
        providerRecordId: firstString(240, at(place, "id")) || undefined,
        providerRecordUrl: mapsUrl || undefined,
    });
};

async function runGooglePlacesSearch(input: SourceProviderInput): Promise<SignalDeskTargetImportRow[]> {
    const apiKey = env(SIGNALDESK_INTEGRATION_ENV.GOOGLE_PLACES_API_KEY);
    if (!apiKey) throw new Error("Google Places provider is not configured");
    const maxResults = clampMaxResults(input.maxResults);
    const textQuery = [input.query, input.city, input.country]
        .map((value) => firstString(160, value))
        .filter(Boolean)
        .join(" ")
        .slice(0, 300);
    const response = await providerFetch(input.provider, SIGNALDESK_GOOGLE_PLACES_TEXT_SEARCH_ENDPOINT, {
        body: JSON.stringify({ pageSize: maxResults, textQuery }),
        redirect: "manual",
        headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": SIGNALDESK_GOOGLE_PLACES_FIELD_MASK,
        },
        method: "POST",
    }, 20_000);
    if (!response.ok) throw new Error(`GOOGLE_PLACES_PROVIDER_FAILED_${response.status}`);
    const payload = await readSourceProviderJsonResponse(response, input.provider);
    const places = at(payload, "places");
    return (Array.isArray(places) ? places : [])
        .slice(0, 100)
        .map((place) => normalizePlaceRow(place, input))
        .filter((row): row is SignalDeskTargetImportRow => row !== null)
        .slice(0, maxResults);
}

const normalizeApifyRow = (item: unknown, input: SourceProviderInput): SignalDeskTargetImportRow | null => {
    const displayName = firstString(180, at(item, "title"), at(item, "name"), at(item, "businessName"), at(item, "companyName"), at(item, "placeName"));
    if (!displayName) return null;
    const category = firstString(120, at(item, "category"), at(item, "categoryName"), at(item, "mainCategory"), firstArrayString(at(item, "categories")));
    const city = firstString(120, at(item, "city"), at(item, "cityName"), at(item, "address", "city"), input.city);
    const country = firstString(120, at(item, "country"), at(item, "countryCode"), at(item, "address", "country"), input.country);
    const website = firstValidProviderUrl("website", at(item, "website"), at(item, "websiteUrl"), at(item, "site"), at(item, "homepage"));
    const mapsUrl = firstValidProviderUrl("providerRecordUrl", at(item, "googleMapsUrl"), at(item, "googleMapsUri"), at(item, "googleUrl"), at(item, "placeUrl"), at(item, "url"));
    const currentListUrl = firstValidProviderUrl("currentListUrl", at(item, "currentListUrl"), at(item, "menuUrl"), at(item, "menuLink"));
    const address = firstString(240, at(item, "address"), at(item, "formattedAddress"), at(item, "location", "address"));
    const emails = at(item, "emails");
    const phones = at(item, "phones");
    const emailValue = Array.isArray(emails) ? emails[0] : emails;
    const phoneValue = Array.isArray(phones) ? phones[0] : phones;
    const phone = normalizeOptionalProviderField("phone", firstString(80, at(item, "phone"), at(item, "phoneNumber"), at(item, "phoneUnformatted"), at(item, "contactPhone"), phoneValue));
    const email = normalizeOptionalProviderField("email", firstString(180, at(item, "email"), at(item, "contactEmail"), emailValue));
    const instagram = normalizeInstagramHandle(at(item, "instagram"), at(item, "instagramUrl"), at(item, "socials", "instagram"));
    const rating = firstString(40, at(item, "totalScore"));
    const reviews = firstString(40, at(item, "reviewsCount"));
    return normalizeProviderRow({
        category: category || undefined,
        city: city || undefined,
        country: country || undefined,
        currentListUrl,
        displayName,
        email: email || undefined,
        instagram: instagram || undefined,
        notes: [
            "Apify normalized dataset item.",
            address ? `Address: ${address}` : "",
            rating ? `Rating: ${rating}` : "",
            reviews ? `Reviews: ${reviews}` : "",
        ].filter(Boolean).join(" | ").slice(0, 500),
        phone: phone || undefined,
        providerRecordId: firstString(240, at(item, "placeId"), at(item, "id"), at(item, "cid"), at(item, "businessId")) || undefined,
        providerRecordUrl: mapsUrl,
        website,
    });
};

async function runApifySourceSearch(input: SourceProviderInput): Promise<SignalDeskTargetImportRow[]> {
    const apiToken = env(SIGNALDESK_INTEGRATION_ENV.APIFY_API_TOKEN);
    const actorId = normalizeApifyActorId(env(SIGNALDESK_INTEGRATION_ENV.APIFY_SOURCE_ACTOR_ID));
    if (!apiToken || !actorId) throw new Error("Apify provider is not configured");
    const maxResults = clampMaxResults(input.maxResults);
    const maxChargeUsd = estimateApifyCostCapUsd(maxResults);
    const textQuery = [input.query, input.city, input.country].map((value) => firstString(160, value)).filter(Boolean).join(" ").slice(0, 300);
    const locationQuery = [input.city, input.country].map((value) => firstString(120, value)).filter(Boolean).join(", ").slice(0, 240);
    const endpoint = new URL(`/v2/actors/${encodeURIComponent(actorId)}/run-sync-get-dataset-items`, SIGNALDESK_APIFY_API_BASE);
    endpoint.searchParams.set("clean", "true");
    endpoint.searchParams.set("format", "json");
    endpoint.searchParams.set("limit", String(maxResults));
    endpoint.searchParams.set("maxItems", String(maxResults));
    endpoint.searchParams.set("maxTotalChargeUsd", maxChargeUsd.toFixed(2));
    endpoint.searchParams.set("timeout", "120");
    const response = await providerFetch(input.provider, endpoint.toString(), {
        body: JSON.stringify({ language: "en", locationQuery, maxCrawledPlacesPerSearch: maxResults, searchStringsArray: [textQuery] }),
        redirect: "manual",
        headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
        method: "POST",
    }, 130_000);
    if (!response.ok) throw new Error(`APIFY_PROVIDER_FAILED_${response.status}`);
    const payload = await readSourceProviderJsonResponse(response, input.provider);
    const items = Array.isArray(payload)
        ? payload
        : Array.isArray(at(payload, "items"))
            ? at(payload, "items") as unknown[]
            : Array.isArray(at(payload, "data", "items"))
                ? at(payload, "data", "items") as unknown[]
                : [];
    return items.slice(0, 100)
        .map((item) => normalizeApifyRow(item, input))
        .filter((row): row is SignalDeskTargetImportRow => row !== null)
        .slice(0, maxResults);
}

const normalizeFhrsRow = (item: unknown, input: SourceProviderInput): SignalDeskTargetImportRow | null => {
    const displayName = firstString(180, at(item, "BusinessName"));
    if (!displayName) return null;
    const fhrsId = firstString(240, at(item, "FHRSID"));
    const address = joinAddress(item);
    const schemeType = firstString(80, at(item, "SchemeType"));
    const ratingValue = firstString(40, at(item, "RatingValue"));
    const ratingDate = firstString(40, at(item, "RatingDate")).slice(0, 10);
    const localAuthority = firstString(120, at(item, "LocalAuthorityName"));
    const newRatingPending = at(item, "NewRatingPending") === true ? "New rating pending" : "";
    const geocode = [firstString(40, at(item, "geocode", "latitude")), firstString(40, at(item, "geocode", "longitude"))].filter(Boolean).join(",");
    return normalizeProviderRow({
        category: firstString(120, at(item, "BusinessType")) || undefined,
        city: firstString(120, input.city, localAuthority) || undefined,
        country: firstString(120, input.country, "UK"),
        displayName,
        notes: [
            "FHRS/FHIS official establishment seed. No contact permission is inferred.",
            schemeType ? `Scheme: ${schemeType}` : "",
            ratingValue ? `Rating: ${ratingValue}` : "",
            ratingDate ? `Rating date: ${ratingDate}` : "",
            localAuthority ? `Local authority: ${localAuthority}` : "",
            address ? `Address: ${address}` : "",
            geocode ? `Geocode: ${geocode}` : "",
            newRatingPending,
        ].filter(Boolean).join(" | ").slice(0, 500),
        providerRecordId: fhrsId || undefined,
        providerRecordUrl: fhrsId ? `${SIGNALDESK_FHRS_API_BASE}/Establishments/${encodeURIComponent(fhrsId)}` : undefined,
    });
};

async function runFhrsFhisSourceSearch(input: SourceProviderInput): Promise<SignalDeskTargetImportRow[]> {
    const maxResults = clampMaxResults(input.maxResults);
    const endpoint = new URL("/Establishments", SIGNALDESK_FHRS_API_BASE);
    const query = firstString(160, input.query);
    const businessTypeId = inferFhrsBusinessTypeId(query);
    endpoint.searchParams.set("pageNumber", "1");
    endpoint.searchParams.set("pageSize", String(maxResults));
    endpoint.searchParams.set("sortOptionKey", "Relevance");
    if (businessTypeId) endpoint.searchParams.set("businessTypeId", String(businessTypeId));
    else endpoint.searchParams.set("name", query);
    if (input.city || input.country) endpoint.searchParams.set("address", [input.city, input.country].map((value) => firstString(120, value)).filter(Boolean).join(" "));
    const response = await providerFetch(input.provider, endpoint.toString(), {
        redirect: "manual",
        headers: { Accept: "application/json", "x-api-version": "2" },
        method: "GET",
    }, 20_000);
    if (!response.ok) throw new Error(`FHRS_FHIS_PROVIDER_FAILED_${response.status}`);
    const payload = await readSourceProviderJsonResponse(response, input.provider);
    const establishments = at(payload, "establishments");
    return (Array.isArray(establishments) ? establishments : [])
        .slice(0, 100)
        .map((item) => normalizeFhrsRow(item, input))
        .filter((row): row is SignalDeskTargetImportRow => row !== null)
        .slice(0, maxResults);
}

export async function runSignalDeskSourceProvider(input: SourceProviderInput): Promise<SignalDeskTargetImportRow[]> {
    if (input.provider === "google-places") return runGooglePlacesSearch(input);
    if (input.provider === "apify") return runApifySourceSearch(input);
    if (input.provider === "fhrs-fhis") return runFhrsFhisSourceSearch(input);
    if (input.provider === "foursquare") throw new Error("Foursquare provider is blocked pending source approval");
    throw new Error("Source provider is not configured");
}
