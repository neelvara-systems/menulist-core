import { isCampaignCueReadyVisualAsset } from "@lib/campaigncue/mediaMissions";
import {
    buildCampaignCuePresencePassport,
    evaluateCampaignCuePackFreshness,
    isCampaignCueDecisionSourceInput,
} from "@lib/campaigncue/operatingLoop";
import type {
    CampaignCueAsset,
    CampaignCueBusinessBrain,
    CampaignCueCampaign,
    CampaignCueLocalVisibilityCue,
    CampaignCueLocation,
    CampaignCueSourceInput,
} from "@type/campaigncue";

const toTime = (value: unknown) => {
    if (!value) return 0;
    const date = value instanceof Date
        ? value
        : typeof value === "string" || typeof value === "number"
            ? new Date(value)
            : typeof (value as { toDate?: unknown }).toDate === "function"
                ? (value as { toDate: () => Date }).toDate()
                : null;
    return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
};

const priorityForStatus = (
    status: CampaignCueLocalVisibilityCue["status"],
): CampaignCueLocalVisibilityCue["priority"] => (
    status === "missing" ? "do_now" : status === "needs_review" ? "review" : "ready"
);

const cue = (
    value: Omit<CampaignCueLocalVisibilityCue, "priority">,
): CampaignCueLocalVisibilityCue => ({
    ...value,
    priority: priorityForStatus(value.status),
    evidence: value.evidence.slice(0, 5),
    manualSteps: value.manualSteps.slice(0, 4),
    sourceReferences: Array.from(new Set(value.sourceReferences)).slice(0, 8),
    unlocks: value.unlocks.slice(0, 5),
});

