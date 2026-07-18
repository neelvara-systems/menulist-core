/**
 * Answerlattice — Procedure Validation (Guided Workflows)
 * 
 * Write-time validation for procedure structure on canonical answers.
 * Called from DAL addCanonicalAnswer / updateCanonicalAnswer.
 * 
 * Feature-flagged: ENABLE_ANSWERLATTICE_GUIDED_WORKFLOWS
 * @see __docs__/answerlattice/guided-workflows/
 */

import {
    ANSWERLATTICE_ANSWER_TYPES,
    ANSWERLATTICE_PREREQUISITE_TYPE,
    ANSWERLATTICE_PROCEDURE_ACTIONS,
    ANSWERLATTICE_PROCEDURE_CONSTRAINTS,
    ANSWERLATTICE_WARNING_SEVERITY,
    AnswerlatticeAnswerType,
    AnswerlatticePrerequisiteType,
    AnswerlatticeProcedure,
    AnswerlatticeProcedureAction,
    AnswerlatticeWarningSeverity,
} from '@type/answerlattice';
import { z } from 'zod';

const VALID_ACTIONS = new Set<string>(Object.values(ANSWERLATTICE_PROCEDURE_ACTIONS));
const VALID_SEVERITIES = new Set<string>(Object.values(ANSWERLATTICE_WARNING_SEVERITY));
const VALID_PREREQ_TYPES = new Set<string>(Object.values(ANSWERLATTICE_PREREQUISITE_TYPE));
const SEMANTIC_ID_PATTERN = /^[a-z0-9]+(?:[._:-][a-z0-9]+)*$/;
const C = ANSWERLATTICE_PROCEDURE_CONSTRAINTS;
const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const AnswerlatticeSemanticIdSchema = z.string()
    .trim()
    .min(1)
    .max(C.MAX_TARGET_LENGTH)
    .regex(SEMANTIC_ID_PATTERN);

export const AnswerlatticeProcedureSchema = z.object({
    procedureSlug: z.string()
        .trim()
        .min(1)
        .max(C.MAX_PROCEDURE_SLUG_LENGTH)
        .regex(/^[a-z0-9_]+$/)
        .optional(),
    steps: z.array(z.object({
        stepOrder: z.number().int().positive(),
        action: z.enum(Object.values(ANSWERLATTICE_PROCEDURE_ACTIONS) as [
            AnswerlatticeProcedureAction,
            ...AnswerlatticeProcedureAction[],
        ]),
        instruction: z.string().trim().min(1).max(C.MAX_INSTRUCTION_LENGTH),
        target: AnswerlatticeSemanticIdSchema.optional(),
        expectedEvent: AnswerlatticeSemanticIdSchema
            .max(C.MAX_EXPECTED_EVENT_LENGTH)
            .optional(),
        expectedResult: z.string().trim().min(1).max(C.MAX_EXPECTED_RESULT_LENGTH).optional(),
        troubleshootingHint: z.string().trim().min(1).max(C.MAX_TROUBLESHOOTING_HINT_LENGTH).optional(),
    }).strict())
        .min(C.MIN_STEPS)
        .max(C.MAX_STEPS),
    warnings: z.array(z.object({
        message: z.string().trim().min(1).max(C.MAX_WARNING_MESSAGE_LENGTH),
        severity: z.enum(Object.values(ANSWERLATTICE_WARNING_SEVERITY) as [
            AnswerlatticeWarningSeverity,
            ...AnswerlatticeWarningSeverity[],
        ]),
    }).strict()).max(C.MAX_WARNINGS).optional(),
    prerequisites: z.array(z.object({
        description: z.string().trim().min(1).max(C.MAX_PREREQUISITE_DESCRIPTION_LENGTH),
        type: z.enum(Object.values(ANSWERLATTICE_PREREQUISITE_TYPE) as [
            AnswerlatticePrerequisiteType,
            ...AnswerlatticePrerequisiteType[],
        ]),
        value: z.string().trim().min(1).max(C.MAX_TARGET_LENGTH).optional(),
    }).strict()).max(C.MAX_PREREQUISITES).optional(),
}).strict().superRefine((procedure, context) => {
    const seenOrders = new Set<number>();
    procedure.steps.forEach((step, index) => {
        if (seenOrders.has(step.stepOrder)) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: `stepOrder ${step.stepOrder} is duplicated`,
                path: ['steps', index, 'stepOrder'],
            });
        }
        seenOrders.add(step.stepOrder);
    });
    for (let expectedOrder = 1; expectedOrder <= procedure.steps.length; expectedOrder += 1) {
        if (!seenOrders.has(expectedOrder)) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: `steps must include stepOrder ${expectedOrder}`,
                path: ['steps'],
            });
        }
    }
}) as z.ZodType<AnswerlatticeProcedure>;

