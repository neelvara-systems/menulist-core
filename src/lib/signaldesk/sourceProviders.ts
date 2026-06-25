import {
    SIGNALDESK_APIFY_API_BASE,
    SIGNALDESK_FHRS_API_BASE,
    SIGNALDESK_GOOGLE_PLACES_FIELD_MASK,
    SIGNALDESK_GOOGLE_PLACES_TEXT_SEARCH_ENDPOINT,
    SIGNALDESK_INTEGRATION_ENV,
} from "@constant/signaldesk/integrations";
import type { SignalDeskSourceProviderId } from "@type/signaldesk";

type SourceProviderInput = {
    city?: string;
    country?: string;
    maxResults: number;
    provider: SignalDeskSourceProviderId;
    query: string;
};

type SourceProviderTargetRow = {
    category?: string;
    city?: string;
    country?: string;
    currentListUrl?: string;
    displayName: string;
    email?: string;
    instagram?: string;
    notes?: string;
    phone?: string;
    providerRecordId?: string;
    providerRecordUrl?: string;
    website?: string;
};

const env = (key: string) => process.env[key]?.trim() || "";
const clampMaxResults = (value: number) => Math.min(Math.max(value, 1), 20);
const estimateApifyCostCapUsd = (maxResults: number) => (
    Math.min(0.25, Math.max(0.05, clampMaxResults(maxResults) * 0.01))
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

const firstString = (...values: unknown[]) => {
    for (const value of values) {
        if (typeof value === "string" && value.trim()) return value.trim();
        if (typeof value === "number" && Number.isFinite(value)) return String(value);
    }
    return "";
};

const firstArrayString = (value: unknown) => {
    if (!Array.isArray(value)) return "";
    return value.map((item) => (
        typeof item === "string"
            ? item
            : firstString((item as any)?.name, (item as any)?.title, (item as any)?.category)
    )).filter(Boolean).join(", ");
};

const inferFhrsBusinessTypeId = (query: string) => {
    const normalized = query.toLowerCase();
    return FHRS_BUSINESS_TYPE_IDS.find((entry) => (
        entry.tokens.some((token) => normalized.includes(token))
    ))?.id || null;
};

const joinAddress = (item: any) => [
    item?.AddressLine1,
    item?.AddressLine2,
    item?.AddressLine3,
    item?.AddressLine4,
    item?.PostCode,
].map((part) => firstString(part)).filter(Boolean).join(", ");

const normalizePlaceRow = (place: any, input: SourceProviderInput): SourceProviderTargetRow | null => {
    const displayName = String(place?.displayName?.text || "").trim();
    if (!displayName) return null;
    return {
        category: String(place?.primaryType || "").replace(/_/g, " ") || undefined,
        city: input.city,
        country: input.country,
        currentListUrl: String(place?.googleMapsUri || ""),
        displayName,
        notes: [
            place?.businessStatus ? `Google business status: ${place.businessStatus}` : "",
            place?.formattedAddress ? `Address: ${place.formattedAddress}` : "",
        ].filter(Boolean).join(" | ") || undefined,
        providerRecordId: String(place?.id || ""),
        providerRecordUrl: String(place?.googleMapsUri || ""),
    };
};

async function runGooglePlacesSearch(input: SourceProviderInput): Promise<SourceProviderTargetRow[]> {
    const apiKey = env(SIGNALDESK_INTEGRATION_ENV.GOOGLE_PLACES_API_KEY);
    if (!apiKey) throw new Error("Google Places provider is not configured");

    const textQuery = [input.query, input.city, input.country].filter(Boolean).join(" ");
    const response = await fetch(SIGNALDESK_GOOGLE_PLACES_TEXT_SEARCH_ENDPOINT, {
        body: JSON.stringify({
            pageSize: clampMaxResults(input.maxResults),
            textQuery,
        }),
        headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": SIGNALDESK_GOOGLE_PLACES_FIELD_MASK,
        },
        method: "POST",
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`Google Places provider failed: ${response.status}`);

    return (Array.isArray(payload?.places) ? payload.places : [])
        .map((place: any) => normalizePlaceRow(place, input))
        .filter(Boolean)
        .slice(0, clampMaxResults(input.maxResults)) as SourceProviderTargetRow[];
}

const normalizeApifyRow = (item: any, input: SourceProviderInput): SourceProviderTargetRow | null => {
    const displayName = firstString(
        item?.title,
        item?.name,
        item?.businessName,
        item?.companyName,
        item?.placeName,
    );
    if (!displayName) return null;

    const category = firstString(
        item?.category,
        item?.categoryName,
        item?.mainCategory,
        firstArrayString(item?.categories),
    );
    const city = firstString(item?.city, item?.cityName, item?.address?.city, input.city);
    const country = firstString(item?.country, item?.countryCode, item?.address?.country, input.country);
    const website = firstString(item?.website, item?.websiteUrl, item?.site, item?.homepage);
    const mapsUrl = firstString(
        item?.googleMapsUrl,
        item?.googleMapsUri,
        item?.googleUrl,
        item?.placeUrl,
        item?.url,
    );
    const address = firstString(item?.address, item?.formattedAddress, item?.location?.address);
    const emailValue = Array.isArray(item?.emails) ? item.emails[0] : item?.emails;
    const phoneValue = Array.isArray(item?.phones) ? item.phones[0] : item?.phones;
    const socials = typeof item?.socials === "object" && item.socials ? item.socials : {};
    const phone = firstString(item?.phone, item?.phoneNumber, item?.phoneUnformatted, item?.contactPhone, phoneValue);
    const email = firstString(item?.email, item?.contactEmail, emailValue);
    const instagram = firstString(item?.instagram, item?.instagramUrl, (socials as any).instagram);

    return {
        category: category || undefined,
        city: city || undefined,
        country: country || undefined,
        currentListUrl: mapsUrl || undefined,
        displayName,
        email: email || undefined,
        instagram: instagram || undefined,
        notes: [
            "Apify normalized dataset item.",
            address ? `Address: ${address}` : "",
            item?.totalScore ? `Rating: ${item.totalScore}` : "",
            item?.reviewsCount ? `Reviews: ${item.reviewsCount}` : "",
        ].filter(Boolean).join(" | "),
        phone: phone || undefined,
        providerRecordId: firstString(item?.placeId, item?.id, item?.cid, item?.businessId),
        providerRecordUrl: mapsUrl || website || undefined,
        website: website || undefined,
    };
};

async function runApifySourceSearch(input: SourceProviderInput): Promise<SourceProviderTargetRow[]> {
    const apiToken = env(SIGNALDESK_INTEGRATION_ENV.APIFY_API_TOKEN);
    const actorId = normalizeApifyActorId(env(SIGNALDESK_INTEGRATION_ENV.APIFY_SOURCE_ACTOR_ID));
    if (!apiToken || !actorId) throw new Error("Apify provider is not configured");

    const maxResults = clampMaxResults(input.maxResults);
    const maxChargeUsd = estimateApifyCostCapUsd(maxResults);
    const textQuery = [input.query, input.city, input.country].filter(Boolean).join(" ");
    const locationQuery = [input.city, input.country].filter(Boolean).join(", ");
    const endpoint = new URL(`/v2/actors/${encodeURIComponent(actorId)}/run-sync-get-dataset-items`, SIGNALDESK_APIFY_API_BASE);
    endpoint.searchParams.set("clean", "true");
    endpoint.searchParams.set("format", "json");
    endpoint.searchParams.set("limit", String(maxResults));
    endpoint.searchParams.set("maxItems", String(maxResults));
    endpoint.searchParams.set("maxTotalChargeUsd", maxChargeUsd.toFixed(2));
    endpoint.searchParams.set("timeout", "120");

    const response = await fetch(endpoint.toString(), {
        body: JSON.stringify({
            language: "en",
            locationQuery,
            maxCrawledPlacesPerSearch: maxResults,
            searchStringsArray: [textQuery],
        }),
        headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
        },
        method: "POST",
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`Apify provider failed: ${response.status}`);

    const items = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(payload?.data?.items)
                ? payload.data.items
                : [];

    return items
        .map((item: any) => normalizeApifyRow(item, input))
        .filter(Boolean)
        .slice(0, maxResults) as SourceProviderTargetRow[];
}

const normalizeFhrsRow = (item: any, input: SourceProviderInput): SourceProviderTargetRow | null => {
    const displayName = firstString(item?.BusinessName);
    if (!displayName) return null;

    const fhrsId = firstString(item?.FHRSID);
    const address = joinAddress(item);
    const schemeType = firstString(item?.SchemeType);
    const ratingValue = firstString(item?.RatingValue);
    const ratingDate = firstString(item?.RatingDate).slice(0, 10);
    const localAuthority = firstString(item?.LocalAuthorityName);
    const newRatingPending = item?.NewRatingPending === true ? "New rating pending" : "";
    const geocode = item?.geocode && typeof item.geocode === "object"
        ? [firstString(item.geocode.latitude), firstString(item.geocode.longitude)].filter(Boolean).join(",")
        : "";

    return {
        category: firstString(item?.BusinessType) || undefined,
        city: input.city || localAuthority || undefined,
        country: input.country || "UK",
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
        ].filter(Boolean).join(" | "),
        providerRecordId: fhrsId,
        providerRecordUrl: fhrsId
            ? `${SIGNALDESK_FHRS_API_BASE}/Establishments/${encodeURIComponent(fhrsId)}`
            : undefined,
    };
};

