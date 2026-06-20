/**
 * Gemini Service - Weekly Narrative Generation
 * 
 * Uses Gemini 2.5 Flash to generate executive summaries of weekly performance
 */

import { AI_MODEL } from '../../constants/ai';
import { genAIClient } from '../../genAiClient';
import { weeklyNarrativePrompt } from './prompts/v1/weeklyNarrative.prompt';

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
    console.log(`[Gemini] Generating weekly narrative`);

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
      throw new Error('Empty response from Gemini');
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

    console.log(`[Gemini] Weekly narrative generated successfully`);

    return finalResult;

  } catch (error) {
    console.error('[Gemini] Error generating weekly narrative:', error);

    // Fallback response if Gemini fails
    return {
      narrative: `This week saw ${metrics.totalChats} total conversations with a ${metrics.satisfactionRate.toFixed(1)}% satisfaction rate. Performance ${metrics.volumeChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(metrics.volumeChange).toFixed(1)}% compared to last week.`,
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
      throw new Error('Invalid response: missing narrative');
    }

    return {
      narrative: parsed.narrative,
      highlights: parsed.highlights || [],
      recommendations: parsed.recommendations || [],
    };

  } catch (error) {
    console.error('[Gemini] Failed to parse response:', error);

    throw new Error(`Failed to parse Gemini response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ================================================================
// EXPORTS
// ================================================================

export default {
  generateWeeklyNarrative,
};
