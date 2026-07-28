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
import { geminiLogger, getGeminiErrorContext } from './geminiDiagnostics';
import { feedbackAnalysisPrompt } from './prompts/v1/feedbackAnalysis.prompt';

const GEMINI_FEEDBACK_ANALYSIS_EMPTY_RESPONSE = 'GEMINI_FEEDBACK_ANALYSIS_EMPTY_RESPONSE';
const GEMINI_FEEDBACK_ANALYSIS_FAILED = 'GEMINI_FEEDBACK_ANALYSIS_FAILED';
const GEMINI_FEEDBACK_ANALYSIS_INVALID_RESPONSE = 'GEMINI_FEEDBACK_ANALYSIS_INVALID_RESPONSE';
const GEMINI_FEEDBACK_ANALYSIS_PARSE_FAILED = 'GEMINI_FEEDBACK_ANALYSIS_PARSE_FAILED';

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
    geminiLogger.info('[Gemini] Analyzing feedback items', {
      itemCount: feedback.length,
    });

    // Build prompt
    const prompt = feedbackAnalysisPrompt(feedback);

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
      throw new Error(GEMINI_FEEDBACK_ANALYSIS_EMPTY_RESPONSE);
    }

    // Parse JSON response
    const parsed = parseGeminiResponse(text);

    geminiLogger.info('[Gemini] Feedback analysis complete', {
      themeCount: parsed.themes.length,
    });

    return parsed;

  } catch (error) {
    geminiLogger.error('[Gemini] Feedback analysis failed', {
      failureCode: GEMINI_FEEDBACK_ANALYSIS_FAILED,
      itemCount: feedback.length,
      error: getGeminiErrorContext(error),
    });

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

    const parsed: unknown = JSON.parse(cleanText);
    const record = parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;

    // Validate structure
    if (!record || !Array.isArray(record.themes)) {
      throw new Error(GEMINI_FEEDBACK_ANALYSIS_INVALID_RESPONSE);
    }

    const normalizeText = (value: unknown, maxLength: number, fallback = '') => (
      typeof value === 'string'
        ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength)
        : fallback
    );
    const normalizeTextArray = (value: unknown, maxItems: number, maxLength: number) => (
      Array.isArray(value)
        ? value
          .filter((entry): entry is string => typeof entry === 'string')
          .map((entry) => normalizeText(entry, maxLength))
          .filter(Boolean)
          .slice(0, maxItems)
        : []
    );

    // Ensure all required fields exist
    return {
      themes: record.themes.flatMap((value) => {
        const theme = value !== null && typeof value === 'object' && !Array.isArray(value)
          ? value as Record<string, unknown>
          : null;
        if (!theme) return [];
        const severity: 'low' | 'medium' | 'high' =
          theme.severity === 'low' || theme.severity === 'high' ? theme.severity : 'medium';
        const count = typeof theme.count === 'number' && Number.isSafeInteger(theme.count) && theme.count >= 0
          ? theme.count
          : 0;
        return [{
          theme: normalizeText(theme.theme, 80, 'Unknown'),
          count,
          severity,
          examples: normalizeTextArray(theme.examples, 3, 500),
          suggestedActions: normalizeTextArray(theme.suggestedActions ?? theme.suggested_actions, 8, 500),
        }];
      }).slice(0, 8),
      summary: normalizeText(record.summary, 1500, 'No summary provided'),
      topIssues: normalizeTextArray(record.topIssues ?? record.top_issues, 5, 300),
      recommendations: normalizeTextArray(record.recommendations, 8, 500),
    };

  } catch (error) {
    geminiLogger.error('[Gemini] Failed to parse feedback analysis response', {
      failureCode: GEMINI_FEEDBACK_ANALYSIS_PARSE_FAILED,
      error: getGeminiErrorContext(error),
    });

    throw new Error(GEMINI_FEEDBACK_ANALYSIS_PARSE_FAILED);
  }
}

// ================================================================
// COST OPTIMIZATION
// ================================================================

/**
 * Estimate token count for cost monitoring
 */
export function estimateTokenCount(feedback: unknown[]): number {
  const avgCharsPerToken = 4; // Rough estimate
  try {
    const serialized = JSON.stringify(feedback);
    return Math.ceil((serialized?.length || 0) / avgCharsPerToken);
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

/**
 * Batch feedback items to stay under token limits
 */
export function batchFeedback<T>(
  feedback: T[],
  maxTokens: number = 8000
): T[][] {
  const batches: T[][] = [];
  let currentBatch: T[] = [];
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