export interface ProcedureValidationResult {
    valid: boolean;
    errors: string[];
}

/**
 * Validate procedure structure at write-time.
 * 
 * Rules:
 * 1. If answerType === 'procedure', content.procedure MUST exist with 1-12 steps
 * 2. Each step: stepOrder (positive int), action (approved vocab), instruction (non-empty, ≤80 chars)
 * 3. stepOrder values must be sequential (1, 2, 3...) — auto-normalized if gaps exist
 * 4. Warnings: max 5, message ≤200 chars, severity from approved set
 * 5. Prerequisites: max 5, description ≤200 chars, type from approved set
 * 6. target/expectedEvent: optional bounded semantic identifiers
 * 7. procedureSlug: optional, ≤60 chars, lowercase alphanumeric + underscore
 */
export function validateProcedure(
    answerType: AnswerlatticeAnswerType | undefined,
    procedure: AnswerlatticeProcedure | unknown,
): ProcedureValidationResult {
    const errors: string[] = [];

    // Non-procedure answers must not retain a stale procedure payload.
    if (!answerType || answerType !== ANSWERLATTICE_ANSWER_TYPES.PROCEDURE) {
        if (procedure !== undefined && procedure !== null) {
            return {
                valid: false,
                errors: ['content.procedure is allowed only when answerType is "procedure"'],
            };
        }
        return { valid: true, errors: [] };
    }

    // Procedure required for procedure answer type
    if (!isRecord(procedure)) {
        return { valid: false, errors: ['content.procedure is required when answerType is "procedure"'] };
    }

    const procedureSteps = procedure.steps;

    // Validate steps
    if (!Array.isArray(procedureSteps)) {
        errors.push('procedure.steps must be a non-empty array');
    } else {
        if (procedureSteps.length < C.MIN_STEPS) {
            errors.push(`procedure.steps must have at least ${C.MIN_STEPS} step`);
        }
        if (procedureSteps.length > C.MAX_STEPS) {
            errors.push(`procedure.steps cannot exceed ${C.MAX_STEPS} steps`);
        }

        const seenOrders = new Set<number>();
        for (let i = 0; i < procedureSteps.length; i++) {
            const step = procedureSteps[i];
            const prefix = `step[${i}]`;
            if (!isRecord(step)) {
                errors.push(`${prefix} must be an object`);
                continue;
            }

            if (!Number.isInteger(step.stepOrder) || Number(step.stepOrder) < 1) {
                errors.push(`${prefix}.stepOrder must be a positive integer`);
            }
            const stepOrder = Number(step.stepOrder);
            if (seenOrders.has(stepOrder)) {
                errors.push(`${prefix}.stepOrder ${stepOrder} is duplicated`);
            }
            seenOrders.add(stepOrder);

            if (typeof step.action !== 'string' || !VALID_ACTIONS.has(step.action)) {
                errors.push(`${prefix}.action is not in the approved vocabulary`);
            }

            if (typeof step.instruction !== 'string' || step.instruction.trim().length === 0) {
                errors.push(`${prefix}.instruction is required`);
            } else if (step.instruction.length > C.MAX_INSTRUCTION_LENGTH) {
                errors.push(`${prefix}.instruction exceeds ${C.MAX_INSTRUCTION_LENGTH} characters`);
            }

            if (step.target !== undefined) {
                if (typeof step.target !== 'string') {
                    errors.push(`${prefix}.target must be a lowercase semantic identifier`);
                } else if (step.target.length > C.MAX_TARGET_LENGTH) {
                    errors.push(`${prefix}.target exceeds ${C.MAX_TARGET_LENGTH} characters`);
                } else if (!SEMANTIC_ID_PATTERN.test(step.target)) {
                    errors.push(`${prefix}.target must be a lowercase semantic identifier`);
                }
            }

            if (step.expectedEvent !== undefined) {
                if (typeof step.expectedEvent !== 'string') {
                    errors.push(`${prefix}.expectedEvent must be a lowercase semantic identifier`);
                } else if (step.expectedEvent.length > C.MAX_EXPECTED_EVENT_LENGTH) {
                    errors.push(`${prefix}.expectedEvent exceeds ${C.MAX_EXPECTED_EVENT_LENGTH} characters`);
                } else if (!SEMANTIC_ID_PATTERN.test(step.expectedEvent)) {
                    errors.push(`${prefix}.expectedEvent must be a lowercase semantic identifier`);
                }
            }

            if (
                step.expectedResult !== undefined
                && (
                    typeof step.expectedResult !== 'string'
                    || step.expectedResult.length > C.MAX_EXPECTED_RESULT_LENGTH
                )
            ) {
                errors.push(`${prefix}.expectedResult exceeds ${C.MAX_EXPECTED_RESULT_LENGTH} characters`);
            }

            if (
                step.troubleshootingHint !== undefined
                && (
                    typeof step.troubleshootingHint !== 'string'
                    || step.troubleshootingHint.length > C.MAX_TROUBLESHOOTING_HINT_LENGTH
                )
            ) {
                errors.push(`${prefix}.troubleshootingHint exceeds ${C.MAX_TROUBLESHOOTING_HINT_LENGTH} characters`);
            }
        }
        for (let expectedOrder = 1; expectedOrder <= procedureSteps.length; expectedOrder++) {
            if (!seenOrders.has(expectedOrder)) {
                errors.push(`procedure.steps must include stepOrder ${expectedOrder}`);
            }
        }
    }

    // Validate warnings
    if (procedure.warnings !== undefined) {
        if (!Array.isArray(procedure.warnings)) {
            errors.push('procedure.warnings must be an array');
        } else if (procedure.warnings.length > C.MAX_WARNINGS) {
            errors.push(`procedure.warnings cannot exceed ${C.MAX_WARNINGS}`);
        }
        for (let i = 0; Array.isArray(procedure.warnings) && i < procedure.warnings.length; i++) {
            const w = procedure.warnings[i];
            if (!isRecord(w)) {
                errors.push(`warning[${i}] must be an object`);
                continue;
            }
            if (typeof w.message !== 'string' || w.message.trim().length === 0) {
                errors.push(`warning[${i}].message is required`);
            } else if (w.message.length > C.MAX_WARNING_MESSAGE_LENGTH) {
                errors.push(`warning[${i}].message exceeds ${C.MAX_WARNING_MESSAGE_LENGTH} characters`);
            }
            if (typeof w.severity !== 'string' || !VALID_SEVERITIES.has(w.severity)) {
                errors.push(`warning[${i}].severity is invalid`);
            }
        }
    }

    // Validate prerequisites
    if (procedure.prerequisites !== undefined) {
        if (!Array.isArray(procedure.prerequisites)) {
            errors.push('procedure.prerequisites must be an array');
        } else if (procedure.prerequisites.length > C.MAX_PREREQUISITES) {
            errors.push(`procedure.prerequisites cannot exceed ${C.MAX_PREREQUISITES}`);
        }
        for (let i = 0; Array.isArray(procedure.prerequisites) && i < procedure.prerequisites.length; i++) {
            const p = procedure.prerequisites[i];
            if (!isRecord(p)) {
                errors.push(`prerequisite[${i}] must be an object`);
                continue;
            }
            if (typeof p.description !== 'string' || p.description.trim().length === 0) {
                errors.push(`prerequisite[${i}].description is required`);
            } else if (p.description.length > C.MAX_PREREQUISITE_DESCRIPTION_LENGTH) {
                errors.push(`prerequisite[${i}].description exceeds ${C.MAX_PREREQUISITE_DESCRIPTION_LENGTH} characters`);
            }
            if (typeof p.type !== 'string' || !VALID_PREREQ_TYPES.has(p.type)) {
                errors.push(`prerequisite[${i}].type is invalid`);
            }
        }
    }

    // Validate procedureSlug
    if (procedure.procedureSlug !== undefined) {
        if (typeof procedure.procedureSlug !== 'string') {
            errors.push('procedure.procedureSlug must be lowercase alphanumeric with underscores only');
        } else if (procedure.procedureSlug.length > C.MAX_PROCEDURE_SLUG_LENGTH) {
            errors.push(`procedure.procedureSlug exceeds ${C.MAX_PROCEDURE_SLUG_LENGTH} characters`);
        } else if (!/^[a-z0-9_]+$/.test(procedure.procedureSlug)) {
            errors.push('procedure.procedureSlug must be lowercase alphanumeric with underscores only');
        }
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Normalize step order to be sequential (1, 2, 3...) regardless of input gaps.
 * Mutates in-place for efficiency.
 */
export function normalizeStepOrder(procedure: AnswerlatticeProcedure | unknown): void {
    if (!isRecord(procedure) || !Array.isArray(procedure.steps) || procedure.steps.length === 0) return;
    if (!procedure.steps.every(isRecord)) return;
    procedure.steps.sort((a, b) => Number(a.stepOrder) - Number(b.stepOrder));
    procedure.steps.forEach((step, index) => {
        step.stepOrder = index + 1;
    });
}
