export const dynamic = 'force-dynamic';
import { HarmBlockThreshold, HarmCategory } from "@google/genai";
import { genAIClient } from "@lib/google/genAi";
import { logger } from "@lib/monitoring/logger";
import { checkAIOperationLimit } from "@lib/rateLimit/helpers";
import { validateAPIInput } from "@lib/security/inputValidation";
import { buildSecurityContext } from "@lib/security/securityContext";
import { getSafeFallbackCaption, sanitizeAIOutput } from "@lib/trust/phraseGuard";
import { CampaignCaptionRequestSchema } from "@lib/validation/apiSchemas";
import { CAMPAIGN_CAPTION_PROMPT_V1, CampaignCaptionInput } from "@services/gemini/prompts/v1/campaignCaption.prompt";
import { NextResponse } from 'next/server';
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const AI_MODEL = "gemini-2.5-flash";

/**
 * Campaign Caption Generation API
 * 
 * Per Strategy Doc:
 * - Generate simple, friendly captions for campaign items
 * - No marketing jargon, no "AI" language
 * - Appropriate for WhatsApp, Poster, etc.
 * 
 * Follows existing patterns from descriptions API
 */
export const POST = withAuth(async (request, session) => {
    const userId = session.user.id;

    try {
        // �️ SAFE_MODE: Block expensive operations during system maintenance
        const { checkSafeMode } = await import('@lib/ops/safeMode');
        const safeModeResponse = await checkSafeMode();
        if (safeModeResponse) return safeModeResponse;

        // �🔒 RATE LIMITING: Prevent API abuse
        const rateLimitResponse = await checkAIOperationLimit();
        if (rateLimitResponse) return rateLimitResponse;

        // 🔒 INPUT VALIDATION: Prevent injection attacks (OWASP A03)
        const rawData = await request.json();
        const validation = validateAPIInput(CampaignCaptionRequestSchema, rawData);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';

            logger.security('Campaign Caption Input Validation Failed', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/campaigns/caption',
                error: errorMsg,
            }, 'medium');

            return NextResponse.json({
                error: 'Invalid input',
                details: errorMsg
            }, { status: 400 });
        }

        const validated = validation.data;
        const { itemName, itemDescription, itemPrice, categoryName, businessName, campaignType, surface, language, projectId } = validated;

        // 🔒 TENANT ISOLATION: Verify user owns this project
        if (projectId) {
            const tenantId = session.tId;
            const storeId = session.sId;

            if (!verifyTenantAccess(session, tenantId, storeId, request)) {
                logger.security('Tenant Access Violation - Campaign Caption API', {
                    ...buildSecurityContext(session, request),
                    endpoint: '/api/campaigns/caption',
                    attemptedProjectId: projectId,
                }, 'critical');
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const startTime = Date.now();

        // Build prompt input
        const promptInput: CampaignCaptionInput = {
            itemName,
            itemDescription,
            itemPrice,
            categoryName,
            businessName,
            campaignType,
            surface,
            language
        };

        // Get prompt from registry
        const prompt = CAMPAIGN_CAPTION_PROMPT_V1;
        const userPrompt = prompt.user(promptInput);

        const generationConfig = {
            responseMimeType: "application/json",
            temperature: prompt.config.temperature,
            topP: prompt.config.topP,
            topK: prompt.config.topK,
            systemInstruction: prompt.system,
            safetySettings: [
                {
                    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
                },
                {
                    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
                }
            ]
        };

        const response = await genAIClient.models.generateContent({
            model: AI_MODEL,
            contents: userPrompt,
            config: generationConfig,
        });

        const endTime = Date.now();
        const processingTime = endTime - startTime;

        let generatedData: any;
        try {
            generatedData = JSON.parse(response.text);
        } catch (parseError) {
            logger.error('Campaign caption JSON parse error', parseError, {
                userId,
                projectId,
                rawResponse: response.text?.substring(0, 500)
            });
            return NextResponse.json({
                error: 'Failed to parse AI response',
            }, { status: 500 });
        }

        // 🛡️ TRUST GUARD: Sanitize AI output for forbidden phrases
        const fallbackCaption = getSafeFallbackCaption(campaignType);
        if (generatedData.caption) {
            generatedData.caption = sanitizeAIOutput(
                generatedData.caption,
                fallbackCaption,
                'campaign_caption'
            );
        }
        if (generatedData.shortCaption) {
            generatedData.shortCaption = sanitizeAIOutput(
                generatedData.shortCaption,
                fallbackCaption,
                'campaign_short_caption'
            );
        }

        return NextResponse.json({
            data: generatedData,
            meta: {
                processingTime,
                promptVersion: prompt.version.version,
                surface,
                campaignType
            }
        }, { status: 200 });

    } catch (error) {
        logger.error('Campaign Caption API error', error, { userId });
        return NextResponse.json({
            error: 'Caption generation failed',
            message: (error as Error).message
        }, { status: 500 });
    }
});