export function buildCampaignCueLocalVisibilityActions(params: {
    assets: CampaignCueAsset[];
    businessBrain: CampaignCueBusinessBrain;
    campaigns: CampaignCueCampaign[];
    locations: CampaignCueLocation[];
    now?: Date;
    sourceInputs: CampaignCueSourceInput[];
}): CampaignCueLocalVisibilityCue[] {
    const now = params.now || new Date();
    const confirmedImages = params.assets.filter((asset) => (
        (asset.assetType === "image" || asset.assetType === "logo")
        && isCampaignCueReadyVisualAsset(asset)
    ));
    const activeLocations = params.locations.filter((location) => location.status === "active");
    const incompleteLocations = activeLocations.filter((location) => !location.locality?.trim());
    const currentInputs = params.sourceInputs.filter((input) => isCampaignCueDecisionSourceInput(input, now));
    const expiredInputs = params.sourceInputs.filter((input) => (
        input.sourceType !== "inspiration_pattern"
        && Boolean(toTime(input.expiresAt) && toTime(input.expiresAt) < now.getTime())
    ));
    const presencePassport = buildCampaignCuePresencePassport(params.businessBrain);
    const readyPresence = presencePassport.filter((profile) => profile.status === "ready");
    const googleProfile = presencePassport.find((profile) => profile.id === "presence_google");
    const reviewDestination = presencePassport.find((profile) => profile.id === "presence_google_review");
    const customerDestination = params.businessBrain.contacts.bookingUrl
        || params.businessBrain.contacts.publicMenuUrl
        || params.businessBrain.contacts.website
        || params.businessBrain.contacts.whatsapp
        || params.businessBrain.contacts.phone;
    const latestGoogleCampaign = params.campaigns
        .filter((campaign) => (
            campaign.status !== "archived"
            && campaign.outputs.some((output) => output.channel === "google_local")
        ))
        .sort((left, right) => {
            const delta = toTime(right.updatedAt || right.createdAt) - toTime(left.updatedAt || left.createdAt);
            return delta || right.id.localeCompare(left.id);
        })[0];
    const googleFreshness = evaluateCampaignCuePackFreshness({
        freshness: latestGoogleCampaign?.pack?.freshness,
        now,
    });
    const googleReady = Boolean(
        latestGoogleCampaign
        && latestGoogleCampaign.trustGate === "clear"
        && googleFreshness.status === "current",
    );
    const identityReady = Boolean(params.businessBrain.name.trim() && (params.businessBrain.locality?.trim() || activeLocations.length));
    const branchStatus: CampaignCueLocalVisibilityCue["status"] = !activeLocations.length
        ? "ready"
        : incompleteLocations.length
            ? "needs_review"
            : "ready";

    const actions: CampaignCueLocalVisibilityCue[] = [
        cue({
            id: "visibility_identity",
            category: "identity",
            label: "Local business identity",
            detail: identityReady
                ? "Business name and local area are available for customer-facing handoff."
                : "Add the area, city, or active branch before preparing locality-specific copy.",
            actionLabel: identityReady ? "Review business details" : "Add local area",
            status: identityReady ? "ready" : "missing",
            targetTab: "details",
            actionKind: "open_tab",
            evidenceLevel: "business_truth",
            evidence: [
                params.businessBrain.name ? "Business name is saved." : "Business name is missing.",
                params.businessBrain.locality ? "Local area is saved." : `${activeLocations.length} active branch record${activeLocations.length === 1 ? "" : "s"} found.`,
            ],
            manualSteps: ["Review the business name and local area.", "Save corrections in Business details before creating a new pack."],
            unlocks: ["Local Google copy", "Locality line in campaign packs", "Location-aware print handoff"],
            completionSource: "business_brain",
            sourceReferences: activeLocations.map((location) => location.id),
        }),
        cue({
            id: "visibility_customer_destination",
            category: "destination",
            label: "Customer destination",
            detail: customerDestination
                ? "A confirmed contact, booking, menu, or website destination is available."
                : "Add one customer next step before preparing a local update.",
            actionLabel: customerDestination ? "Review destination" : "Add destination",
            status: customerDestination ? "ready" : "missing",
            targetTab: "details",
            actionKind: "open_tab",
            evidenceLevel: "business_truth",
            evidence: [customerDestination ? "One Business Brain customer destination is saved." : "No customer destination is saved."],
            manualSteps: ["Choose the destination customers should use.", "Confirm it opens the correct owner-managed contact or page."],
            unlocks: ["Google CTA", "WhatsApp handoff", "Hosted Offer Page", "QR destination"],
            completionSource: "business_brain",
            sourceReferences: [],
        }),
        cue({
            id: "visibility_profile_destinations",
            category: "profile",
            label: "Owner-managed profiles",
            detail: readyPresence.length
                ? `${readyPresence.length} owner-managed destination${readyPresence.length === 1 ? " is" : "s are"} saved for manual handoff.`
                : "Add the profiles customers use to find, contact, or review the business.",
            actionLabel: "Review destinations",
            status: googleProfile?.destination || readyPresence.length ? "ready" : "missing",
            targetTab: "visibility",
            actionKind: "open_tab",
            evidenceLevel: "business_truth",
            evidence: presencePassport.map((profile) => `${profile.label}: ${profile.status === "ready" ? "saved" : "not saved"}`),
            manualSteps: ["Open each saved destination.", "Correct stale links in CampaignCue before creating the next pack."],
            unlocks: ["Manual local-profile handoff", "Review request pack", "Channel-specific instructions"],
            completionSource: "business_brain",
            sourceReferences: readyPresence.map((profile) => profile.id),
        }),
        cue({
            id: "visibility_fresh_google_pack",
            category: "content",
            label: "Current Google-ready pack",
            detail: googleReady
                ? "A trust-clear Google-ready output is inside its saved truth window."
                : latestGoogleCampaign
                    ? `The latest Google-ready output is ${googleFreshness.status === "unknown" ? "missing a current truth receipt" : googleFreshness.status}. Create a fresh pack before use.`
                    : "Prepare a Google update, offer, or event draft from current facts.",
            actionLabel: googleReady ? "Open Google handoff" : "Create visibility pack",
            status: googleReady ? "ready" : latestGoogleCampaign ? "needs_review" : "missing",
            targetTab: googleReady ? "google" : "cues",
            actionKind: googleReady ? "open_tab" : "create_visibility_pack",
            evidenceLevel: "derived_readiness",
            evidence: latestGoogleCampaign
                ? [`Latest Google-ready campaign: ${latestGoogleCampaign.title}.`, `Trust: ${latestGoogleCampaign.trustGate}.`, `Truth receipt: ${googleFreshness.status}.`]
                : ["No non-archived Google-ready campaign output is available."],
            manualSteps: googleReady
                ? ["Open the Google handoff card.", "Copy the checked fields into the owner-managed profile."]
                : ["Create a visibility pack from current facts.", "Resolve all trust and freshness findings before manual use."],
            unlocks: ["Google update fields", "Google offer/event handoff", "Local campaign ZIP"],
            completionSource: "campaign_pack",
            sourceReferences: latestGoogleCampaign ? [latestGoogleCampaign.id] : [],
        }),
        cue({
            id: "visibility_current_input",
            category: "freshness",
            label: "Current local detail",
            detail: currentInputs.length
                ? `${currentInputs.length} current owner input${currentInputs.length === 1 ? " is" : "s are"} available for a timely update.`
                : "Add one current offer, service, event, availability note, or business update.",
            actionLabel: currentInputs.length ? "Review current inputs" : "Add current input",
            status: currentInputs.length ? "ready" : "missing",
            targetTab: "sources",
            actionKind: "open_tab",
            evidenceLevel: "business_truth",
            evidence: currentInputs.map((input) => `${input.label}: active owner input.`),
            manualSteps: ["Review the current input and expiry.", "Archive or replace details that are no longer true."],
            unlocks: ["Timely local update", "Offer/event copy", "Fresh campaign recommendation"],
            completionSource: "source_input",
            sourceReferences: currentInputs.map((input) => input.id),
        }),
        cue({
            id: "visibility_expired_inputs",
            category: "freshness",
            label: "Expired details",
            detail: expiredInputs.length
                ? `${expiredInputs.length} saved input${expiredInputs.length === 1 ? " may be" : "s may be"} expired. Review before reuse.`
                : "No expired offer or event input is currently waiting for review.",
            actionLabel: expiredInputs.length ? "Review expired inputs" : "Open inputs",
            status: expiredInputs.length ? "needs_review" : "ready",
            targetTab: "sources",
            actionKind: "open_tab",
            evidenceLevel: "derived_readiness",
            evidence: expiredInputs.map((input) => `${input.label}: expiry has passed.`),
            manualSteps: expiredInputs.length
                ? ["Confirm whether each detail is still true.", "Replace or archive expired details before creating another pack."]
                : ["No action is needed until a dated input reaches its expiry."],
            unlocks: ["Safe reuse", "Current offers", "Trust-clear public handoff"],
            completionSource: "source_input",
            sourceReferences: expiredInputs.map((input) => input.id),
        }),
        cue({
            id: "visibility_approved_image",
            category: "asset",
            label: "Approved local image",
            detail: confirmedImages.length
                ? "A ready image or logo with confirmed rights can support a local update."
                : "Add or confirm one real business photo, logo, item, service, or storefront image.",
            actionLabel: confirmedImages.length ? "Review images" : "Add photo",
            status: confirmedImages.length ? "ready" : "needs_review",
            targetTab: "assets",
            actionKind: "open_tab",
            evidenceLevel: "derived_readiness",
            evidence: confirmedImages.map((asset) => `${asset.name}: ready with confirmed rights.`),
            manualSteps: ["Use a current real business image where possible.", "Confirm rights before exporting or posting manually."],
            unlocks: ["Google image", "Local social creative", "Print handoff"],
            completionSource: "asset_library",
            sourceReferences: confirmedImages.map((asset) => asset.id),
        }),
        cue({
            id: "visibility_review_destination",
            category: "reputation",
            label: "Customer review destination",
            detail: reviewDestination?.destination
                ? "A saved review destination can be used after the owner confirms the customer interaction is complete."
                : "Add the exact owner-managed review destination before preparing a review request.",
            actionLabel: reviewDestination?.destination ? "Review link" : "Add review link",
            status: reviewDestination?.destination ? "ready" : "missing",
            targetTab: "visibility",
            actionKind: "open_tab",
            evidenceLevel: "business_truth",
            evidence: [reviewDestination?.destination ? "Review destination is saved." : "Review destination is not saved."],
            manualSteps: ["Open and verify the review destination.", "Request a review only after a completed customer interaction."],
            unlocks: ["Review request pack", "Staff review-request script"],
            completionSource: "business_brain",
            sourceReferences: reviewDestination?.destination ? [reviewDestination.id] : [],
        }),
    ];

    if (activeLocations.length > 1) {
        actions.push(cue({
            id: "visibility_branch_context",
            category: "identity",
            label: "Branch-specific context",
            detail: incompleteLocations.length
                ? `${incompleteLocations.length} active branch${incompleteLocations.length === 1 ? " needs" : "es need"} an area before local variants are prepared.`
                : `${activeLocations.length} active branches have local context for branch-specific review.`,
            actionLabel: "Review locations",
            status: branchStatus,
            targetTab: "locations",
            actionKind: "open_tab",
            evidenceLevel: "business_truth",
            evidence: activeLocations.map((location) => `${location.name}: ${location.locality || "area missing"}.`),
            manualSteps: ["Confirm each active branch name and area.", "Use branch-specific contact details only after the location variant is reviewed."],
            unlocks: ["Branch-specific pack variants", "Local approval", "Correct branch handoff"],
            completionSource: "location",
            sourceReferences: activeLocations.map((location) => location.id),
        }));
    }

    const rank = { do_now: 0, review: 1, ready: 2 } as const;
    return actions.sort((left, right) => (
        rank[left.priority] - rank[right.priority]
        || left.id.localeCompare(right.id)
    ));
}
