import { Vector } from '@lib/firebase/firebaseAdmin';
import { genAIClient } from '@lib/google/genAi';
import { writeLogEntry } from 'logs/utils';

const EMBED_MODEL = 'text-embedding-004';
const CHAT_MODEL = 'gemini-2.5-flash';

type VectorInstance = InstanceType<typeof Vector>;

const LOG_FILE = "kb.log";

export async function callGeminiEmbedding(text: string): Promise<VectorInstance> {
    const response = await genAIClient.models.embedContent({ model: EMBED_MODEL, contents: text });
    const embedding = response.embeddings[0];

    if (!embedding?.values) {
        throw new Error('Unexpected Gemini embedding response shape');
    }

    return new Vector(embedding.values);
}

/**
 * Generates a search query from an image using Gemini's vision capabilities
 * The generated query is used for vector search to find relevant KB articles
 * 
 * @param userPrompt - The user's text question
 * @param imageBase64 - Base64-encoded image data
 * @param mimeType - Image MIME type (e.g., 'image/png', 'image/jpeg')
 * @returns AI-generated search query text
 */
export async function generateSearchQueryFromImage(
    userPrompt: string,
    imageBase64: string,
    mimeType: string
): Promise<string> {
    try {
        const AI_MODEL = 'gemini-2.5-pro';

        const prompt = `Based on the user's question and the provided image, generate a concise, factual, and keyword-rich description to be used as a search query for a technical knowledge base. Focus on objects, text, error messages, and concepts visible in the image. Do not answer the question. Only provide the search query.

User Question: "${userPrompt}"`;

        const contentParts = [
            { text: prompt },
            {
                inlineData: {
                    data: imageBase64,
                    mimeType: mimeType
                }
            }
        ];

        const response = await genAIClient.models.generateContent({
            model: AI_MODEL,
            contents: contentParts,
        });

        const text = response.text;

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'IMAGE_TO_TEXT_QUERY_GENERATED',
            data: { originalPrompt: userPrompt, generatedQuery: text }
        });

        return text.trim();
    } catch (error: any) {
        console.error('Error in generateSearchQueryFromImage:', error);
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'ERROR_IMAGE_QUERY_GENERATION',
            data: { error: error.message }
        });
        throw new Error(`Failed to generate search query from image: ${error.message}`);
    }
}

function trim(s: string, n = 900) {
    const t = (s || '').replace(/\s+/g, ' ').trim();
    return t.length > n ? t.slice(0, n) + '…' : t;
}

/**
 * Build conversation context string from history
 */
function buildConversationContext(conversationHistory?: Array<{ role: 'user' | 'assistant'; content?: string; craftedAnswer?: string }>): string {
    if (!conversationHistory || conversationHistory.length === 0) return '';

    return '\n\nPrevious Conversation:\n' + conversationHistory.map((msg, idx) => {
        const text = msg.role === 'user' ? msg.content : msg.craftedAnswer;
        return `${idx + 1}. ${msg.role === 'user' ? 'User' : 'Assistant'}: ${text}`;
    }).join('\n');
}

/**
 * Build system instruction based on mode (QnA vs Assistant) and image presence
 */
