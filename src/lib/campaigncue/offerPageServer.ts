import { FEATURE_FLAGS } from "@config/features";
import { CAMPAIGNCUE_COLLECTIONS, CAMPAIGNCUE_EVENT_ID_PREFIX } from "@constant/campaigncue/database";
import {
    CAMPAIGNCUE_OFFER_PAGE_CACHE_SECONDS,
    CAMPAIGNCUE_OFFER_PAGE_SLUG_LENGTH,
    CAMPAIGNCUE_OFFER_PAGE_SLUG_PATTERN,
} from "@constant/campaigncue/offerPage";
import {
    CampaignCueOfferPageError,
    buildCampaignCuePublicOfferPage,
    parseCampaignCuePublicOfferPageRecord,
} from "@lib/campaigncue/offerPage";
import {
    buildCampaignCueIdempotencyRequestHash,
    getCampaignCueIdempotencyReplay,
} from "@lib/campaigncue/idempotency";
import { evaluateCampaignCuePackFreshness } from "@lib/campaigncue/operatingLoop";
import {
    applyCampaignCueLocationToBusinessBrain,
    buildCampaignCueLocationRecordSourceHash,
    buildCampaignCueLocationSourceHash,
} from "@lib/campaigncue/locationVariants";
import {
    parseCampaignCueCampaignRecord,
    parseCampaignCueLocationRecord,
    parseCampaignCueSourceSnapshotRecord,
} from "@lib/campaigncue/recordBoundary";
import { campaignCueCanManageCampaignLocation } from "@lib/campaigncue/permissions";
import {
    buildCampaignCueWorkspaceId,
    ensureCampaignCueWorkspaceServer,
    type CampaignCueSessionScope,
} from "@lib/campaigncue/server";
import {
    assertCampaignCueBusinessBrainRecordScope,
    assertCampaignCueWorkspaceRecordScope,
} from "@lib/campaigncue/workspaceScope";
import { requireCampaignCueFirestoreAdmin } from "@lib/firebase/campaigncueFirebaseAdmin";
import { sanitizeForFirestore } from "@lib/firestore/sanitizeForFirestore";
import { createRandomIdSegment, createTimestampedRuntimeId } from "@lib/runtime/randomId";
import type { CampaignCueCampaign, CampaignCuePublicOfferPage } from "@type/campaigncue";
import type { CampaignCueOfferPageMutationData } from "@lib/validation/campaigncueOfferPageSchemas";
import { revalidateTag, unstable_cache } from "next/cache";

const DEFAULT_BUSINESS_BRAIN_ID = "default";
const DEFAULT_SOURCE_SNAPSHOT_ID = "current";
export class CampaignCueOfferPageMutationError extends Error {
    readonly status: 403 | 404 | 409;

    constructor(message: string, status: 403 | 404 | 409 = 409) {
        super(message);
        this.name = "CampaignCueOfferPageMutationError";
        this.status = status;
    }
}

export const getCampaignCueOfferPageCacheTag = (slug: string) => `campaigncue-offer-${slug}`;

export function revalidateCampaignCueOfferPage(slug: string) {
    if (!CAMPAIGNCUE_OFFER_PAGE_SLUG_PATTERN.test(slug)) return [];
    const tags = [getCampaignCueOfferPageCacheTag(slug)];
    tags.forEach((tag) => revalidateTag(tag, { expire: 0 }));
    return tags;
}

const publicOfferCollection = () => requireCampaignCueFirestoreAdmin().collection(CAMPAIGNCUE_COLLECTIONS.PUBLIC_OFFERS);

const fetchCampaignCuePublicOfferPage = async (slug: string): Promise<CampaignCuePublicOfferPage | null> => {
    if (!FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_HOSTED_OFFER_PAGES || !CAMPAIGNCUE_OFFER_PAGE_SLUG_PATTERN.test(slug)) return null;
    const snapshot = await publicOfferCollection().doc(slug).get();
    return snapshot.exists ? parseCampaignCuePublicOfferPageRecord(snapshot.data(), slug) : null;
};

