/**
 * Gemini Service - Weekly Narrative Generation
 * 
 * Uses Gemini 2.5 Flash to generate executive summaries of weekly performance
 */

import { AI_MODEL } from '../../constants/ai';
import { genAIClient } from '../../genAiClient';
import { geminiLogger, getGeminiErrorContext } from './geminiDiagnostics';
import { weeklyNarrativePrompt } from './prompts/v1/weeklyNarrative.prompt';

const GEMINI_WEEKLY_NARRATIVE_EMPTY_RESPONSE = 'GEMINI_WEEKLY_NARRATIVE_EMPTY_RESPONSE';
const GEMINI_WEEKLY_NARRATIVE_FAILED = 'GEMINI_WEEKLY_NARRATIVE_FAILED';
const GEMINI_WEEKLY_NARRATIVE_INVALID_RESPONSE = 'GEMINI_WEEKLY_NARRATIVE_INVALID_RESPONSE';
const GEMINI_WEEKLY_NARRATIVE_PARSE_FAILED = 'GEMINI_WEEKLY_NARRATIVE_PARSE_FAILED';

// ================================================================
// TYPES
// ================================================================

export interface WeeklyNarrativeResult {
  narrative: string;
  highlights: string[];
  recommendations: string[];
  keyMetrics: {
    volumeChange: number;
    satisfactionChange: number;
    topCategory: string;
  };
}

// ================================================================
// MAIN FUNCTION
// ================================================================

/**
 * Generate weekly narrative using Gemini
 */
export async function generateWeeklyNarrative(
  metrics: any
): Promise<WeeklyNarrativeResult> {
  try {
    geminiLogger.info('[Gemini] Generating weekly narrative', {
      totalChats: metrics.totalChats || 0,
    });

    // Build prompt
    const prompt = weeklyNarrativePrompt(metrics);

    // Call Gemini (using shared genAIClient — SDK standardization P0)
    const geminiResult = await genAIClient.models.generateContent({
      model: AI_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    });
    const text = geminiResult.text;
    if (!text) {
      throw new Error(GEMINI_WEEKLY_NARRATIVE_EMPTY_RESPONSE);
    }

    // Parse JSON response
    const parsed = parseGeminiResponse(text);

    // Build complete result with metrics
    const finalResult: WeeklyNarrativeResult = {
      ...parsed,
      keyMetrics: {
        volumeChange: metrics.volumeChange || 0,
        satisfactionChange: metrics.satisfactionChange || 0,
        topCategory: metrics.topCategory || 'General',
      },
    };

    geminiLogger.info('[Gemini] Weekly narrative generated successfully', {
      totalChats: metrics.totalChats || 0,
    });

    return finalResult;

  } catch (error) {
    geminiLogger.error('[Gemini] Weekly narrative generation failed', {
      failureCode: GEMINI_WEEKLY_NARRATIVE_FAILED,
      totalChats: metrics.totalChats || 0,
      error: getGeminiErrorContext(error),
    });

    // Fallback response if Gemini fails
    return {
      narrative: [
        `This week saw ${metrics.totalChats} total conversations`,
        `with a ${metrics.satisfactionRate.toFixed(1)}% satisfaction rate.`,
        `Performance ${metrics.volumeChange > 0 ? 'increased' : 'decreased'}`,
        `by ${Math.abs(metrics.volumeChange).toFixed(1)}% compared to last week.`,
      ].join(' '),
      highlights: [
        `Total conversations: ${metrics.totalChats}`,
        `Satisfaction rate: ${metrics.satisfactionRate.toFixed(1)}%`,
        `Top category: ${metrics.topCategory}`,
      ],
      recommendations: [
        'Manual review recommended - AI analysis unavailable',
      ],
      keyMetrics: {
        volumeChange: metrics.volumeChange || 0,
        satisfactionChange: metrics.satisfactionChange || 0,
        topCategory: metrics.topCategory || 'General',
      },
    };
  }
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Parse Gemini's JSON response with error handling
 */
function parseGeminiResponse(text: string): Omit<WeeklyNarrativeResult, 'keyMetrics'> {
  try {
    // Remove markdown code blocks if present
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/```json\n?/, '').replace(/```\n?$/, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/```\n?/, '').replace(/```\n?$/, '');
    }

    const parsed = JSON.parse(cleanText);

    // Validate structure
    if (!parsed.narrative || typeof parsed.narrative !== 'string') {
      throw new Error(GEMINI_WEEKLY_NARRATIVE_INVALID_RESPONSE);
    }

    return {
      narrative: parsed.narrative,
      highlights: parsed.highlights || [],
      recommendations: parsed.recommendations || [],
    };

  } catch (error) {
    geminiLogger.error('[Gemini] Failed to parse weekly narrative response', {
      failureCode: GEMINI_WEEKLY_NARRATIVE_PARSE_FAILED,
      error: getGeminiErrorContext(error),
    });

    throw new Error(GEMINI_WEEKLY_NARRATIVE_PARSE_FAILED);
  }
}

// ================================================================
// EXPORTS
// ================================================================

export default {
  generateWeeklyNarrative,
};
