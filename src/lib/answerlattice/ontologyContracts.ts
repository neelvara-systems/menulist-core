import { PRODUCT_IDS } from '@constant/product';
import {
    ANSWERLATTICE_CANDIDATE_STATUS,
    ANSWERLATTICE_ENTITY_STATUS,
    ANSWERLATTICE_ENTITY_TYPES,
    ANSWERLATTICE_RELATION_TYPES,
    type AnswerlatticeCandidateStatus,
    type AnswerlatticeEntity,
    type AnswerlatticeEntityCandidate,
    type AnswerlatticeEntityRelation,
    type AnswerlatticeEntitySearchIndex,
    type AnswerlatticeEntityType,
    type AnswerlatticeRelationType,
} from '@type/answerlattice';
import { z } from 'zod';
import { normalizeAnswerlatticeEntityCandidateId } from './entityCandidateIdBoundary';
import { normalizeAnswerlatticeKbArticleId } from './kbArticleIdBoundary';
import {
    normalizeAnswerlatticeEntityRelationId,
    normalizeAnswerlatticeEntitySearchIndexId,
    normalizeAnswerlatticeResolvedEntityId,
} from './governanceIdBoundary';

const requestIdSchema = z.string().trim().min(8).max(180).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const entityIdSchema = z.string().trim().min(1).max(180)
    .refine((value) => normalizeAnswerlatticeResolvedEntityId(value) === value);
const relationIdSchema = z.string().trim().min(1).max(180)
    .refine((value) => normalizeAnswerlatticeEntityRelationId(value) === value);
const candidateIdSchema = z.string().trim().min(1).max(180)
    .refine((value) => normalizeAnswerlatticeEntityCandidateId(value) === value);
const articleIdSchema = z.string().trim().min(1).max(180)
    .refine((value) => normalizeAnswerlatticeKbArticleId(value) === value);
const searchIndexIdSchema = z.string().trim().min(1).max(180)
    .refine((value) => normalizeAnswerlatticeEntitySearchIndexId(value) === value);
const entityTypeSchema = z.enum(Object.values(ANSWERLATTICE_ENTITY_TYPES) as [string, ...string[]]);
const entityStatusSchema = z.enum(Object.values(ANSWERLATTICE_ENTITY_STATUS) as [string, ...string[]]);
const relationTypeSchema = z.enum(Object.values(ANSWERLATTICE_RELATION_TYPES) as [string, ...string[]]);
const candidateStatusSchema = z.enum(Object.values(ANSWERLATTICE_CANDIDATE_STATUS) as [string, ...string[]]);
const slugSchema = z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const aliasesSchema = z.array(z.string().trim().min(2).max(120)).max(20)
    .transform((aliases) => Array.from(new Set(aliases.map((alias) => alias.toLowerCase()))));

export const AnswerlatticeOntologyEntityInputSchema = z.object({
    type: entityTypeSchema,
    name: z.string().trim().min(2).max(120),
    slug: slugSchema,
    description: z.string().trim().min(1).max(4_000),
    status: z.enum([ANSWERLATTICE_ENTITY_STATUS.ACTIVE, ANSWERLATTICE_ENTITY_STATUS.BETA]),
    aliases: aliasesSchema.optional(),
    currentVersion: z.number().int().positive().max(999_999_999),
}).strict();

export type AnswerlatticeOntologyEntityInput = {
    type: AnswerlatticeEntityType;
    name: string;
    slug: string;
    description: string;
    status: 'active' | 'beta';
    aliases?: string[];
    currentVersion: number;
};

export type AnswerlatticeOntologyEntityChanges = {
    name?: string;
    slug?: string;
    description?: string;
    status?: 'active' | 'beta';
    aliases?: string[];
    currentVersion?: number;
};

const AnswerlatticeOntologyEntityChangesSchema = z.object({
    name: z.string().trim().min(2).max(120).optional(),
    slug: slugSchema.optional(),
    description: z.string().trim().min(1).max(4_000).optional(),
    status: z.enum([ANSWERLATTICE_ENTITY_STATUS.ACTIVE, ANSWERLATTICE_ENTITY_STATUS.BETA]).optional(),
    aliases: aliasesSchema.optional(),
    currentVersion: z.number().int().positive().max(999_999_999).optional(),
}).strict().refine((changes) => Object.keys(changes).length > 0, 'At least one entity field is required');

