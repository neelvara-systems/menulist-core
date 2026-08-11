import { CAMPAIGNCUE_OFFER_PAGE_SLUG_PATTERN } from "@constant/campaigncue/offerPage";
import { z } from "zod";

const idPattern = /^[a-zA-Z0-9_-]+$/;

export const CampaignCueOfferPageMutationSchema = z.object({
    action: z.enum(["publish", "unpublish"]),
    idempotencyKey: z.string().trim().regex(idPattern).min(8).max(120),
}).strict();

export type CampaignCueOfferPageMutationData = z.infer<typeof CampaignCueOfferPageMutationSchema>;

export const CampaignCueOfferPageSlugSchema = z.string()
    .trim()
    .regex(CAMPAIGNCUE_OFFER_PAGE_SLUG_PATTERN);
