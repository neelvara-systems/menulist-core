import { z } from 'zod';
import { AI_MENU_MANAGER_ACTION_TYPES } from './actionTypes';
import { AI_MENU_MANAGER_CLOUD_PLANNER_OUTCOMES } from './modelRouter/providerResultPolicy';
import {
    AI_MENU_MANAGER_PROJECT_ID_MAX_LENGTH,
    normalizeAiMenuManagerProjectId,
    normalizeAiMenuManagerSessionId,
} from './routeIds';
import { normalizeAiMenuManagerSessionDate } from './idempotency';

const idSchema = z.string().trim().min(1).max(160);
const projectIdSchema = z.string()
    .min(1)
    .max(AI_MENU_MANAGER_PROJECT_ID_MAX_LENGTH)
    .refine((value) => normalizeAiMenuManagerProjectId(value) === value);
const sessionIdSchema = z.string()
    .refine((value) => normalizeAiMenuManagerSessionId(value) === value);
const sessionDateSchema = z.string()
    .trim()
    .refine((value) => normalizeAiMenuManagerSessionDate(value) === value);
const knownActionTypes = new Set<string>(Object.values(AI_MENU_MANAGER_ACTION_TYPES));
const actionTypeSchema = z.string()
    .trim()
    .min(1)
    .max(120)
    .refine((value) => knownActionTypes.has(value));
const commandContextTargetSchema = z.enum([
    'item',
    'category',
    'menu_design',
    'digital_menu',
    'official_page',
    'digital_screens',
    'feedback',
    'store_settings',
]);
const commandContextSchema = z.object({
    target: commandContextTargetSchema.nullable(),
    selectedEntityIds: z.array(idSchema).max(50).optional(),
});

export const AiMenuManagerCommandRequestSchema = z.object({
    sessionId: sessionIdSchema.optional(),
    storeId: z.union([z.string(), z.number()]).transform((value) => String(value)),
    projectId: projectIdSchema,
    inputType: z.enum(['text', 'voice_transcript', 'upload', 'suggested_action']),
    text: z.string().trim().max(1000).optional(),
    uploadRefs: z.array(z.object({
        storagePath: z.string().trim().min(1).max(500),
        mimeType: z.string().trim().min(1).max(120),
        size: z.number().int().nonnegative().max(30_000_000),
    })).max(5).optional(),
    composerContext: commandContextSchema.optional(),
    clientContextVersion: z.string().trim().max(80).optional(),
    replaceOperationId: idSchema.optional(),
    idempotencyKey: idSchema,
});

export const AiMenuManagerInboxRequestSchema = z.object({
    sessionId: sessionIdSchema.optional(),
    storeId: z.union([z.string(), z.number()]).optional().transform((value) => value === undefined ? undefined : String(value)),
    projectId: projectIdSchema,
    sessionDate: sessionDateSchema.optional(),
});

export const AiMenuManagerProposalActionSchema = z.object({
    action: z.enum(['approve', 'cancel', 'reject', 'mark_done']),
    storeId: z.union([z.string(), z.number()]).transform((value) => String(value)),
    projectId: projectIdSchema.optional(),
    actionType: actionTypeSchema.optional(),
    idempotencyKey: idSchema,
});

export const AiMenuManagerProposalCompleteSchema = z.object({
    storeId: z.union([z.string(), z.number()]).transform((value) => String(value)),
    projectId: projectIdSchema,
    actionType: actionTypeSchema,
    executionId: idSchema,
    patchHash: z.string().trim().min(16).max(128),
    result: z.enum(['executed', 'failed']),
    message: z.string().trim().max(500).optional(),
    idempotencyKey: idSchema,
});

const plannerItemSchema = z.object({
    active: z.boolean(),
    aliases: z.array(z.string().trim().min(1).max(80)).max(4),
    available: z.boolean(),
    categoryId: idSchema,
    categoryName: z.string().trim().max(120),
    hasDescription: z.boolean(),
    hasImage: z.boolean(),
    id: idSchema,
    isBestSeller: z.boolean().optional(),
    name: z.string().trim().min(1).max(120),
    price: z.string().trim().max(32).optional(),
});

const plannerCategorySchema = z.object({
    active: z.boolean(),
    aliases: z.array(z.string().trim().min(1).max(80)).max(3),
    id: idSchema,
    name: z.string().trim().min(1).max(120),
});

export const AiMenuManagerPlannerRequestSchema = z.object({
    storeId: z.union([z.string(), z.number()]).transform((value) => String(value)),
    projectId: projectIdSchema,
    ownerMessage: z.string().trim().min(1).max(1000),
    composerContext: commandContextSchema.optional(),
    allowedActions: z.array(actionTypeSchema).min(1).max(40),
    context: z.object({
        project: z.object({
            id: projectIdSchema,
            name: z.string().trim().min(1).max(120),
            updatedAt: z.string().trim().max(80).optional(),
        }),
        store: z.object({
            businessType: z.string().trim().max(80).optional(),
            name: z.string().trim().min(1).max(120),
        }),
        summary: z.object({
            categoryCount: z.number().int().nonnegative().max(10_000),
            hiddenCategoryCount: z.number().int().nonnegative().max(10_000),
            hiddenItemCount: z.number().int().nonnegative().max(100_000),
            itemCount: z.number().int().nonnegative().max(100_000),
            missingDescriptionCount: z.number().int().nonnegative().max(100_000),
            missingImageCount: z.number().int().nonnegative().max(100_000),
            missingPriceCount: z.number().int().nonnegative().max(100_000),
            soldOutItemCount: z.number().int().nonnegative().max(100_000),
        }),
        menuDesign: z.record(z.string(), z.unknown()),
        decisionBlocks: z.record(z.string(), z.unknown()),
        items: z.array(plannerItemSchema).max(32),
        categories: z.array(plannerCategorySchema).max(18),
        pendingCards: z.array(z.object({
            actionType: actionTypeSchema,
            entityIds: z.array(idSchema).max(8),
            title: z.string().trim().min(1).max(140),
        })).max(5),
    }),
});

export const AiMenuManagerPlannerProviderResultSchema = z.object({
    outcome: z.enum(AI_MENU_MANAGER_CLOUD_PLANNER_OUTCOMES),
    ownerReply: z.string().trim().min(1).max(600),
    actionType: actionTypeSchema.optional(),
    targets: z.array(z.object({
        displayName: z.string().trim().max(120).optional(),
        entityId: idSchema.optional(),
        entityType: z.enum(['item', 'category', 'project', 'design', 'store', 'surface']),
    })).max(50).optional(),
    values: z.record(z.string().max(80), z.union([
        z.string().max(500),
        z.number().finite(),
        z.boolean(),
    ])).optional(),
    clarification: z.object({
        question: z.string().trim().min(1).max(300),
        options: z.array(z.object({
            entityId: idSchema.optional(),
            label: z.string().trim().min(1).max(120),
            prompt: z.string().trim().min(1).max(300).optional(),
        })).min(1).max(5),
    }).optional(),
    suggestedReplies: z.array(z.object({
        helper: z.string().trim().max(140).optional(),
        label: z.string().trim().min(1).max(120),
        prompt: z.string().trim().min(1).max(300),
    })).max(4).optional(),
});