const AnswerlatticeOntologyActionBaseSchema = z.discriminatedUnion('action', [
    z.object({
        action: z.literal('create_entity'),
        requestId: requestIdSchema,
        entity: AnswerlatticeOntologyEntityInputSchema,
    }).strict(),
    z.object({
        action: z.literal('update_entity'),
        requestId: requestIdSchema,
        entityId: entityIdSchema,
        changes: AnswerlatticeOntologyEntityChangesSchema,
    }).strict(),
    z.object({
        action: z.literal('deprecate_entity'),
        requestId: requestIdSchema,
        entityId: entityIdSchema,
    }).strict(),
    z.object({
        action: z.literal('create_relation'),
        requestId: requestIdSchema,
        fromEntityId: entityIdSchema,
        toEntityId: entityIdSchema,
        relationType: relationTypeSchema,
    }).strict(),
    z.object({
        action: z.literal('delete_relation'),
        requestId: requestIdSchema,
        relationId: relationIdSchema,
    }).strict(),
    z.object({
        action: z.literal('rebuild_search_index'),
        requestId: requestIdSchema,
        entityId: entityIdSchema,
        weight: z.number().min(0.1).max(10).default(1),
    }).strict(),
    z.object({
        action: z.literal('review_candidate'),
        requestId: requestIdSchema,
        candidateId: candidateIdSchema,
        decision: z.enum(['rejected', 'merged']),
    }).strict(),
    z.object({
        action: z.literal('promote_candidate'),
        requestId: requestIdSchema,
        candidateId: candidateIdSchema,
    }).strict(),
]);

export const AnswerlatticeOntologyActionSchema = AnswerlatticeOntologyActionBaseSchema.superRefine(
    (value, context) => {
        if (value.action === 'create_relation' && value.fromEntityId === value.toEntityId) {
            context.addIssue({ code: z.ZodIssueCode.custom, path: ['toEntityId'], message: 'Entity relation endpoints must differ' });
        }
    },
 ) as unknown as z.ZodType<AnswerlatticeOntologyAction>;

export type AnswerlatticeOntologyAction =
    | { action: 'create_entity'; requestId: string; entity: AnswerlatticeOntologyEntityInput }
    | { action: 'update_entity'; requestId: string; entityId: string; changes: AnswerlatticeOntologyEntityChanges }
    | { action: 'deprecate_entity'; requestId: string; entityId: string }
    | { action: 'create_relation'; requestId: string; fromEntityId: string; toEntityId: string; relationType: AnswerlatticeRelationType }
    | { action: 'delete_relation'; requestId: string; relationId: string }
    | { action: 'rebuild_search_index'; requestId: string; entityId: string; weight: number }
    | { action: 'review_candidate'; requestId: string; candidateId: string; decision: 'rejected' | 'merged' }
    | { action: 'promote_candidate'; requestId: string; candidateId: string };

const storedIdentitySchema = {
    pId: z.literal(PRODUCT_IDS.ANSWERLATTICE).optional(),
    tId: z.number().int().positive(),
    sId: z.number().int().positive(),
};

export const AnswerlatticeStoredEntitySchema = z.object({
    id: entityIdSchema,
    ...storedIdentitySchema,
    type: entityTypeSchema,
    name: z.string().trim().min(2).max(120),
    slug: slugSchema,
    description: z.string().trim().min(1).max(4_000),
    status: entityStatusSchema,
    aliases: aliasesSchema.optional(),
    currentVersion: z.number().int().positive().max(999_999_999),
    createdOn: z.unknown().optional(),
    modifiedOn: z.unknown().optional(),
    createdBy: z.string().max(200).optional(),
    modifiedBy: z.string().max(200).optional(),
    uId: z.union([z.string(), z.number()]).optional(),
}).passthrough();

export const AnswerlatticeStoredEntityRelationSchema = z.object({
    id: relationIdSchema,
    ...storedIdentitySchema,
    fromEntityId: entityIdSchema,
    toEntityId: entityIdSchema,
    relationType: relationTypeSchema,
    createdOn: z.unknown().optional(),
    modifiedOn: z.unknown().optional(),
}).passthrough();

