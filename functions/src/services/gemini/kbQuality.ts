/**
 * Gemini KB Quality Analysis Service
 * Analyzes knowledge base article effectiveness using Gemini
 */

import { AI_MODEL } from '../../constants/ai';
import { genAIClient } from '../../genAiClient';
import { geminiLogger, getGeminiErrorContext } from './geminiDiagnostics';
import { KB_QUALITY_PROMPT_V1 } from './prompts/v1/kbQuality.prompt';

const GEMINI_KB_QUALITY_EMPTY_RESPONSE = 'GEMINI_KB_QUALITY_EMPTY_RESPONSE';
const GEMINI_KB_QUALITY_FAILED = 'GEMINI_KB_QUALITY_FAILED';
const GEMINI_KB_QUALITY_INVALID_RESPONSE = 'GEMINI_KB_QUALITY_INVALID_RESPONSE';
const GEMINI_KB_QUALITY_PARSE_FAILED = 'GEMINI_KB_QUALITY_PARSE_FAILED';
const GEMINI_KB_QUALITY_STORE_FAILED = 'GEMINI_KB_QUALITY_STORE_FAILED';
const GEMINI_KB_QUALITY_STORE_INVALID_RESPONSE = 'GEMINI_KB_QUALITY_STORE_INVALID_RESPONSE';
const GEMINI_KB_QUALITY_BATCH_ARTICLE_FAILED = 'GEMINI_KB_QUALITY_BATCH_ARTICLE_FAILED';
const MAX_STORE_QUALITY_ARTICLES = 10;
const MAX_STORE_QUALITY_ISSUES = 5;
const MAX_STORE_QUALITY_SUGGESTIONS = 8;

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

export interface KBQualityStoreArticleInput {
  articleRef: string;
  title: string;
  category?: string;
  section?: string;
  contentLength: number;
  lastUpdated?: string;
  lowConfidenceQueries: string[];
  negativeFeedback: Array<{ query: string; comment: string }>;
  noAnswerQueries: string[];
}

export interface KBQualityStoreArticleResult extends KBQualityResult {
  articleRef: string;
}

export interface KBQualityStoreResult {
  qualityScore: number;
  priority: 'low' | 'medium' | 'high';
  summary: string;
  topIssues: string[];
  improvementSuggestions: string[];
  articles: KBQualityStoreArticleResult[];
}

export interface KBQualityStoreInput {
  articles: KBQualityStoreArticleInput[];
  dataRange: {
    start: string;
    end: string;
  };
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

    geminiLogger.info('[KB Quality] Analyzing article quality', {
      titleLength: input.article.title.length,
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
      throw new Error(GEMINI_KB_QUALITY_EMPTY_RESPONSE);
    }

    geminiLogger.info('[KB Quality] Received article quality response', {
      responseLength: text.length,
    });

    // Parse JSON response
    const analysis = parseKBQualityResponse(text);

    geminiLogger.info('[KB Quality] Article quality analysis complete', {
      score: analysis.qualityScore,
      priority: analysis.priority,
      issueCount: analysis.issues.length,
    });

    return analysis;
  } catch (error) {
    geminiLogger.error('[KB Quality] Article quality analysis failed', {
      failureCode: GEMINI_KB_QUALITY_FAILED,
      titleLength: input.article.title.length,
      error: getGeminiErrorContext(error),
    });

    // Return fallback analysis
    return generateFallbackAnalysis(input);
  }
}

/**
 * Analyze KB quality for a store in one bounded Gemini request.
 */
