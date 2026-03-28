/**
 * Weekly Narrative Prompt v1
 * Generates executive summary of weekly help center performance
 */

import { GeminiPrompt, WeeklyMetrics } from '../types';

export const WEEKLY_NARRATIVE_PROMPT_V1: GeminiPrompt = {
  version: {
    version: 'v1',
    createdAt: '2025-10-28',
    description: 'Initial weekly narrative generation for executive summaries',
  },

  system: `You are an AI analytics assistant creating executive summaries for help center performance.

Your task is to generate a concise, data-driven weekly summary that highlights:
1. Key performance trends (volume, satisfaction, response quality)
2. Notable improvements or concerns
3. Actionable recommendations for the coming week

Guidelines:
- Write in professional but accessible language
- Focus on insights, not just numbers
- Compare to previous week when showing trends
- Highlight both successes and areas for improvement
- Keep recommendations specific and prioritized
- Use percentages for changes, absolute numbers for volumes`,

  user: (data: { metrics: WeeklyMetrics }) => {
    const { metrics } = data;
    
    return `Generate a weekly performance summary based on the following data:

Week: ${metrics.weekStart} to ${metrics.weekEnd}

Metrics:
- Total chats: ${metrics.totalChats} (${metrics.volumeChange > 0 ? '+' : ''}${metrics.volumeChange}% vs last week)
- Satisfaction rate: ${metrics.satisfactionRate}% (${metrics.satisfactionChange > 0 ? '+' : ''}${metrics.satisfactionChange}% vs last week)

Top questions (by frequency):
${metrics.topQuestions.map((q, i) => `${i + 1}. "${q.question}" (${q.count} times)`).join('\n')}

Knowledge gaps (negative feedback):
${metrics.knowledgeGaps.map((g, i) => `${i + 1}. "${g.question}" (${g.count} complaints)`).join('\n')}

Please generate a JSON response with exactly this structure:
{
  "narrative": "string (2-3 paragraph executive summary, ~150-200 words)",
  "highlights": ["string" (3-5 key highlights, each 1 sentence)],
  "recommendations": ["string" (3-5 prioritized recommendations, each 1-2 sentences)],
  "keyMetrics": {
    "volumeChange": number (percentage change),
    "satisfactionChange": number (percentage change),
    "topCategory": "string (most frequently asked topic)"
  }
}

Narrative should include:
- Opening sentence summarizing overall performance
- Analysis of volume and satisfaction trends
- Notable patterns in user questions
- Context about knowledge gaps
- Forward-looking conclusion

Highlights should be:
- Concise (10-15 words each)
- Data-specific when possible
- Mix of positive and constructive

Recommendations should:
- Be prioritized by impact
- Include specific actions
- Reference the data (e.g., "Address gap in X topic")

Return ONLY valid JSON, no additional text or markdown.`;
  },

  config: {
    temperature: 0.4,
    maxTokens: 1500,
    topP: 0.9,
    topK: 40,
  },
};
