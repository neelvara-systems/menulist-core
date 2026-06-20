/**
 * Gemini KB Quality Analysis Service
 * Analyzes knowledge base article effectiveness using Gemini
 */

import { AI_MODEL } from '../../constants/ai';
import { genAIClient } from '../../genAiClient';
import { KB_QUALITY_PROMPT_V1 } from './prompts/v1/kbQuality.prompt';

// ================================================================
// TYPES
// ================================================================

interface KBArticleIssue {
  type: 'low_confidence' | 'negative_feedback' | 'no_answer';
  queries: string[];
  suggestions: string[];
}

interface KBQualityResult {
  qualityScore: number;
  issues: KBArticleIssue[];
  improvementSuggestions: string[];
  priority: 'low' | 'medium' | 'high';
}

interface KBQualityInput {
  article: {
    title: string;
    category?: string;
    section?: string;
    content?: string;
    lastUpdated?: string;
  };
  lowConfidenceQueries: string[];
  negativeFeedback: Array<{ query: string; comment: string }>;
  noAnswerQueries: string[];
}

// ================================================================
// MAIN FUNCTION
// ================================================================

/**
 * Analyze KB article quality using Gemini
 */
export async function analyzeKBArticleQuality(
  input: KBQualityInput
): Promise<KBQualityResult> {
  try {
    // Build prompt
    const systemPrompt = KB_QUALITY_PROMPT_V1.system;
    const userPrompt = KB_QUALITY_PROMPT_V1.user(input);
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

    console.log('[KB Quality] Analyzing article:', input.article.title);
    console.log('[KB Quality] Issues:', {
      lowConfidence: input.lowConfidenceQueries.length,
      negativeFeedback: input.negativeFeedback.length,
      noAnswer: input.noAnswerQueries.length,
    });

    // Call Gemini (using shared genAIClient — SDK standardization P0)
    const result = await genAIClient.models.generateContent({
      model: AI_MODEL,
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      config: {
        temperature: KB_QUALITY_PROMPT_V1.config.temperature,
        topP: KB_QUALITY_PROMPT_V1.config.topP,
        topK: KB_QUALITY_PROMPT_V1.config.topK,
      },
    });
    const text = result.text;
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    console.log('[KB Quality] Received response, parsing JSON...');

    // Parse JSON response
    const analysis = parseKBQualityResponse(text);

    console.log('[KB Quality] Analysis complete:', {
      score: analysis.qualityScore,
      priority: analysis.priority,
      issueCount: analysis.issues.length,
    });

    return analysis;
  } catch (error) {
    console.error('[KB Quality] Error analyzing KB article:', error);

    // Return fallback analysis
    return generateFallbackAnalysis(input);
  }
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Parse Gemini JSON response
 */
function parseKBQualityResponse(text: string): KBQualityResult {
  try {
    // Remove markdown code blocks if present
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/```\n?/g, '');
    }

    const parsed = JSON.parse(cleanText);

    // Validate structure
    if (!parsed.qualityScore || !Array.isArray(parsed.issues) || !Array.isArray(parsed.improvementSuggestions)) {
      throw new Error('Invalid response structure');
    }

    return {
      qualityScore: Number(parsed.qualityScore),
      issues: parsed.issues.map((issue: any) => ({
        type: issue.type || 'low_confidence',
        queries: Array.isArray(issue.queries) ? issue.queries : [],
        suggestions: Array.isArray(issue.suggestions) ? issue.suggestions : [],
      })),
      improvementSuggestions: parsed.improvementSuggestions,
      priority: parsed.priority || 'medium',
    };
  } catch (error) {
    console.error('[KB Quality] Failed to parse JSON response:', error);
    throw error;
  }
}

/**
 * Generate fallback analysis when Gemini fails
 */
function generateFallbackAnalysis(input: KBQualityInput): KBQualityResult {
  const totalIssues =
    input.lowConfidenceQueries.length +
    input.negativeFeedback.length +
    input.noAnswerQueries.length;

  // Calculate basic quality score
  let qualityScore = 100;
  if (totalIssues > 0) {
    qualityScore = Math.max(0, 100 - (totalIssues * 10));
  }

  // Determine priority
  let priority: 'low' | 'medium' | 'high' = 'low';
  if (totalIssues > 10) {
    priority = 'high';
  } else if (totalIssues > 5) {
    priority = 'medium';
  }

  const issues: KBArticleIssue[] = [];

  // Add low confidence issues
  if (input.lowConfidenceQueries.length > 0) {
    issues.push({
      type: 'low_confidence',
      queries: input.lowConfidenceQueries.slice(0, 3),
      suggestions: ['Review and expand article content to better address these queries'],
    });
  }

  // Add negative feedback issues
  if (input.negativeFeedback.length > 0) {
    issues.push({
      type: 'negative_feedback',
      queries: input.negativeFeedback.slice(0, 3).map(f => f.query),
      suggestions: ['Address user complaints and improve answer quality'],
    });
  }

  // Add no answer issues
  if (input.noAnswerQueries.length > 0) {
    issues.push({
      type: 'no_answer',
      queries: input.noAnswerQueries.slice(0, 3),
      suggestions: ['Add missing information to cover these queries'],
    });
  }

  return {
    qualityScore,
    issues,
    improvementSuggestions: [
      'Review article content for completeness',
      'Add examples and clarifications',
      'Update article based on user queries',
    ],
    priority,
  };
}

// ================================================================
// BATCH PROCESSING
// ================================================================

/**
 * Analyze multiple KB articles in batch
 */
export async function analyzeKBArticlesBatch(
  inputs: KBQualityInput[]
): Promise<Map<string, KBQualityResult>> {
  const results = new Map<string, KBQualityResult>();

  console.log(`[KB Quality] Analyzing ${inputs.length} articles...`);

  // Process articles sequentially to avoid rate limits
  for (const input of inputs) {
    try {
      const analysis = await analyzeKBArticleQuality(input);
      results.set(input.article.title, analysis);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`[KB Quality] Failed to analyze article "${input.article.title}":`, error);
      // Continue with other articles
    }
  }

  console.log(`[KB Quality] Batch analysis complete: ${results.size}/${inputs.length} succeeded`);

  return results;
}

// ================================================================
// EXPORTS
// ================================================================

export default {
  analyzeKBArticleQuality,
  analyzeKBArticlesBatch,
};