export async function analyzeKBStoreQuality(
  input: KBQualityStoreInput
): Promise<KBQualityStoreResult> {
  try {
    const boundedInput: KBQualityStoreInput = {
      ...input,
      articles: input.articles.slice(0, MAX_STORE_QUALITY_ARTICLES),
    };
    const fullPrompt = `${KB_QUALITY_PROMPT_V1.system}\n\n${buildStoreQualityPrompt(boundedInput)}`;

    geminiLogger.info('[KB Quality] Analyzing store quality', {
      articleCount: boundedInput.articles.length,
      dateRangeDays: boundedInput.dataRange.start === boundedInput.dataRange.end ? 1 : undefined,
    });

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
      throw new Error(GEMINI_KB_QUALITY_EMPTY_RESPONSE);
    }

    const analysis = parseKBStoreQualityResponse(text, boundedInput);

    geminiLogger.info('[KB Quality] Store quality analysis complete', {
      score: analysis.qualityScore,
      priority: analysis.priority,
      articleCount: analysis.articles.length,
    });

    return analysis;
  } catch (error) {
    geminiLogger.error('[KB Quality] Store quality analysis failed', {
      failureCode: GEMINI_KB_QUALITY_STORE_FAILED,
      articleCount: input.articles.length,
      error: getGeminiErrorContext(error),
    });

    return generateStoreFallbackAnalysis(input);
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
    const qualityScore = Number(parsed.qualityScore);

    // Validate structure
    if (
      !Number.isFinite(qualityScore) ||
      !Array.isArray(parsed.issues) ||
      !Array.isArray(parsed.improvementSuggestions)
    ) {
      throw new Error(GEMINI_KB_QUALITY_INVALID_RESPONSE);
    }

    return {
      qualityScore,
      issues: parsed.issues.map((issue: any) => ({
        type: issue.type || 'low_confidence',
        queries: Array.isArray(issue.queries) ? issue.queries : [],
        suggestions: Array.isArray(issue.suggestions) ? issue.suggestions : [],
      })),
      improvementSuggestions: parsed.improvementSuggestions,
      priority: parsed.priority || 'medium',
    };
  } catch (error) {
    geminiLogger.error('[KB Quality] Failed to parse article quality response', {
      failureCode: GEMINI_KB_QUALITY_PARSE_FAILED,
      error: getGeminiErrorContext(error),
    });
    throw new Error(GEMINI_KB_QUALITY_PARSE_FAILED);
  }
}

function parseKBStoreQualityResponse(
  text: string,
  input: KBQualityStoreInput
): KBQualityStoreResult {
  try {
    const parsed = parseJsonPayload(text);
    const qualityScore = Number(parsed.qualityScore);

    if (
      !Number.isFinite(qualityScore) ||
      !Array.isArray(parsed.articles) ||
      !Array.isArray(parsed.improvementSuggestions)
    ) {
      throw new Error(GEMINI_KB_QUALITY_STORE_INVALID_RESPONSE);
    }

    const parsedArticlesByRef = new Map<string, KBQualityStoreArticleResult>();
    parsed.articles.forEach((article: any) => {
      if (!article || typeof article !== 'object') return;
      const articleRef = typeof article.articleRef === 'string' ? article.articleRef : '';
      if (!articleRef) return;
      const articleScore = Number(article.qualityScore);
      parsedArticlesByRef.set(articleRef, {
        articleRef,
        qualityScore: Number.isFinite(articleScore) ? clampScore(articleScore) : 0,
        issues: normalizeIssues(article.issues),
        improvementSuggestions: normalizeStringArray(article.improvementSuggestions, MAX_STORE_QUALITY_SUGGESTIONS),
        priority: normalizePriority(article.priority),
      });
    });

    const articles = input.articles.map((article) => (
      parsedArticlesByRef.get(article.articleRef) || generateFallbackArticleAnalysis(article)
    ));

    return {
      qualityScore: clampScore(qualityScore),
      priority: normalizePriority(parsed.priority),
      summary: typeof parsed.summary === 'string'
        ? parsed.summary.slice(0, 500)
        : 'KB quality analysis completed.',
      topIssues: normalizeStringArray(parsed.topIssues, MAX_STORE_QUALITY_ISSUES),
      improvementSuggestions: normalizeStringArray(parsed.improvementSuggestions, MAX_STORE_QUALITY_SUGGESTIONS),
      articles,
    };
  } catch (error) {
    geminiLogger.error('[KB Quality] Failed to parse store quality response', {
      failureCode: GEMINI_KB_QUALITY_PARSE_FAILED,
      error: getGeminiErrorContext(error),
    });
    throw new Error(GEMINI_KB_QUALITY_PARSE_FAILED);
  }
}