async function runFhrsFhisSourceSearch(input: SourceProviderInput): Promise<SourceProviderTargetRow[]> {
    const maxResults = clampMaxResults(input.maxResults);
    const endpoint = new URL("/Establishments", SIGNALDESK_FHRS_API_BASE);
    const businessTypeId = inferFhrsBusinessTypeId(input.query);
    endpoint.searchParams.set("pageNumber", "1");
    endpoint.searchParams.set("pageSize", String(maxResults));
    endpoint.searchParams.set("sortOptionKey", "Relevance");
    if (businessTypeId) {
        endpoint.searchParams.set("businessTypeId", String(businessTypeId));
    } else {
        endpoint.searchParams.set("name", input.query);
    }
    if (input.city || input.country) {
        endpoint.searchParams.set("address", [input.city, input.country].filter(Boolean).join(" "));
    }

    const response = await fetch(endpoint.toString(), {
        headers: {
            Accept: "application/json",
            "x-api-version": "2",
        },
        method: "GET",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`FHRS/FHIS provider failed: ${response.status}`);

    return (Array.isArray(payload?.establishments) ? payload.establishments : [])
        .map((item: any) => normalizeFhrsRow(item, input))
        .filter(Boolean)
        .slice(0, maxResults) as SourceProviderTargetRow[];
}

export async function runSignalDeskSourceProvider(input: SourceProviderInput): Promise<SourceProviderTargetRow[]> {
    if (input.provider === "google-places") return runGooglePlacesSearch(input);
    if (input.provider === "apify") return runApifySourceSearch(input);
    if (input.provider === "fhrs-fhis") return runFhrsFhisSourceSearch(input);
    if (input.provider === "foursquare") throw new Error("Foursquare provider is blocked pending source approval");
    throw new Error("Source provider is not configured");
}
