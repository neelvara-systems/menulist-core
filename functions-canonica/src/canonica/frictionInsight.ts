/**
 * Canonica — Product Friction Intelligence: Weekly Insight Generation
 * 
 * Step 10 of canonicaNightly (Sundays only): Generate AI-powered weekly
 * friction summary from the nightly snapshot data.
 * 
 * Uses Gemini 2.5 Flash to produce a concise narrative for SaaS founders.
 * Follows the same pattern as weekly narrative generation.
 * 
 * Feature-flagged: ENABLE_CANONICA_FRICTION_INTELLIGENCE
 * @see __docs__/canonica/product-friction-intelligence/
 */

import { Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import { FUNCTION_FLAGS } from '../constants/features';
import { firestoreAdmin as db } from '../firebaseAdmin';

const PROMPT_VERSION = 'friction_insight_v1';
const MIN_SIGNALS_FOR_INSIGHT = 5;

export interface FrictionInsightResult {
    generated: boolean;
    skippedReason?: string;
}

// ═══════════════════════════════════════════════════════════════
// GEMINI CALL
// ═══════════════════════════════════════════════════════════════

async function callGeminiForFrictionInsight(promptData: string): Promise<{
    summary: string;
    topFrictions: Array<{
        entityName: string;
        entityType: string;
        signalCount: number;
        escalationRate: number;
        trend: string;
        suggestedAction: string;
    }>;
    emergingTopics: string[];
    overallHealth: string;
} | null> {
    try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const apiKey = process.env.GEMINI_AI_KEY;
        if (!apiKey) {
            console.warn('[Canonica Friction Insight] GEMINI_AI_KEY not set. Skipping insight generation.');
            return null;
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `You are a product friction analyst for a SaaS company.

Given the following support friction data for the past week, generate a concise weekly friction report.

Data:
${promptData}

Generate a JSON response with this exact structure:
{
  "summary": "2-3 paragraph executive summary (max 200 words)",
  "topFrictions": [
    {
      "entityName": "entity name",
      "entityType": "feature|workflow|integration|error",
      "signalCount": number,
      "escalationRate": number (0-1),
      "trend": "rising|stable|improving|new",
      "suggestedAction": "specific action suggestion based on entity type"
    }
  ],
  "emergingTopics": ["human-readable description of each emerging topic"],
  "overallHealth": "HIGH|MODERATE|LOW"
}

Rules:
- Keep summary concise (max 200 words total)
- Use plain language (SaaS founder audience, non-technical)
- Focus on actionable insights, not statistics
- For suggestedAction, base it on entityType:
  - "feature" → improve documentation or UI
  - "workflow" → evaluate the onboarding/setup flow
  - "integration" → review the integration setup guide
  - "error" → investigate error handling and user messaging
  - other → review support articles for this topic
- Return ONLY valid JSON, no markdown code blocks`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Parse JSON from response (handle potential markdown wrapping)
        const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(jsonStr);

        return {
            summary: parsed.summary || '',
            topFrictions: parsed.topFrictions || [],
            emergingTopics: parsed.emergingTopics || [],
            overallHealth: parsed.overallHealth || 'LOW',
        };
    } catch (error) {
        console.error('[Canonica Friction Insight] Gemini call failed:', error);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
// MAIN INSIGHT GENERATOR
// ═══════════════════════════════════════════════════════════════

export async function generateFrictionInsight(tId: number, sId: number): Promise<FrictionInsightResult> {
    if (!FUNCTION_FLAGS.ENABLE_CANONICA_FRICTION_INTELLIGENCE) {
        return { generated: false, skippedReason: 'feature_flag_off' };
    }

    try {
        // 1. Read the nightly friction snapshot
        const snapshotDoc = await db
            .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(`frictionSnapshot_${tId}_${sId}`)
            .get();

        if (!snapshotDoc.exists) {
            return { generated: false, skippedReason: 'no_snapshot' };
        }

        const snapshot = snapshotDoc.data()!;

        // 2. Check minimum signal threshold
        if ((snapshot.totalSignals7d || 0) < MIN_SIGNALS_FOR_INSIGHT) {
            console.log(`[Canonica Friction Insight] Skipped for ${tId}/${sId}: insufficient data (${snapshot.totalSignals7d} < ${MIN_SIGNALS_FOR_INSIGHT})`);
            return { generated: false, skippedReason: `insufficient_data: ${snapshot.totalSignals7d} < ${MIN_SIGNALS_FOR_INSIGHT}` };
        }

        // 3. Build prompt data
        const topEntities = snapshot.topFrictionEntities || [];
        const emergingTopics = snapshot.emergingTopics || [];

        const promptData = JSON.stringify({
            overallHealth: snapshot.overallHealth,
            totalSignals7d: snapshot.totalSignals7d,
            totalEscalations7d: snapshot.totalEscalations7d,
            topFrictionEntities: topEntities.map((e: any) => ({
                name: e.entityName,
                type: e.entityType,
                signals7d: e.last7d?.queryCount || 0,
                escalationRate: e.last7d?.queryCount > 0
                    ? Math.round((e.last7d?.escalationCount || 0) / e.last7d.queryCount * 100) / 100
                    : 0,
                trend: e.trendDirection,
                frictionScore: e.last7d?.frictionScore || 0,
            })),
            emergingTopics: emergingTopics.map((t: any) => ({
                name: t.entityName,
                type: t.entityType,
                signals: t.queryCount,
                escalationRate: t.escalationRate,
            })),
        }, null, 2);

        // 4. Call Gemini
        const aiResult = await callGeminiForFrictionInsight(promptData);

        if (!aiResult) {
            return { generated: false, skippedReason: 'gemini_failed' };
        }

        // 5. Compute week boundaries
        const now = new Date();
        const weekEnd = now.toISOString().split('T')[0];
        const weekStartDate = new Date(now);
        weekStartDate.setDate(weekStartDate.getDate() - 6);
        const weekStart = weekStartDate.toISOString().split('T')[0];

        // 6. Write insight to platformSummary
        await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`friction_${tId}_${sId}`).set({
            lastUpdated: Timestamp.now(),
            weekStart,
            weekEnd,
            summary: aiResult.summary,
            topFrictions: aiResult.topFrictions,
            emergingTopics: aiResult.emergingTopics,
            overallHealth: aiResult.overallHealth,
            promptVersion: PROMPT_VERSION,
            generatedAt: Timestamp.now(),
        }, { merge: true });

        console.log(`[Canonica Friction Insight] Generated for ${tId}/${sId}: health=${aiResult.overallHealth}`);
        return { generated: true };

    } catch (error) {
        console.error(`[Canonica Friction Insight] Failed for ${tId}/${sId}:`, error);
        return { generated: false, skippedReason: `error: ${error instanceof Error ? error.message : 'unknown'}` };
    }
}