export async function resolveCampaignCuePublicOfferPage(slug: string): Promise<CampaignCuePublicOfferPage | null> {
    if (!CAMPAIGNCUE_OFFER_PAGE_SLUG_PATTERN.test(slug)) return null;
    const cached = unstable_cache(
        () => fetchCampaignCuePublicOfferPage(slug),
        ["campaigncue-public-offer", slug],
        {
            revalidate: CAMPAIGNCUE_OFFER_PAGE_CACHE_SECONDS,
            tags: [getCampaignCueOfferPageCacheTag(slug)],
        },
    );
    const offer = await cached();
    return offer && Date.parse(offer.expiresAt) > Date.now() ? offer : null;
}

export async function mutateCampaignCueOfferPageServer(params: {
    campaignId: string;
    input: CampaignCueOfferPageMutationData;
    scope: CampaignCueSessionScope;
}): Promise<{ campaign: CampaignCueCampaign; offerPage: CampaignCuePublicOfferPage | null; replayed: boolean }> {
    if (!FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_HOSTED_OFFER_PAGES) {
        throw new CampaignCueOfferPageMutationError("Hosted campaign pages are unavailable.", 404);
    }
    await ensureCampaignCueWorkspaceServer(params.scope);
    const workspaceId = buildCampaignCueWorkspaceId(params.scope);
    const db = requireCampaignCueFirestoreAdmin();
    const workspaceRef = db.collection(CAMPAIGNCUE_COLLECTIONS.WORKSPACES).doc(workspaceId);
    const campaignRef = workspaceRef.collection(CAMPAIGNCUE_COLLECTIONS.CAMPAIGNS).doc(params.campaignId);
    const businessRef = workspaceRef.collection(CAMPAIGNCUE_COLLECTIONS.BUSINESS_BRAINS).doc(DEFAULT_BUSINESS_BRAIN_ID);
    const sourceRef = workspaceRef.collection(CAMPAIGNCUE_COLLECTIONS.SOURCE_SNAPSHOTS).doc(DEFAULT_SOURCE_SNAPSHOT_ID);
    const idempotencyRef = workspaceRef.collection(CAMPAIGNCUE_COLLECTIONS.IDEMPOTENCY_KEYS).doc(params.input.idempotencyKey);
    const eventRef = workspaceRef.collection(CAMPAIGNCUE_COLLECTIONS.EVENTS).doc(createTimestampedRuntimeId(CAMPAIGNCUE_EVENT_ID_PREFIX));
    const generatedSlug = createRandomIdSegment(CAMPAIGNCUE_OFFER_PAGE_SLUG_LENGTH);
    const idempotencyAction = `offer_page_${params.input.action}`;
    const requestHash = buildCampaignCueIdempotencyRequestHash({
        action: params.input.action,
        campaignId: params.campaignId,
    });
    const now = new Date();

    const result = await db.runTransaction(async (transaction) => {
        const [idempotencySnap, workspaceSnap, campaignSnap] = await Promise.all([
            transaction.get(idempotencyRef),
            transaction.get(workspaceRef),
            transaction.get(campaignRef),
        ]);
        if (!workspaceSnap.exists) throw new CampaignCueOfferPageMutationError("Campaign workspace unavailable.", 404);
        const workspace = assertCampaignCueWorkspaceRecordScope(workspaceSnap.data(), { ...params.scope, workspaceId });
        const member = workspace.members[params.scope.userId];
        if (!campaignCueCanManageCampaignLocation({
            locationId: campaignSnap.exists ? campaignSnap.get("locationId") : undefined,
            member,
        })) {
            throw new CampaignCueOfferPageMutationError("This workspace role cannot publish campaign pages.", 403);
        }
        if (!campaignSnap.exists) throw new CampaignCueOfferPageMutationError("Campaign not found.", 404);
        const campaign = parseCampaignCueCampaignRecord(campaignSnap.data(), { campaignId: params.campaignId, workspaceId });

        if (idempotencySnap.exists) {
            const replay = getCampaignCueIdempotencyReplay(idempotencySnap.data(), {
                action: idempotencyAction,
                actorId: params.scope.userId,
                requestHash,
            });
            const replaySlug = replay.resultId || campaign.pack?.offerPage?.slug;
            const replayOfferSnap = replaySlug && CAMPAIGNCUE_OFFER_PAGE_SLUG_PATTERN.test(replaySlug)
                ? await transaction.get(publicOfferCollection().doc(replaySlug))
                : null;
            return {
                campaign,
                offerPage: replayOfferSnap?.exists
                    ? parseCampaignCuePublicOfferPageRecord(replayOfferSnap.data(), replaySlug!, now)
                    : null,
                replayed: true,
                slug: replaySlug || "",
            };
        }

        const currentPack = campaign.pack;
        const existingSlug = currentPack?.offerPage?.slug;
        const hasExistingSlug = Boolean(existingSlug && CAMPAIGNCUE_OFFER_PAGE_SLUG_PATTERN.test(existingSlug));
        if (params.input.action === "unpublish" && !hasExistingSlug) {
            throw new CampaignCueOfferPageMutationError("This campaign has no hosted page.", 404);
        }
        const slug = hasExistingSlug && existingSlug ? existingSlug : generatedSlug;
        const publicOfferRef = publicOfferCollection().doc(slug);
        const [publicOfferSnap, businessSnap, sourceSnap] = await Promise.all([
            transaction.get(publicOfferRef),
            params.input.action === "publish" ? transaction.get(businessRef) : Promise.resolve(null),
            params.input.action === "publish" ? transaction.get(sourceRef) : Promise.resolve(null),
        ]);
        if (publicOfferSnap.exists) {
            const existingCampaignId = publicOfferSnap.get("campaignId");
            const existingWorkspaceId = publicOfferSnap.get("workspaceId");
            if (existingCampaignId !== campaign.id || existingWorkspaceId !== workspaceId) {
                throw new CampaignCueOfferPageMutationError("Campaign page address collision. Try again.");
            }
        }

        let offerPage: CampaignCuePublicOfferPage | null = null;
        let updatedCampaign: CampaignCueCampaign;
        if (params.input.action === "publish") {
            if (campaign.status === "archived") throw new CampaignCueOfferPageMutationError("Archived campaign packs cannot publish a page.");
            if (campaign.ownerApprovalState === "requested" || campaign.ownerApprovalState === "rejected") {
                throw new CampaignCueOfferPageMutationError("Resolve Campaign Pack approval before publishing a page.");
            }
            if (workspace.agencyMode && campaign.ownerApprovalState !== "approved") {
                throw new CampaignCueOfferPageMutationError("Owner or client approval is required before publishing in this agency workspace.");
            }
            if (!sourceSnap?.exists) throw new CampaignCueOfferPageMutationError("Campaign facts could not be rechecked.");
            const sourceSnapshot = parseCampaignCueSourceSnapshotRecord(sourceSnap.data(), workspaceId);
            if (!businessSnap?.exists) throw new CampaignCueOfferPageMutationError("Business details are unavailable.");
            let businessBrain = assertCampaignCueBusinessBrainRecordScope(businessSnap.data(), workspaceId);
            let currentSourceHash = sourceSnapshot.sourceHash;
            if (campaign.locationId) {
                const locationSnap = await transaction.get(
                    workspaceRef.collection(CAMPAIGNCUE_COLLECTIONS.LOCATIONS).doc(campaign.locationId),
                );
                if (!locationSnap.exists || !campaign.pack?.locationSnapshot) {
                    throw new CampaignCueOfferPageMutationError("This location changed or is unavailable. Create a fresh branch pack first.");
                }
                const location = parseCampaignCueLocationRecord(locationSnap.data(), workspaceId);
                if (
                    location.status !== "active"
                    || campaign.pack.locationSnapshot.locationId !== location.id
                ) {
                    throw new CampaignCueOfferPageMutationError("This location changed or is unavailable. Create a fresh branch pack first.");
                }
                currentSourceHash = buildCampaignCueLocationSourceHash(currentSourceHash, {
                    sourceHash: buildCampaignCueLocationRecordSourceHash(location),
                });
                businessBrain = applyCampaignCueLocationToBusinessBrain(businessBrain, location);
            }
            const freshness = evaluateCampaignCuePackFreshness({
                currentSourceHash,
                freshness: campaign.pack?.freshness,
                now,
            });
            if (freshness.status !== "current") {
                throw new CampaignCueOfferPageMutationError("Business facts changed or expired. Create a fresh pack before publishing.");
            }
            if (campaign.pack?.patternCueSourceHash) {
                const currentPatternHash = workspace.patternCueSource?.patternCue?.sourceHash;
                if (!currentPatternHash || currentPatternHash !== campaign.pack.patternCueSourceHash) {
                    throw new CampaignCueOfferPageMutationError("The example format changed. Create a fresh pack before publishing.");
                }
            }
            try {
                offerPage = buildCampaignCuePublicOfferPage({
                    businessBrain,
                    campaign: { ...campaign, pack: campaign.pack ? { ...campaign.pack, freshness } : campaign.pack },
                    now,
                    publishedBy: params.scope.userId,
                    slug,
                });
            } catch (error) {
                if (error instanceof CampaignCueOfferPageError) {
                    throw new CampaignCueOfferPageMutationError(error.message);
                }
                throw error;
            }
            transaction.set(publicOfferRef, sanitizeForFirestore(offerPage, { undefinedObjectValue: "omit" }));
            updatedCampaign = {
                ...campaign,
                pack: campaign.pack ? {
                    ...campaign.pack,
                    offerPage: {
                        slug,
                        status: "published",
                        publishedAt: offerPage.publishedAt,
                        expiresAt: offerPage.expiresAt,
                    },
                } : campaign.pack,
                updatedAt: now.toISOString(),
            };
        } else {
            if (!currentPack?.offerPage || !CAMPAIGNCUE_OFFER_PAGE_SLUG_PATTERN.test(currentPack.offerPage.slug)) {
                throw new CampaignCueOfferPageMutationError("This campaign has no hosted page.", 404);
            }
            if (publicOfferSnap.exists) {
                transaction.set(publicOfferRef, {
                    status: "unpublished",
                    updatedAt: now.toISOString(),
                    expiresAt: now.toISOString(),
                }, { merge: true });
            }
            updatedCampaign = {
                ...campaign,
                pack: {
                    ...currentPack,
                    offerPage: {
                        ...currentPack.offerPage,
                        status: "unpublished",
                        unpublishedAt: now.toISOString(),
                    },
                },
                updatedAt: now.toISOString(),
            };
        }

        transaction.set(campaignRef, sanitizeForFirestore({
            pack: updatedCampaign.pack,
            updatedAt: now.toISOString(),
        }, { undefinedObjectValue: "omit" }), { merge: true });
        transaction.set(eventRef, sanitizeForFirestore({
            id: eventRef.id,
            workspaceId,
            actorId: params.scope.userId,
            action: params.input.action === "publish" ? "offer_page_published" : "offer_page_unpublished",
            campaignId: campaign.id,
            metadata: { slug },
            confidence: "observed",
            createdAt: now.toISOString(),
        }));
        transaction.set(idempotencyRef, {
            action: idempotencyAction,
            actorId: params.scope.userId,
            requestHash,
            resultId: slug,
            status: "completed",
            updatedAt: now.toISOString(),
        });
        return { campaign: updatedCampaign, offerPage, replayed: false, slug };
    });

    if (result.slug) revalidateCampaignCueOfferPage(result.slug);
    return { campaign: result.campaign, offerPage: result.offerPage, replayed: result.replayed };
}