export const AnswerlatticeStoredEntitySearchIndexSchema = z.object({
    id: searchIndexIdSchema,
    ...storedIdentitySchema,
    entityId: entityIdSchema,
    canonicalName: z.string().trim().min(2).max(120),
    synonyms: z.array(z.string().trim().min(2).max(120)).max(20),
    normalizedTokens: z.array(z.string().trim().min(1).max(80)).max(80),
    prefixTokens: z.array(z.string().trim().min(1).max(80)).max(200).optional(),
    weight: z.number().min(0.1).max(10),
    createdOn: z.unknown().optional(),
    modifiedOn: z.unknown().optional(),
}).passthrough();

export const AnswerlatticeStoredEntityCandidateSchema = z.object({
    id: candidateIdSchema,
    ...storedIdentitySchema,
    name: z.string().trim().min(2).max(120),
    type: entityTypeSchema,
    confidence: z.number().min(0).max(1),
    frequency: z.object({
        articles: z.number().int().nonnegative().max(1_000_000),
        tickets: z.number().int().nonnegative().max(1_000_000),
        chat: z.number().int().nonnegative().max(1_000_000),
    }).strict(),
    description: z.string().trim().min(1).max(4_000),
    status: candidateStatusSchema,
    promotedEntityId: entityIdSchema.optional(),
    sourceArticleIds: z.array(articleIdSchema).max(50).optional(),
    createdOn: z.unknown().optional(),
    modifiedOn: z.unknown().optional(),
}).passthrough();

export const AnswerlatticeOntologyActionResultSchema = z.object({
    success: z.literal(true),
    action: z.enum([
        'create_entity',
        'update_entity',
        'deprecate_entity',
        'create_relation',
        'delete_relation',
        'rebuild_search_index',
        'review_candidate',
        'promote_candidate',
    ]),
    replayed: z.boolean(),
    entity: AnswerlatticeStoredEntitySchema.optional(),
    relation: AnswerlatticeStoredEntityRelationSchema.optional(),
    searchIndex: AnswerlatticeStoredEntitySearchIndexSchema.optional(),
    candidateId: candidateIdSchema.optional(),
    candidateStatus: candidateStatusSchema.optional(),
}).strict() as unknown as z.ZodType<AnswerlatticeOntologyActionResult>;

export type AnswerlatticeOntologyActionResult = {
    success: true;
    action: AnswerlatticeOntologyAction['action'];
    replayed: boolean;
    entity?: AnswerlatticeEntity;
    relation?: AnswerlatticeEntityRelation;
    searchIndex?: AnswerlatticeEntitySearchIndex;
    candidateId?: string;
    candidateStatus?: AnswerlatticeCandidateStatus;
};

export const normalizeStoredAnswerlatticeEntity = (value: unknown, id: string): AnswerlatticeEntity | null => {
    const parsed = AnswerlatticeStoredEntitySchema.safeParse({ ...(value as object), id });
    return parsed.success ? { ...parsed.data, pId: PRODUCT_IDS.ANSWERLATTICE } as unknown as AnswerlatticeEntity : null;
};

export const normalizeStoredAnswerlatticeEntityRelation = (value: unknown, id: string): AnswerlatticeEntityRelation | null => {
    const parsed = AnswerlatticeStoredEntityRelationSchema.safeParse({ ...(value as object), id });
    return parsed.success ? { ...parsed.data, pId: PRODUCT_IDS.ANSWERLATTICE } as unknown as AnswerlatticeEntityRelation : null;
};

export const normalizeStoredAnswerlatticeEntitySearchIndex = (value: unknown, id: string): AnswerlatticeEntitySearchIndex | null => {
    const parsed = AnswerlatticeStoredEntitySearchIndexSchema.safeParse({ ...(value as object), id });
    return parsed.success ? { ...parsed.data, pId: PRODUCT_IDS.ANSWERLATTICE } as unknown as AnswerlatticeEntitySearchIndex : null;
};

export const normalizeStoredAnswerlatticeEntityCandidate = (value: unknown, id: string): AnswerlatticeEntityCandidate | null => {
    const parsed = AnswerlatticeStoredEntityCandidateSchema.safeParse({ ...(value as object), id });
    return parsed.success ? { ...parsed.data, pId: PRODUCT_IDS.ANSWERLATTICE } as unknown as AnswerlatticeEntityCandidate : null;
};
