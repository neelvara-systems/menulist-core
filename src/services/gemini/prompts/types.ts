/**
 * Gemini Prompt Types
 * Defines structure for all AI prompts
 */

export interface PromptVersion {
  version: string;
  createdAt: string;
  description?: string;
}

export interface PromptConfig {
  temperature: number;
  maxTokens: number;
  topP?: number;
  topK?: number;
}

export interface GeminiPrompt {
  version: PromptVersion;
  system: string;
  user: (data: any) => string;
  config: PromptConfig;
}

export interface FeedbackTheme {
  theme: string;
  count: number;
  severity: 'low' | 'medium' | 'high';
  examples: string[];
  suggestedActions: string[];
}

export interface FeedbackAnalysisResult {
  themes: FeedbackTheme[];
  summary: string;
  topIssues: string[];
  recommendations: string[];
}

export interface WeeklyMetrics {
  weekStart: string;
  weekEnd: string;
  totalChats: number;
  satisfactionRate: number;
  topQuestions: Array<{ question: string; count: number }>;
  knowledgeGaps: Array<{ question: string; count: number }>;
  volumeChange: number;
  satisfactionChange: number;
}

export interface WeeklySummaryResult {
  narrative: string;
  highlights: string[];
  recommendations: string[];
  keyMetrics: {
    volumeChange: number;
    satisfactionChange: number;
    topCategory: string;
  };
}

export interface KBArticleIssue {
  type: 'low_confidence' | 'negative_feedback' | 'no_answer';
  queries: string[];
  suggestions: string[];
}

export interface KBQualityResult {
  qualityScore: number;
  issues: KBArticleIssue[];
  improvementSuggestions: string[];
  priority: 'low' | 'medium' | 'high';
}
