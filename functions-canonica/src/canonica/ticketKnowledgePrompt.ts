/**
 * Canonica — Ticket Knowledge Extraction Prompt
 * 
 * Gemini prompt for extracting structured problem/resolution from
 * accumulated ticket conversations. Used by resolutionExtractor.ts.
 * 
 * Expansion Item #9 — Ticket → Knowledge Loop
 * Feature-flagged: ENABLE_CANONICA_TICKET_KNOWLEDGE
 * 
 * @see __docs__/canonica/ticket-knowledge-loop/
 */

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════

export const TICKET_KNOWLEDGE_SYSTEM_PROMPT = `You are Canonica's Ticket Resolution Analyzer. You extract structured knowledge from accumulated support ticket resolutions.

You are given multiple resolved ticket conversations about the same product area. Your job is to identify the common problem pattern and extract the consensus resolution.

CRITICAL RULES:
1. ONLY include resolution information confirmed in 2+ tickets
2. STRIP all personal information (names, emails, account IDs, phone numbers)
3. Be declarative: state what IS, not what the user should do (unless procedural)
4. Do NOT invent features or capabilities not mentioned in the ticket resolutions
5. If resolutions conflict across tickets, note the ambiguity
6. structuredSummary must be ≤500 characters
7. detailedExplanation should be 2-4 paragraphs synthesizing the resolution
8. confidence should reflect how consistent the resolutions are across tickets (0-1)

OUTPUT FORMAT (strict JSON only, no markdown, no code fences):
{
  "title": "Clear, concise title for the knowledge article",
  "structuredSummary": "≤500 char summary of the common problem and resolution",
  "detailedExplanation": "2-4 paragraph synthesis of the resolution pattern",
  "edgeCases": "Edge cases or variations mentioned across tickets (or null)",
  "constraints": "Limitations or prerequisites for the resolution (or null)",
  "procedure": null,
  "confidence": 0.85,
  "extractedProblem": "One-line description of the common problem"
}

If the resolution is clearly procedural (step-by-step), include a procedure object with steps[].
Return ONLY valid JSON. No explanation. No markdown.`;

// ═══════════════════════════════════════════════════════════════
// USER PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════

export interface TicketKnowledgePromptParams {
    entityName: string;
    entityDescription: string;
    entityType: string;
    ticketSubjects: string[];
    resolutionMessages: string[][];
    existingAnswerTitles: string[];
}

export function buildTicketKnowledgePrompt(params: TicketKnowledgePromptParams): string {
    const parts: string[] = [];

    parts.push(`Product Entity: ${params.entityName} (${params.entityType})`);
    parts.push(`Description: ${params.entityDescription || 'No description available'}`);
    parts.push('');
    parts.push(`Number of resolved tickets analyzed: ${params.ticketSubjects.length}`);
    parts.push('');

    // Ticket subjects
    parts.push('Ticket subjects:');
    for (const subject of params.ticketSubjects.slice(0, 10)) {
        parts.push(`- "${subject}"`);
    }

    // Resolution conversations (max 5 tickets × 5 messages each)
    parts.push('');
    parts.push('Resolution conversations:');
    for (let i = 0; i < Math.min(params.resolutionMessages.length, 5); i++) {
        parts.push(`--- Ticket ${i + 1} resolution ---`);
        for (const msg of params.resolutionMessages[i].slice(0, 5)) {
            parts.push(msg.substring(0, 300));
        }
    }

    // Existing answers to avoid duplication
    if (params.existingAnswerTitles.length > 0) {
        parts.push('');
        parts.push('Existing knowledge articles for this entity (avoid duplicating):');
        for (const title of params.existingAnswerTitles) {
            parts.push(`- ${title}`);
        }
    }

    parts.push('');
    parts.push('Extract the common problem pattern and consensus resolution. Return JSON only.');

    return parts.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// RESPONSE PARSER
// ═══════════════════════════════════════════════════════════════

export interface ParsedTicketResolution {
    title: string;
    structuredSummary: string;
    detailedExplanation: string;
    edgeCases: string | null;
    constraints: string | null;
    procedure: Record<string, any> | null;
    confidence: number;
    extractedProblem: string;
}

export function parseTicketResolutionResponse(rawResponse: string | null): ParsedTicketResolution | null {
    if (!rawResponse) return null;

    try {
        let cleaned = rawResponse.trim();
        if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(cleaned);

        if (!parsed.title || typeof parsed.title !== 'string') return null;
        if (!parsed.structuredSummary || typeof parsed.structuredSummary !== 'string') return null;
        if (!parsed.detailedExplanation || typeof parsed.detailedExplanation !== 'string') return null;

        const summary = parsed.structuredSummary.length > 500
            ? parsed.structuredSummary.substring(0, 497) + '...'
            : parsed.structuredSummary;

        return {
            title: parsed.title.substring(0, 200),
            structuredSummary: summary,
            detailedExplanation: parsed.detailedExplanation,
            edgeCases: typeof parsed.edgeCases === 'string' ? parsed.edgeCases : null,
            constraints: typeof parsed.constraints === 'string' ? parsed.constraints : null,
            procedure: parsed.procedure && typeof parsed.procedure === 'object' ? parsed.procedure : null,
            confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
            extractedProblem: typeof parsed.extractedProblem === 'string' ? parsed.extractedProblem.substring(0, 300) : '',
        };
    } catch {
        return null;
    }
}
