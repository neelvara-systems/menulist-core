import { SIGNALDESK_DEFAULT_AI_MODEL, SIGNALDESK_INTEGRATION_ENV } from "@constant/signaldesk/integrations";
import { HarmBlockThreshold, HarmCategory } from "@google/genai";
import { genAIClient } from "@lib/google/genAi";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import type { SignalDeskAiTask, SignalDeskTargetSummary } from "@type/signaldesk";

type SignalDeskAiAssistInput = {
    evidence?: unknown;
    instruction?: string;
    model?: string;
    target: SignalDeskTargetSummary;
    task: SignalDeskAiTask;
};

type SignalDeskAiAssistResult = {
    confidence: "high" | "medium" | "low";
    model: string;
    output: Record<string, unknown>;
    promptVersion: "signaldesk-ai-assist-v1";
    task: SignalDeskAiTask;
};

const hasGeminiKey = () => Boolean(
    process.env.GEMINI_AI_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GEMINI_AI_KEY_2 ||
    process.env.GEMINI_AI_KEY_3 ||
    process.env.GEMINI_AI_KEY_4,
);

const getModel = () => process.env[SIGNALDESK_INTEGRATION_ENV.AI_MODEL] || SIGNALDESK_DEFAULT_AI_MODEL;
const SIGNALDESK_AI_RESPONSE_PARSE_FAILED = "signaldesk_ai_response_parse_failed";
const SIGNALDESK_AI_RESPONSE_SHAPE_INVALID = "signaldesk_ai_response_shape_invalid";

const SYSTEM_INSTRUCTION = [
    "You are SignalDesk, a private internal MenuList growth-review assistant.",
    "Return JSON only. Do not send messages, decide consent, or claim legal eligibility.",
    "Use only the supplied target and evidence. Mark missing facts as rejectedFacts.",
    "Do not invent menus, prices, hours, owner names, traffic claims, reviews, or contact consent.",
].join(" ");

const buildPrompt = (input: SignalDeskAiAssistInput) => JSON.stringify({
    evidence: input.evidence || null,
    instruction: input.instruction || null,
    outputShape: {
        confidence: "high | medium | low",
        nextAction: "review | hold | evidence | draft",
        reasons: ["short reason"],
        rejectedFacts: ["unsupported or missing fact"],
        suggestedCopy: "only for draft or reply-classification tasks",
    },
    task: input.task,
    target: input.target,
}, null, 2);

const getAiParseLogContext = (input: { model: string; task: SignalDeskAiTask; text: string }) => ({
    ...getBoundedRuntimeStringContext("model", input.model),
    ...getBoundedRuntimeStringContext("responseText", input.text),
    product: "signaldesk",
    task: input.task,
});

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

const parseSignalDeskAiJsonResponse = (
    text: string,
    context: { model: string; task: SignalDeskAiTask },
): Record<string, unknown> => {
    const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    const jsonText = objectMatch ? objectMatch[0] : cleaned;
    try {
        const parsed = JSON.parse(jsonText) as unknown;
        if (!isRecord(parsed)) {
            const error = new Error(SIGNALDESK_AI_RESPONSE_SHAPE_INVALID);
            logRuntimeFailure(SIGNALDESK_AI_RESPONSE_SHAPE_INVALID, error, getAiParseLogContext({
                model: context.model,
                task: context.task,
                text,
            }));
            throw error;
        }
        return parsed;
    } catch (error) {
        if (error instanceof Error && error.message === SIGNALDESK_AI_RESPONSE_SHAPE_INVALID) {
            throw new Error("SignalDesk AI response shape is invalid");
        }
        logRuntimeFailure(SIGNALDESK_AI_RESPONSE_PARSE_FAILED, error, getAiParseLogContext({
            model: context.model,
            task: context.task,
            text,
        }));
        throw new Error("SignalDesk AI response was not valid JSON");
    }
};

export async function runSignalDeskAiAssist(input: SignalDeskAiAssistInput): Promise<SignalDeskAiAssistResult> {
    if (!hasGeminiKey()) throw new Error("SignalDesk AI provider is not configured");

    const model = input.model || getModel();
    const response = await genAIClient.models.generateContent({
        model,
        contents: buildPrompt(input),
        config: {
            responseMimeType: "application/json",
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            ],
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: input.task === "draft" ? 0.45 : 0.2,
            topK: 40,
            topP: 0.9,
        },
    });

    const output = parseSignalDeskAiJsonResponse(String((response as any).text || ""), {
        model,
        task: input.task,
    });
    const confidence = output?.confidence === "high" || output?.confidence === "medium" || output?.confidence === "low"
        ? output.confidence
        : "low";

    return {
        confidence,
        model,
        output,
        promptVersion: "signaldesk-ai-assist-v1",
        task: input.task,
    };
}
