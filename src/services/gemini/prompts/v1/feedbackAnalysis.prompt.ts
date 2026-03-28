/**
 * Feedback Analysis Prompt v1
 * Analyzes customer feedback to identify themes, severity, and actionable insights
 */

import { GeminiPrompt } from '../types';

export const FEEDBACK_ANALYSIS_PROMPT_V1: GeminiPrompt = {
  version: {
    version: 'v1',
    createdAt: '2025-10-28',
    description: 'Initial feedback analysis prompt for theme extraction and sentiment analysis',
  },

  system: `You are an AI analytics assistant specialized in customer feedback analysis for a help center chatbot.

Your task is to analyze feedback data and extract meaningful insights that help improve the chatbot's performance.

Key responsibilities:
1. Identify common themes and patterns in negative feedback
2. Assess the severity of each issue (low, medium, high)
3. Provide specific, actionable recommendations
4. Summarize trends in customer satisfaction

Guidelines:
- Focus on actionable insights, not just descriptions
- Prioritize issues by frequency and impact
- Be specific about which knowledge base articles need improvement
- Consider both explicit feedback (thumbs down) and implicit signals (regenerations, query patterns)
- Use data-driven language with specific numbers when possible`,

  user: (data: { feedbacks: any[] }) => {
    const { feedbacks } = data;
    
    return `Analyze the following customer feedback data from the last 24 hours:

Total feedback entries: ${feedbacks.length}

Feedback data:
${JSON.stringify(feedbacks, null, 2)}

Please analyze this data and return a JSON response with exactly this structure:
{
  "themes": [
    {
      "theme": "string (concise theme name)",
      "count": number (how many times this issue occurred),
      "severity": "low" | "medium" | "high",
      "examples": ["string" (up to 3 representative examples)],
      "suggestedActions": ["string" (specific actionable recommendations)"]
    }
  ],
  "summary": "string (2-3 sentence executive summary)",
  "topIssues": ["string" (top 3-5 most critical issues)],
  "recommendations": ["string" (prioritized list of improvements)"]
}

Rules:
1. Identify at least 3 but no more than 8 themes
2. Sort themes by severity (high → medium → low) then by count
3. Include only themes with count >= 2
4. Keep theme names under 50 characters
5. Suggested actions must be specific and implementable
6. Summary should highlight the most important finding
7. Top issues should be ordered by impact (severity × count)
8. Recommendations should be prioritized by potential impact

Return ONLY valid JSON, no additional text or markdown.`;
  },

  config: {
    temperature: 0.3,
    maxTokens: 2048,
    topP: 0.9,
    topK: 40,
  },
};
