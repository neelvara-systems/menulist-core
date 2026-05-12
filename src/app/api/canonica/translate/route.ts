export const dynamic = 'force-dynamic';

/**
 * Canonica — Article Translation API
 *
 * Translates a KB article's title and content to a target locale using Gemini.
 * Stores the translation on the article document: translations.{locale} = { ... }
 *
 * Phase 4 — Multi-Language KB Articles (4.2)
 * Feature-flagged: ENABLE_CANONICA_MULTI_LANGUAGE
 *
 * POST /api/canonica/translate
 * Body: { articleId, targetLocale }
 *
 * @see __docs__/canonica/canonica-build-priority-roadmap.md Phase 4
 */

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { admin } from '@lib/firebase/firebaseAdmin';
import { canonicaFirestoreAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import { genAIClient } from '@lib/google/genAi';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { secureError } from '@lib/security/secureLogger';
import { CANONICA_SUPPORTED_LOCALES } from '@type/canonica';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';

const TranslateRequestSchema = z.object({
    articleId: z.string().trim().min(1).max(160),
    targetLocale: z.enum(CANONICA_SUPPORTED_LOCALES as unknown as [string, ...string[]]),
});

export const POST = withAuth(async (request: NextRequest, session) => {
    try {
        if (!FEATURE_FLAGS.ENABLE_CANONICA_MULTI_LANGUAGE) {
            return NextResponse.json({ error: 'Multi-language is not enabled.' }, { status: 403 });
        }

        const validation = TranslateRequestSchema.safeParse(await request.json());
        if (!validation.success) {
            return NextResponse.json({ error: `Invalid locale. Supported: ${CANONICA_SUPPORTED_LOCALES.join(', ')}` }, { status: 400 });
        }
        const { articleId, targetLocale } = validation.data;
        if (targetLocale === 'en-US') {
            return NextResponse.json({ error: 'Cannot translate to source locale (en-US).' }, { status: 400 });
        }

        // Rate limiting
        const rateLimitConfig = getRateLimitForFeature('AI_OPERATION');
        const rateLimitResult = await checkRateLimit({
            key: `canonica-translate:${session.user.id}`,
            ...rateLimitConfig,
        });
        if (!rateLimitResult.allowed) {
            return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
        }

        // Fetch article
        const db = canonicaFirestoreAdmin;
        const articleDoc = await db.collection(DB_COLLECTIONS.KB_ARTICLES).doc(articleId).get();
        if (!articleDoc.exists) {
            return NextResponse.json({ error: 'Article not found.' }, { status: 404 });
        }

        const article = articleDoc.data()!;
        const articleTenantId = Number(article.tId ?? article.tenantId);
        const articleStoreId = Number(article.sId ?? article.storeId);
        if (
            !Number.isFinite(articleTenantId) ||
            !Number.isFinite(articleStoreId) ||
            articleTenantId !== Number(session.tId) ||
            articleStoreId !== Number(session.sId)
        ) {
            return NextResponse.json({ error: 'Article not found.' }, { status: 404 });
        }

        const title = article.title || '';

        // Extract plain text from TipTap JSON content for translation
        let plainContent = '';
        try {
            if (article.content && typeof article.content === 'object') {
                plainContent = extractTextFromTiptap(article.content);
            } else if (typeof article.content === 'string') {
                plainContent = article.content;
            }
        } catch {
            plainContent = JSON.stringify(article.content || '');
        }

        if (!title && !plainContent) {
            return NextResponse.json({ error: 'Article has no content to translate.' }, { status: 400 });
        }

        // Call Gemini for translation
        const LOCALE_NAMES: Record<string, string> = {
            'en-GB': 'British English', 'hi-IN': 'Hindi', 'ar-SA': 'Arabic',
            'es-ES': 'Spanish', 'fr-FR': 'French', 'de-DE': 'German',
            'pt-BR': 'Brazilian Portuguese', 'ja-JP': 'Japanese', 'zh-CN': 'Simplified Chinese',
            'ko-KR': 'Korean', 'it-IT': 'Italian', 'nl-NL': 'Dutch',
            'ru-RU': 'Russian', 'tr-TR': 'Turkish',
        };
        const targetLanguage = LOCALE_NAMES[targetLocale] || targetLocale;

        const prompt = `You are a professional translator for a SaaS help center knowledge base.

Translate the following KB article from English to ${targetLanguage}.

RULES:
- Maintain the original meaning precisely
- Keep technical terms in English if they have no standard translation (e.g., "API", "webhook", "dashboard")
- Use formal/professional tone appropriate for product documentation
- Do NOT add, remove, or modify any information
- Preserve any formatting markers or structure

TITLE (English):
${title}

CONTENT (English):
${plainContent}

Respond in this exact JSON format:
{
  "translatedTitle": "...",
  "translatedContent": "..."
}`;

        const response = await genAIClient.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
        });

        const responseText = response.text || '';

        // Parse response
        let translatedTitle = title;
        let translatedContent = plainContent;

        try {
            const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleaned);
            translatedTitle = parsed.translatedTitle || title;
            translatedContent = parsed.translatedContent || plainContent;
        } catch {
            // If JSON parse fails, use raw response as content
            translatedContent = responseText;
        }

        // Build TipTap JSON for translated content (simple paragraph wrapping)
        const translatedTiptapContent = {
            type: 'doc',
            content: translatedContent.split('\n\n').filter(Boolean).map((paragraph: string) => ({
                type: 'paragraph',
                content: [{ type: 'text', text: paragraph.trim() }],
            })),
        };

        // Save translation to article document
        const now = admin.firestore.Timestamp.now();
        await db.collection(DB_COLLECTIONS.KB_ARTICLES).doc(articleId).update({
            [`translations.${targetLocale}`]: {
                locale: targetLocale,
                title: translatedTitle,
                content: translatedTiptapContent,
                translatedBy: 'ai',
                translatedAt: now,
            },
        });

        return NextResponse.json({
            articleId,
            locale: targetLocale,
            translatedTitle,
            translatedBy: 'ai',
        });

    } catch (error) {
        secureError('[Canonica Translate] Failed', error as Error, { userId: session.user.id });
        return NextResponse.json(
            { error: 'Translation failed. Please try again.' },
            { status: 500 }
        );
    }
});

/**
 * Extract plain text from TipTap JSON content recursively.
 */
function extractTextFromTiptap(node: any): string {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (node.type === 'text') return node.text || '';

    let text = '';
    if (Array.isArray(node.content)) {
        for (const child of node.content) {
            text += extractTextFromTiptap(child);
            if (child.type === 'paragraph' || child.type === 'heading' || child.type === 'bulletList' || child.type === 'orderedList') {
                text += '\n\n';
            }
        }
    }
    return text;
}
