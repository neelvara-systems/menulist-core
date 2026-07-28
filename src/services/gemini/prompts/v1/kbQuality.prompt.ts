/**
 * KB Quality Analysis Prompt v1
 * Analyzes knowledge base article effectiveness and suggests improvements
 */

import { GeminiPrompt } from '../types';

interface KBQualityPromptArticle {
  category?: string;
  content?: string;
  lastUpdated?: string;
  section?: string;
  title?: string;
}

interface KBQualityPromptInput {
  article: KBQualityPromptArticle;
  lowConfidenceQueries: string[];
  negativeFeedback: Array<{ query: string; comment: string }>;
  noAnswerQueries: string[];
}

export const KB_QUALITY_PROMPT_V1: GeminiPrompt<KBQualityPromptInput> = {
  version: {
    version: 'v1',
    createdAt: '2025-10-28',
    description: 'Initial KB article quality analysis for continuous improvement',
  },

  system: `You are an AI content quality analyst for knowledge base articles.

Your task is to analyze the effectiveness of KB articles based on:
1. User feedback (positive/negative)
2. Answer confidence scores
3. Frequency of "no answer" responses
4. User query patterns

Guidelines:
- Be specific about what needs improvement
- Consider both content quality and structure
- Identify missing information or unclear explanations
- Suggest concrete improvements
- Score quality objectively based on data`,

  user: (data) => {
    const { article, lowConfidenceQueries, negativeFeedback, noAnswerQueries } = data;
    
    return `Analyze the quality and effectiveness of this knowledge base article:

Article Details:
- Title: ${article.title}
- Category: ${article.category}
- Section: ${article.section}
- Content length: ${article.content?.length || 0} characters
- Last updated: ${article.lastUpdated || 'Unknown'}

Performance Data:

Low Confidence Queries (AI was uncertain):
${lowConfidenceQueries.length > 0 
  ? lowConfidenceQueries.map((q, i) => `${i + 1}. "${q}"`).join('\n')
  : 'None'}

Negative Feedback:
${negativeFeedback.length > 0
  ? negativeFeedback.map((f, i) => `${i + 1}. Query: "${f.query}"\n   Feedback: "${f.comment}"`).join('\n\n')
  : 'None'}

No Answer Queries (AI couldn't answer):
${noAnswerQueries.length > 0
  ? noAnswerQueries.map((q, i) => `${i + 1}. "${q}"`).join('\n')
  : 'None'}

Please analyze and return a JSON response with exactly this structure:
{
  "qualityScore": number (0-100, where 100 is perfect),
  "issues": [
    {
      "type": "low_confidence" | "negative_feedback" | "no_answer",
      "queries": ["string" (representative queries)],
      "suggestions": ["string" (specific improvements needed)]
    }
  ],
  "improvementSuggestions": ["string" (prioritized list, most important first)],
  "priority": "low" | "medium" | "high"
}

Scoring criteria:
- 90-100: Excellent (< 5% negative feedback, high confidence)
- 70-89: Good (< 15% negative feedback, mostly high confidence)
- 50-69: Needs improvement (15-30% negative feedback)
- 0-49: Poor (> 30% negative feedback, frequent low confidence)

Priority criteria:
- High: Many complaints OR frequently used article with issues
- Medium: Some complaints AND moderate usage
- Low: Few complaints OR rarely used

Improvement suggestions should be:
- Specific and actionable
- Prioritized by impact
- Include what content to add/modify/clarify
- Reference the actual queries users asked

Return ONLY valid JSON, no additional text or markdown.`;
  },

  config: {
    temperature: 0.3,
    maxTokens: 2048,
    topP: 0.9,
    topK: 40,
  },
};
