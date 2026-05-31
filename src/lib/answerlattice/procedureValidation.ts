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
    AnswerlatticeProcedure,
} from '@type/answerlattice';

const VALID_ACTIONS = new Set(Object.values(ANSWERLATTICE_PROCEDURE_ACTIONS));
const VALID_SEVERITIES = new Set(Object.values(ANSWERLATTICE_WARNING_SEVERITY));
const VALID_PREREQ_TYPES = new Set(Object.values(ANSWERLATTICE_PREREQUISITE_TYPE));
const C = ANSWERLATTICE_PROCEDURE_CONSTRAINTS;

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
 * 6. procedureSlug: optional, ≤60 chars, lowercase alphanumeric + underscore
 */
export function validateProcedure(
    answerType: AnswerlatticeAnswerType | undefined,
    procedure: AnswerlatticeProcedure | undefined
): ProcedureValidationResult {
    const errors: string[] = [];

    // If not a procedure answer, procedure field is optional — skip validation
    if (!answerType || answerType !== ANSWERLATTICE_ANSWER_TYPES.PROCEDURE) {
        return { valid: true, errors: [] };
    }

    // Procedure required for procedure answer type
    if (!procedure) {
        return { valid: false, errors: ['content.procedure is required when answerType is "procedure"'] };
    }

    // Validate steps
    if (!procedure.steps || !Array.isArray(procedure.steps)) {
        errors.push('procedure.steps must be a non-empty array');
    } else {
        if (procedure.steps.length < C.MIN_STEPS) {
            errors.push(`procedure.steps must have at least ${C.MIN_STEPS} step`);
        }
        if (procedure.steps.length > C.MAX_STEPS) {
            errors.push(`procedure.steps cannot exceed ${C.MAX_STEPS} steps`);
        }

        const seenOrders = new Set<number>();
        for (let i = 0; i < procedure.steps.length; i++) {
            const step = procedure.steps[i];
            const prefix = `step[${i}]`;

            if (!step.stepOrder || step.stepOrder < 1) {
                errors.push(`${prefix}.stepOrder must be a positive integer`);
            }
            if (seenOrders.has(step.stepOrder)) {
                errors.push(`${prefix}.stepOrder ${step.stepOrder} is duplicated`);
            }
            seenOrders.add(step.stepOrder);

            if (!step.action || !VALID_ACTIONS.has(step.action as any)) {
                errors.push(`${prefix}.action "${step.action}" is not in the approved vocabulary`);
            }

            if (!step.instruction || step.instruction.trim().length === 0) {
                errors.push(`${prefix}.instruction is required`);
            } else if (step.instruction.length > C.MAX_INSTRUCTION_LENGTH) {
                errors.push(`${prefix}.instruction exceeds ${C.MAX_INSTRUCTION_LENGTH} characters`);
            }

            if (step.expectedResult && step.expectedResult.length > C.MAX_EXPECTED_RESULT_LENGTH) {
                errors.push(`${prefix}.expectedResult exceeds ${C.MAX_EXPECTED_RESULT_LENGTH} characters`);
            }

            if (step.troubleshootingHint && step.troubleshootingHint.length > C.MAX_TROUBLESHOOTING_HINT_LENGTH) {
                errors.push(`${prefix}.troubleshootingHint exceeds ${C.MAX_TROUBLESHOOTING_HINT_LENGTH} characters`);
            }
        }
    }

    // Validate warnings
    if (procedure.warnings) {
        if (procedure.warnings.length > C.MAX_WARNINGS) {
            errors.push(`procedure.warnings cannot exceed ${C.MAX_WARNINGS}`);
        }
        for (let i = 0; i < procedure.warnings.length; i++) {
            const w = procedure.warnings[i];
            if (!w.message || w.message.trim().length === 0) {
                errors.push(`warning[${i}].message is required`);
            } else if (w.message.length > C.MAX_WARNING_MESSAGE_LENGTH) {
                errors.push(`warning[${i}].message exceeds ${C.MAX_WARNING_MESSAGE_LENGTH} characters`);
            }
            if (!w.severity || !VALID_SEVERITIES.has(w.severity as any)) {
                errors.push(`warning[${i}].severity "${w.severity}" is invalid`);
            }
        }
    }

    // Validate prerequisites
    if (procedure.prerequisites) {
        if (procedure.prerequisites.length > C.MAX_PREREQUISITES) {
            errors.push(`procedure.prerequisites cannot exceed ${C.MAX_PREREQUISITES}`);
        }
        for (let i = 0; i < procedure.prerequisites.length; i++) {
            const p = procedure.prerequisites[i];
            if (!p.description || p.description.trim().length === 0) {
                errors.push(`prerequisite[${i}].description is required`);
            } else if (p.description.length > C.MAX_PREREQUISITE_DESCRIPTION_LENGTH) {
                errors.push(`prerequisite[${i}].description exceeds ${C.MAX_PREREQUISITE_DESCRIPTION_LENGTH} characters`);
            }
            if (!p.type || !VALID_PREREQ_TYPES.has(p.type as any)) {
                errors.push(`prerequisite[${i}].type "${p.type}" is invalid`);
            }
        }
    }

    // Validate procedureSlug
    if (procedure.procedureSlug) {
        if (procedure.procedureSlug.length > C.MAX_PROCEDURE_SLUG_LENGTH) {
            errors.push(`procedure.procedureSlug exceeds ${C.MAX_PROCEDURE_SLUG_LENGTH} characters`);
        }
        if (!/^[a-z0-9_]+$/.test(procedure.procedureSlug)) {
            errors.push('procedure.procedureSlug must be lowercase alphanumeric with underscores only');
        }
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Normalize step order to be sequential (1, 2, 3...) regardless of input gaps.
 * Mutates in-place for efficiency.
 */
export function normalizeStepOrder(procedure: AnswerlatticeProcedure): void {
    if (!procedure.steps || procedure.steps.length === 0) return;
    procedure.steps.sort((a, b) => a.stepOrder - b.stepOrder);
    procedure.steps.forEach((step, index) => {
        step.stepOrder = index + 1;
    });
}
