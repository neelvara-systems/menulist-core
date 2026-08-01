/**
 * Answerlattice — Draft Prompt Template & Response Parser
 * 
 * Shared prompt construction and response parsing for AI draft generation.
 * Used by both:
 * - Client-side draftGenerator.ts (manual regeneration from governance UI)
 * - Server-side functions-answerlattice draftGenerator.ts (nightly CF batch)
 * 
 * Expansion Item #4 — Automatic Knowledge Creation
 * Feature-flagged: ENABLE_ANSWERLATTICE_AUTO_KNOWLEDGE
 * 
 * Doctrine: "LLM assists the control plane. It never becomes the control plane."
 * Drafts are PROPOSALS — never auto-published.
 * 
 * @see __docs__/answerlattice/automatic-knowledge-creation/
 */

import {
    AnswerlatticePrerequisiteType,
    AnswerlatticeProcedure,
    AnswerlatticeProcedureAction,
    AnswerlatticeProcedureStep,
    AnswerlatticeWarningSeverity,
} from '@type/answerlattice';
import { AnswerlatticeProcedureSchema } from './procedureValidation';

// ═══════════════════════════════════════════════════════════════
// PROMPT VERSION (for reproducibility tracking)
// ═══════════════════════════════════════════════════════════════

export const DRAFT_PROMPT_VERSION = 'v1';

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════

export const DRAFT_SYSTEM_PROMPT = `You are Answerlattice's Knowledge Draft Generator. You create structured canonical answer skeletons from support signal evidence.

Your output will be reviewed by a human founder before publishing. Generate a helpful starting point, not a final document.

OUTPUT RULES:
1. Follow the JSON schema EXACTLY — no extra fields, no prose outside JSON
2. Be declarative: state what IS, not what the user should do (unless procedure)
3. Reference only product concepts from the provided entity context
4. Do NOT invent features, capabilities, or workflows not mentioned in context
5. structuredSummary must be ≤500 characters
6. detailedExplanation should be 2-4 paragraphs
7. If the topic is clearly procedural (how-to, setup, configure), include a procedure object with steps
8. Include warnings for destructive or irreversible actions
9. Include prerequisites if the workflow requires specific roles, plans, or prior states
10. If unsure about details, say "Verify with your product team" rather than guessing

OUTPUT FORMAT (strict JSON only, no markdown, no code fences):
{
  "title": "Clear, concise title for the canonical answer",
  "structuredSummary": "≤500 char declarative summary of the answer core",
  "detailedExplanation": "2-4 paragraph explanation with context and nuance",
  "edgeCases": "Edge cases, limitations, or special scenarios (or null if none)",
  "constraints": "Restrictions, limits, or caveats (or null if none)",
  "procedure": {
    "steps": [
      { "stepOrder": 1, "action": "navigate", "instruction": "≤80 chars", "expectedResult": "≤120 chars" }
    ],
    "warnings": [
      { "message": "≤200 chars", "severity": "warning" }
    ],
    "prerequisites": [
      { "description": "≤200 chars", "type": "general" }
    ]
  }
}

If the topic is NOT procedural, set "procedure" to null.
Return ONLY valid JSON. No explanation. No markdown.`;

// ═══════════════════════════════════════════════════════════════
// PROMPT INPUT TYPES
// ═══════════════════════════════════════════════════════════════

export interface DraftPromptInput {
    entityName: string;
    entityDescription: string;
    entityType: string;
    signalExamples: string[];
    existingAnswerSummaries?: string[];
    relatedArticleTitles?: string[];
    mode?: 'new_answer' | 'refine_existing';
}

// ═══════════════════════════════════════════════════════════════
// PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════

/**
 * Build the user prompt for draft generation.
 * Keeps token budget small (~200 input tokens) for cost efficiency.
 */
