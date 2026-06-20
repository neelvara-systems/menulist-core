/**
 * Gemini Service - Feedback Analysis
 * 
 * Uses Gemini 2.5 Flash to analyze negative feedback and extract:
 * - Common themes and patterns
 * - Severity levels
 * - Actionable recommendations
 */

import { AI_MODEL } from '../../constants/ai';
import { genAIClient } from '../../genAiClient';
import { feedbackAnalysisPrompt } from './prompts/v1/feedbackAnalysis.prompt';

// ================================================================
// TYPES
// ================================================================

export interface FeedbackAnalysisResult {
  themes: Array<{
    theme: string;
    count: number;
    severity: 'low' | 'medium' | 'high';
    examples: string[];
    suggestedActions: string[];
  }>;
  summary: string;
  topIssues: string[];
  recommendations: string[];
}

// ================================================================
// MAIN FUNCTION
// ================================================================

/**
 * Generate AI analysis of feedback using Gemini
 */
export async function generateFeedbackAnalysis(
  feedback: Array<{ message: string; timestamp: string; context?: string }>
): Promise<FeedbackAnalysisResult> {
  try {
    console.log(`[Gemini] Analyzing ${feedback.length} feedback items`);

    // Prepare feedback summary for Gemini
    const feedbackText = feedback
      .map((item, index) => {
        const contextStr = item.context ? ` (Query: "${item.context}")` : '';
        return `${index + 1}. "${item.message}"${contextStr}`;
      })
      .join('\n');

    // Build prompt
    const prompt = feedbackAnalysisPrompt(feedbackText, feedback.length);

    // Call Gemini (using shared genAIClient — SDK standardization P0)
    const result = await genAIClient.models.generateContent({
      model: AI_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
    });
    const text = result.text;
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    // Parse JSON response
    const parsed = parseGeminiResponse(text);

    console.log(`[Gemini] Analysis complete: ${parsed.themes.length} themes identified`);

    return parsed;

  } catch (error) {
    console.error('[Gemini] Error generating feedback analysis:', error);

    // Fallback response if Gemini fails
    return {
      themes: [
        {
          theme: 'Analysis Unavailable',
          count: feedback.length,
          severity: 'medium',
          examples: feedback.slice(0, 3).map(f => f.message),
          suggestedActions: ['Manual review required - AI analysis failed'],
        },
      ],
      summary: 'AI analysis temporarily unavailable. Please review feedback manually.',
      topIssues: ['AI analysis error'],
      recommendations: ['Review feedback manually', 'Check Gemini API status'],
    };
  }
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Parse Gemini's JSON response with error handling
 */
function parseGeminiResponse(text: string): FeedbackAnalysisResult {
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
    if (!parsed.themes || !Array.isArray(parsed.themes)) {
      throw new Error('Invalid response: missing themes array');
    }

    // Ensure all required fields exist
    return {
      themes: parsed.themes.map((theme: any) => ({
        theme: theme.theme || 'Unknown',
        count: theme.count || 0,
        severity: theme.severity || 'medium',
        examples: theme.examples || [],
        suggestedActions: theme.suggestedActions || theme.suggested_actions || [],
      })),
      summary: parsed.summary || 'No summary provided',
      topIssues: parsed.topIssues || parsed.top_issues || [],
      recommendations: parsed.recommendations || [],
    };

  } catch (error) {
    console.error('[Gemini] Failed to parse response:', error);

    throw new Error(`Failed to parse Gemini response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ================================================================
// COST OPTIMIZATION
// ================================================================

/**
 * Estimate token count for cost monitoring
 */
export function estimateTokenCount(feedback: any[]): number {
  const avgCharsPerToken = 4; // Rough estimate
  const totalChars = JSON.stringify(feedback).length;
  return Math.ceil(totalChars / avgCharsPerToken);
}

/**
 * Batch feedback items to stay under token limits
 */
export function batchFeedback(
  feedback: any[],
  maxTokens: number = 8000
): any[][] {
  const batches: any[][] = [];
  let currentBatch: any[] = [];
  let currentTokens = 0;

  for (const item of feedback) {
    const itemTokens = estimateTokenCount([item]);

    if (currentTokens + itemTokens > maxTokens && currentBatch.length > 0) {
      batches.push(currentBatch);
      currentBatch = [item];
      currentTokens = itemTokens;
    } else {
      currentBatch.push(item);
      currentTokens += itemTokens;
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

// ================================================================
// EXPORTS
// ================================================================

export default {
  generateFeedbackAnalysis,
  estimateTokenCount,
  batchFeedback,
};
