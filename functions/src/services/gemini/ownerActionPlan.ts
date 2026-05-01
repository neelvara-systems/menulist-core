/**
 * Owner Action Plan generation
 *
 * Cost-safe pattern:
 * - Rules create the actual actions from analytics counters.
 * - Gemini may only simplify wording. It must not invent new actions.
 * - If Gemini fails, rules output is used directly.
 */

import { OWNER_ANALYTICS_AI_MODEL } from '../../constants/ai';
import { genAIClient } from '../../genAiClient';

export type OwnerActionPriority = 'high' | 'medium' | 'low';

export interface OwnerActionCandidate {
    id: string;
    type: string;
    title: string;
    description: string;
    reason: string;
    actionLabel: string;
    metricLabel?: string;
    priority: OwnerActionPriority;
}

export interface OwnerActionPlanResult {
    generatedBy: 'rules' | 'ai';
    actions: OwnerActionCandidate[];
}

const SYSTEM_PROMPT = `You are a calm operations assistant for a small business owner.

You will receive pre-selected action cards from analytics rules.
Your job is only to make the wording shorter and clearer.

Rules:
- Do not add new actions.
- Do not change IDs, types, priorities, or metrics.
- Do not mention AI, strategy, funnel, conversion, optimize, revenue, or growth.
- Use plain words.
- Keep every card factual and directly tied to the provided reason.
- Output valid JSON only.`;

function buildPrompt(candidates: OwnerActionCandidate[]): string {
    return `Rewrite these owner action cards in simple language.

Keep the same ids, types, priorities, action labels, and metric labels.

Cards:
${JSON.stringify(candidates, null, 2)}

Output:
{
  "actions": [
    {
      "id": "same id",
      "type": "same type",
      "title": "short title",
      "description": "one short sentence",
      "reason": "short factual reason",
      "actionLabel": "same action label",
      "metricLabel": "same metric label if present",
      "priority": "same priority"
    }
  ]
}`;
}

function parseJson(text: string): { actions: OwnerActionCandidate[] } {
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json\n?/, '').replace(/```\n?$/, '');
    } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/```\n?/, '').replace(/```\n?$/, '');
    }

    const parsed = JSON.parse(cleanText);
    if (!Array.isArray(parsed.actions)) {
        throw new Error('Invalid owner action response: actions array missing');
    }
    return parsed;
}

function sanitizeAiActions(
    candidates: OwnerActionCandidate[],
    aiActions: OwnerActionCandidate[],
): OwnerActionCandidate[] {
    const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    return aiActions
        .map((action) => {
            const original = candidateById.get(action.id);
            if (!original) return null;
            return {
                ...original,
                title: String(action.title || original.title).slice(0, 90),
                description: String(action.description || original.description).slice(0, 180),
                reason: String(action.reason || original.reason).slice(0, 180),
            };
        })
        .filter((action): action is OwnerActionCandidate => Boolean(action))
        .slice(0, 4);
}

export async function generateOwnerActionPlan(
    candidates: OwnerActionCandidate[],
): Promise<OwnerActionPlanResult> {
    const trimmedCandidates = candidates.slice(0, 4);
    if (trimmedCandidates.length === 0) {
        return { generatedBy: 'rules', actions: [] };
    }

    try {
        const result = await genAIClient.models.generateContent({
            model: OWNER_ANALYTICS_AI_MODEL,
            contents: [{ role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\n${buildPrompt(trimmedCandidates)}` }] }],
            config: {
                temperature: 0.2,
                maxOutputTokens: 700,
            },
        });
        const text = result.text;
        if (!text) throw new Error('Empty response from Gemini');

        const parsed = parseJson(text);
        const actions = sanitizeAiActions(trimmedCandidates, parsed.actions);
        return {
            generatedBy: actions.length > 0 ? 'ai' : 'rules',
            actions: actions.length > 0 ? actions : trimmedCandidates,
        };
    } catch (error) {
        console.error('[Gemini] Owner action plan generation failed:', error);
        return { generatedBy: 'rules', actions: trimmedCandidates };
    }
}