function buildSystemInstruction(hasConversationHistory: boolean, hasImage: boolean): string {
    if (hasConversationHistory) {
        return `You are a conversational Help Center assistant in ASSISTANT MODE. The user is having an ongoing conversation with you. Use the conversation history to provide contextual, personalized answers.

Answer using ONLY the provided documents, but reference previous messages to maintain conversation flow and coherence. Format your "craftedAnswer" using GitHub-flavored Markdown for clarity (use numbered lists for steps, bullet points for features, **bold** for important UI elements, and \`code blocks\` for technical terms).

**CONVERSATION AWARENESS:**
- Reference previous questions/answers when relevant (e.g., "As I mentioned earlier..." or "Building on your previous question...")
- Maintain consistent terminology from the conversation
- If the user asks follow-up questions, understand they're related to the previous topic

**CRITICAL RULE - Graceful Failures:** If the provided documents do not contain a relevant answer, do NOT invent information. Instead, politely acknowledge the limitation and suggest helpful next steps.

Be conversational yet concise (5–10 sentences). Return STRICT JSON.`;
    }

    if (hasImage) {
        return `You are a precise Help Center assistant in QnA MODE. A user has provided an image and a question. Answer ONLY using the provided documents, using the image as crucial context to understand the user's specific situation. Format your "craftedAnswer" using GitHub-flavored Markdown for clarity (use numbered lists for steps, bullet points for features, **bold** for important UI elements, and \`code blocks\` for technical terms).

**CRITICAL RULE - Graceful Failures:** If the provided documents do not contain a relevant answer, do NOT invent information. Instead, politely acknowledge the limitation and suggest helpful next steps. For example:
- "I couldn't find specific information about that in our knowledge base. However, I can help you with [related topics]. Would any of these be helpful?"
- "This question is outside the scope of our current documentation. I recommend [contacting support / checking our community forum / etc.]"

Be concise and actionable (5–8 sentences). Return STRICT JSON.`;
    }

    return `You are a precise Help Center assistant in QnA MODE. Answer ONLY using the provided documents. Format your "craftedAnswer" using GitHub-flavored Markdown for clarity (use numbered lists for steps, bullet points for features, **bold** for important UI elements, and \`code blocks\` for technical terms).

**CRITICAL RULE - Graceful Failures:** If the provided documents do not contain a relevant answer, do NOT invent information. Instead, politely acknowledge the limitation and suggest helpful next steps. For example:
- "I couldn't find specific information about that in our knowledge base. However, I can help you with [related topics]. Would any of these be helpful?"
- "This question is outside the scope of our current documentation. I recommend [contacting support / checking our community forum / etc.]"

Be concise and actionable (5–8 sentences). Return STRICT JSON.`;
}

/**
 * Build complete Gemini prompt configuration
 */
function buildGeminiPromptConfig(
    userPrompt: string,
    docs: Array<{ docId: string; category: string; section: string; title?: string; content: string; }>,
    image?: { imageBase64: string; mimeType: string },
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content?: string; craftedAnswer?: string }>
) {
    const context = docs.map((d) =>
        `[${d.docId}] (${d.category} / ${d.section}) ${d.title || ''}\n${trim(d.content)}`).join('\n\n');

    const conversationContext = buildConversationContext(conversationHistory);
    const hasConversationHistory = conversationHistory && conversationHistory.length > 0;
    const systemInstruction = buildSystemInstruction(hasConversationHistory, !!image);

    const userInstruction = `
User question: ${userPrompt}
${conversationContext}

Documents:
${context}

Return STRICT JSON with exactly this shape:
{
  "craftedAnswer": string,
  "references": string[docId1, docId2, ...],
  "suggestedQuestions": string[question1, question2, question3]
}
Rules:
- Only include id's of documents actually used in the answer.
${image ? '- Use the provided image as context to make your answer more specific and relevant.' : ''}
${hasConversationHistory ? '- Consider the conversation history to provide contextual answers.' : ''}

SUGGESTED QUESTIONS - CRITICAL RULES:
- If you successfully answered the question: Generate 3 follow-up questions that help users dive deeper or explore related topics.
- If you COULD NOT answer the question (no relevant documents): Look at the available document titles/topics above and suggest 3 questions about what IS actually documented. Example: If user asks about "pricing" (not documented) but you see docs about "Upload Content" and "User Settings", suggest "How do I upload new content?", "What file types are supported?", "How do I change my settings?"
- NEVER suggest questions about topics that are not in the provided documents.
- Make questions specific to actual document content, not generic.
- Do not invent values or topics.
`;

    const contentParts: any[] = [{ text: userInstruction }];

    if (image) {
        contentParts.push({
            inlineData: {
                data: image.imageBase64,
                mimeType: image.mimeType
            }
        });
    }

    const generationConfig = {
        responseMimeType: "application/json",
        temperature: 0.0,
        topP: 0.9,
        topK: 40,
        // maxOutputTokens: 8192,
        systemInstruction
    };

    return { contentParts, generationConfig };
}

export async function callGeminiChat(
    userPrompt: string,
    docs: Array<{ docId: string; category: string; section: string; title?: string; content: string; }>,
    image?: { imageBase64: string; mimeType: string },
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content?: string; craftedAnswer?: string }>
): Promise<string> {
    const AI_MODEL = "gemini-2.5-flash";

    const { contentParts, generationConfig } = buildGeminiPromptConfig(
        userPrompt,
        docs,
        image,
        conversationHistory
    );

    const response = await genAIClient.models.generateContent({
        model: AI_MODEL,
        contents: contentParts,
        config: generationConfig,
    });

    return response.text;
}

