import { z } from 'zod';
import { AI_MENU_MANAGER_ACTION_TYPES } from './actionTypes';
import {
    AI_MENU_MANAGER_PROJECT_ID_MAX_LENGTH,
    normalizeAiMenuManagerProjectId,
    normalizeAiMenuManagerSessionId,
} from './routeIds';

const idSchema = z.string().trim().min(1).max(160);
const projectIdSchema = z.string()
    .min(1)
    .max(AI_MENU_MANAGER_PROJECT_ID_MAX_LENGTH)
    .refine((value) => normalizeAiMenuManagerProjectId(value) === value);
const sessionIdSchema = z.string()
    .refine((value) => normalizeAiMenuManagerSessionId(value) === value);
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
    sessionDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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
    projectId: projectIdSchema.optional(),
    actionType: actionTypeSchema.optional(),
    executionId: idSchema,
    patchHash: z.string().trim().min(16).max(128),
    result: z.enum(['executed', 'failed']),
    message: z.string().trim().max(500).optional(),
    idempotencyKey: idSchema,
});