function parseJsonPayload(text: string): any {
  let cleanText = text.trim();
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/```\n?/g, '');
  }

  return JSON.parse(cleanText);
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

function generateFallbackArticleAnalysis(article: KBQualityStoreArticleInput): KBQualityStoreArticleResult {
  const analysis = generateFallbackAnalysis({
    article: {
      title: article.title,
      category: article.category,
      section: article.section,
      lastUpdated: article.lastUpdated,
    },
    lowConfidenceQueries: article.lowConfidenceQueries,
    negativeFeedback: article.negativeFeedback,
    noAnswerQueries: article.noAnswerQueries,
  });

  return {
    articleRef: article.articleRef,
    ...analysis,
  };
}

function generateStoreFallbackAnalysis(input: KBQualityStoreInput): KBQualityStoreResult {
  const articles = input.articles
    .slice(0, MAX_STORE_QUALITY_ARTICLES)
    .map(generateFallbackArticleAnalysis);
  const averageScore = articles.length > 0
    ? articles.reduce((sum, article) => sum + article.qualityScore, 0) / articles.length
    : 100;
  const priority = articles.some((article) => article.priority === 'high')
    ? 'high'
    : articles.some((article) => article.priority === 'medium')
      ? 'medium'
      : 'low';

  return {
    qualityScore: Math.round(averageScore),
    priority,
    summary: 'KB quality analysis completed with deterministic fallback scoring.',
    topIssues: Array.from(new Set(articles.flatMap((article) => article.issues.map((issue) => issue.type)))).slice(0, MAX_STORE_QUALITY_ISSUES),
    improvementSuggestions: Array.from(new Set(articles.flatMap((article) => article.improvementSuggestions))).slice(0, MAX_STORE_QUALITY_SUGGESTIONS),
    articles,
  };
}

function buildStoreQualityPrompt(data: KBQualityStoreInput): string {
  const articleBlocks = data.articles.map((article) => `
Article ${article.articleRef}
- Title: ${truncatePromptValue(article.title, 160)}
- Category: ${truncatePromptValue(article.category || 'Uncategorized', 80)}
- Section: ${truncatePromptValue(article.section || 'General', 80)}
- Content length: ${article.contentLength} characters
- Last updated: ${truncatePromptValue(article.lastUpdated || 'Unknown', 80)}
- Low confidence queries: ${formatPromptList(article.lowConfidenceQueries)}
- Negative feedback: ${formatFeedbackList(article.negativeFeedback)}
- No-answer queries: ${formatPromptList(article.noAnswerQueries)}
`).join('\n');

  return `Analyze knowledge base quality for this store for ${data.dataRange.start} through ${data.dataRange.end}.

Review these signal-bearing articles. Return one JSON object for the store and article-level summaries keyed by articleRef.

${articleBlocks}

Return ONLY valid JSON with exactly this structure:
{
  "qualityScore": number,
  "priority": "low" | "medium" | "high",
  "summary": "short store-level summary",
  "topIssues": ["short issue labels"],
  "improvementSuggestions": ["store-level prioritized suggestions"],
  "articles": [
    {
      "articleRef": "A1",
      "qualityScore": number,
      "priority": "low" | "medium" | "high",
      "issues": [
        {
          "type": "low_confidence" | "negative_feedback" | "no_answer",
          "queries": ["representative queries"],
          "suggestions": ["specific improvements"]
        }
      ],
      "improvementSuggestions": ["article-level suggestions"]
    }
  ]
}

Use only the provided articleRef values. Do not invent article identifiers.`;
}

function truncatePromptValue(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function formatPromptList(values: string[]): string {
  if (values.length === 0) return 'None';
  return values.map((value, index) => `${index + 1}. "${truncatePromptValue(value, 180)}"`).join('; ');
}

function formatFeedbackList(values: Array<{ query: string; comment: string }>): string {
  if (values.length === 0) return 'None';
  return values
    .map((value, index) => `${index + 1}. Query "${truncatePromptValue(value.query, 140)}"; feedback "${truncatePromptValue(value.comment, 140)}"`)
    .join('; ');
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizePriority(priority: unknown): 'low' | 'medium' | 'high' {
  if (priority === 'high' || priority === 'medium' || priority === 'low') return priority;
  return 'medium';
}

function normalizeStringArray(values: unknown, maxItems: number): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.slice(0, 240))
    .slice(0, maxItems);
}

function normalizeIssues(values: unknown): KBArticleIssue[] {
  if (!Array.isArray(values)) return [];
  return values.slice(0, MAX_STORE_QUALITY_ISSUES).map((issue: any) => ({
    type: issue?.type === 'negative_feedback' || issue?.type === 'no_answer'
      ? issue.type
      : 'low_confidence',
    queries: normalizeStringArray(issue?.queries, 5),
    suggestions: normalizeStringArray(issue?.suggestions, 5),
  }));
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

  geminiLogger.info('[KB Quality] Starting article quality batch', {
    articleCount: inputs.length,
  });

  // Process articles sequentially to avoid rate limits
  for (const input of inputs) {
    try {
      const analysis = await analyzeKBArticleQuality(input);
      results.set(input.article.title, analysis);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      geminiLogger.error('[KB Quality] Article quality batch item failed', {
        failureCode: GEMINI_KB_QUALITY_BATCH_ARTICLE_FAILED,
        titleLength: input.article.title.length,
        error: getGeminiErrorContext(error),
      });
      // Continue with other articles
    }
  }

  geminiLogger.info('[KB Quality] Article quality batch complete', {
    successCount: results.size,
    articleCount: inputs.length,
  });

  return results;
}

// ================================================================
// EXPORTS
// ================================================================

export default {
  analyzeKBArticleQuality,
  analyzeKBArticlesBatch,
  analyzeKBStoreQuality,
};
