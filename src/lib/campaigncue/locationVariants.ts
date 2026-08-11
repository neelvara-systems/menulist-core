import type {
    CampaignCueBusinessBrain,
    CampaignCueLocation,
    CampaignCueLocationTruthSnapshot,
} from "@type/campaigncue";
import { createHash } from "crypto";

const compact = (value: unknown) => typeof value === "string" ? value.trim() : "";

const compactOptional = (value: unknown) => compact(value) || undefined;

const stableHash = (value: unknown) => (
    createHash("sha256").update(JSON.stringify(value)).digest("hex")
);

export function applyCampaignCueLocationToBusinessBrain(
    businessBrain: CampaignCueBusinessBrain,
    location: CampaignCueLocation,
): CampaignCueBusinessBrain {
    const contacts = location.contacts || {};
    return {
        ...businessBrain,
        locality: compactOptional(location.locality) || businessBrain.locality,
        contacts: {
            ...businessBrain.contacts,
            ...(compactOptional(contacts.phone) ? { phone: compactOptional(contacts.phone) } : {}),
            ...(compactOptional(contacts.whatsapp) ? { whatsapp: compactOptional(contacts.whatsapp) } : {}),
            ...(compactOptional(contacts.bookingUrl) ? { bookingUrl: compactOptional(contacts.bookingUrl) } : {}),
            ...(compactOptional(contacts.publicMenuUrl) ? { publicMenuUrl: compactOptional(contacts.publicMenuUrl) } : {}),
            ...(compactOptional(contacts.website) ? { website: compactOptional(contacts.website) } : {}),
        },
    };
}

export function buildCampaignCueLocationTruthSnapshot(
    businessBrain: CampaignCueBusinessBrain,
    location: CampaignCueLocation,
): CampaignCueLocationTruthSnapshot {
    const locationBrain = applyCampaignCueLocationToBusinessBrain(businessBrain, location);
    const snapshotValue = {
        locationId: location.id,
        name: compact(location.name),
        locality: compactOptional(locationBrain.locality),
        contacts: {
            phone: compactOptional(locationBrain.contacts.phone),
            whatsapp: compactOptional(locationBrain.contacts.whatsapp),
            bookingUrl: compactOptional(locationBrain.contacts.bookingUrl),
            publicMenuUrl: compactOptional(locationBrain.contacts.publicMenuUrl),
            website: compactOptional(locationBrain.contacts.website),
        },
    };
    return {
        ...snapshotValue,
        sourceHash: buildCampaignCueLocationRecordSourceHash(location),
    };
}

export function buildCampaignCueLocationRecordSourceHash(location: CampaignCueLocation): string {
    const contacts = location.contacts || {};
    return stableHash({
        id: location.id,
        name: compact(location.name),
        locality: compactOptional(location.locality),
        contacts: {
            phone: compactOptional(contacts.phone),
            whatsapp: compactOptional(contacts.whatsapp),
            bookingUrl: compactOptional(contacts.bookingUrl),
            publicMenuUrl: compactOptional(contacts.publicMenuUrl),
            website: compactOptional(contacts.website),
        },
        status: location.status,
    });
}

export function buildCampaignCueLocationSourceHash(
    globalSourceHash: string,
    locationSnapshot: Pick<CampaignCueLocationTruthSnapshot, "sourceHash">,
): string {
    return stableHash({
        globalSourceHash: compact(globalSourceHash),
        locationSourceHash: locationSnapshot.sourceHash,
    });
}

export function buildCampaignCueLocationVariantGroupId(requestHash: string): string {
    return `cc_variant_group_${stableHash(requestHash).slice(0, 24)}`;
}

export function buildCampaignCueLocationVariantCampaignId(groupId: string, locationId: string): string {
    return `cc_campaign_variant_${stableHash({ groupId, locationId }).slice(0, 24)}`;
}