export function buildDraftUserPrompt(input: DraftPromptInput): string {
    const parts: string[] = [];

    parts.push(`Entity: ${input.entityName} (${input.entityType})`);
    parts.push(`Description: ${input.entityDescription || 'No description available'}`);

    if (input.signalExamples.length > 0) {
        parts.push('');
        parts.push('Users are asking about this topic. Example support signals:');
        for (const example of input.signalExamples.slice(0, 5)) {
            parts.push(`- "${example}"`);
        }
    }

    if (input.existingAnswerSummaries && input.existingAnswerSummaries.length > 0) {
        parts.push('');
        parts.push('Related existing documentation (avoid duplicating):');
        for (const summary of input.existingAnswerSummaries.slice(0, 3)) {
            parts.push(`- ${summary}`);
        }
    }

    if (input.relatedArticleTitles && input.relatedArticleTitles.length > 0) {
        parts.push('');
        parts.push('Related KB articles (for context, do not repeat their content):');
        for (const title of input.relatedArticleTitles.slice(0, 5)) {
            parts.push(`- ${title}`);
        }
    }

    parts.push('');
    parts.push(input.mode === 'refine_existing'
        ? 'Generate a complete replacement draft for the existing canonical answer. Preserve confirmed facts, address the support signals, and do not invent new product behavior. Return JSON only.'
        : 'Generate a canonical answer draft for this knowledge gap. Return JSON only.');

    return parts.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// RESPONSE PARSER
// ═══════════════════════════════════════════════════════════════

export interface ParsedDraftResponse {
    title: string;
    structuredSummary: string;
    detailedExplanation: string;
    edgeCases: string | null;
    constraints: string | null;
    procedure: AnswerlatticeProcedure | null;
}

/**
 * Parse and validate the Gemini response into a structured draft.
 * Returns null if parsing fails (caller handles graceful degradation).
 */
export function parseDraftResponse(rawResponse: string | null): ParsedDraftResponse | null {
    if (!rawResponse) return null;

    try {
        // Strip markdown code fences if present (Gemini sometimes wraps in ```json)
        let cleaned = rawResponse.trim();
        if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(cleaned);

        // Validate required fields
        if (!parsed.title || typeof parsed.title !== 'string') return null;
        if (!parsed.structuredSummary || typeof parsed.structuredSummary !== 'string') return null;
        if (!parsed.detailedExplanation || typeof parsed.detailedExplanation !== 'string') return null;

        const title = parsed.title.trim().slice(0, 180);
        const detailedExplanation = parsed.detailedExplanation.trim().slice(0, 24_000);
        if (!title || !detailedExplanation) return null;

        // Enforce structuredSummary length
        const normalizedSummary = parsed.structuredSummary.trim();
        if (!normalizedSummary) return null;
        const summary = normalizedSummary.length > 500
            ? normalizedSummary.substring(0, 497) + '...'
            : normalizedSummary;

        // Parse procedure if present
        let procedure: AnswerlatticeProcedure | null = null;
        if (isRecord(parsed.procedure) && Array.isArray(parsed.procedure.steps)) {
            const rawSteps: unknown[] = parsed.procedure.steps;
            const stepsWithoutOrder: Omit<AnswerlatticeProcedureStep, 'stepOrder'>[] = rawSteps
                .slice(0, 12) // Max 12 steps
                .flatMap((step: unknown): Omit<AnswerlatticeProcedureStep, 'stepOrder'>[] => {
                    if (!isRecord(step)) return [];
                    const instruction = cleanBoundedText(step.instruction, 80);
                    if (!instruction) return [];
                    return [{
                        action: validateProcedureAction(step.action) || 'navigate',
                        instruction,
                        expectedResult: cleanBoundedText(step.expectedResult, 120),
                        troubleshootingHint: cleanBoundedText(step.troubleshootingHint, 200),
                    }];
                });
            const steps: AnswerlatticeProcedureStep[] = stepsWithoutOrder
                .map((step, index) => ({ ...step, stepOrder: index + 1 }));

            const warnings = (Array.isArray(parsed.procedure.warnings) ? parsed.procedure.warnings : [])
                .slice(0, 5)
                .flatMap((warning: unknown) => {
                    if (!isRecord(warning)) return [];
                    const message = cleanBoundedText(warning.message, 200);
                    if (!message) return [];
                    return [{
                        message,
                        severity: validateWarningSeverity(warning.severity) || 'info',
                    }];
                });

            const prerequisites = (Array.isArray(parsed.procedure.prerequisites) ? parsed.procedure.prerequisites : [])
                .slice(0, 5)
                .flatMap((prerequisite: unknown) => {
                    if (!isRecord(prerequisite)) return [];
                    const description = cleanBoundedText(prerequisite.description, 200);
                    if (!description) return [];
                    return [{
                        description,
                        type: validatePrerequisiteType(prerequisite.type) || 'general',
                        value: cleanBoundedText(prerequisite.value, 120),
                    }];
                });

            const procedureResult = AnswerlatticeProcedureSchema.safeParse({
                steps,
                warnings: warnings.length > 0 ? warnings : undefined,
                prerequisites: prerequisites.length > 0 ? prerequisites : undefined,
            });
            procedure = procedureResult.success ? procedureResult.data : null;
        }

        return {
            title,
            structuredSummary: summary,
            detailedExplanation,
            edgeCases: typeof parsed.edgeCases === 'string' ? parsed.edgeCases.trim().slice(0, 8_000) || null : null,
            constraints: typeof parsed.constraints === 'string' ? parsed.constraints.trim().slice(0, 8_000) || null : null,
            procedure,
        };
    } catch {
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════

const VALID_ACTIONS = [
    'open', 'navigate', 'click', 'select', 'enter', 'toggle',
    'submit', 'confirm', 'download', 'upload', 'copy', 'paste',
    'scroll', 'expand', 'collapse',
];

const VALID_SEVERITIES = ['info', 'warning', 'destructive'];
const VALID_PREREQ_TYPES = ['role', 'plan', 'state', 'general'];

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const cleanBoundedText = (value: unknown, maxLength: number): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const cleaned = value.trim().slice(0, maxLength);
    return cleaned || undefined;
};

function validateProcedureAction(action: unknown): AnswerlatticeProcedureAction | null {
    if (typeof action !== 'string' || !VALID_ACTIONS.includes(action)) return null;
    return action as AnswerlatticeProcedureAction;
}

function validateWarningSeverity(severity: unknown): AnswerlatticeWarningSeverity | null {
    if (typeof severity !== 'string' || !VALID_SEVERITIES.includes(severity)) return null;
    return severity as AnswerlatticeWarningSeverity;
}

function validatePrerequisiteType(type: unknown): AnswerlatticePrerequisiteType | null {
    if (typeof type !== 'string' || !VALID_PREREQ_TYPES.includes(type)) return null;
    return type as AnswerlatticePrerequisiteType;
}
