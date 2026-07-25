import { z } from 'zod';

export const answerlatticeProductSurfaceSummaryScopeSchema = z.object({
    tId: z.number().int().positive(),
    sId: z.number().int().positive(),
}).strict();

export const answerlatticeProductSurfaceSummaryRebuildRequestSchema = z.object({
    reason: z.literal('manual').optional().default('manual'),
    scope: answerlatticeProductSurfaceSummaryScopeSchema,
}).strict();

export type AnswerlatticeProductSurfaceSummaryScope = z.infer<
    typeof answerlatticeProductSurfaceSummaryScopeSchema
>;

export const isExactAnswerlatticeProductSurfaceSummaryScope = (
    left: AnswerlatticeProductSurfaceSummaryScope,
    right: AnswerlatticeProductSurfaceSummaryScope,
) => left.tId === right.tId && left.sId === right.sId;
