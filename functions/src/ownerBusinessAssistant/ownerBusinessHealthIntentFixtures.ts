import type { OwnerBusinessHealthQuestion } from './types';

export function buildOwnerBusinessHealthQuestions(): OwnerBusinessHealthQuestion[] {
  return [
    {
      id: 'today_stats',
      label: 'How is today going?',
      question: 'How is today going?',
      intent: 'analytics_period_summary',
      domain: 'analytics',
    },
    {
      id: 'this_week_stats',
      label: 'What happened this week?',
      question: 'What happened this week?',
      intent: 'analytics_period_summary',
      domain: 'analytics',
    },
    {
      id: 'top_item',
      label: 'Which item is getting attention?',
      question: 'Which item is getting the most attention?',
      intent: 'item_attention',
      domain: 'menu',
    },
    {
      id: 'checks',
      label: 'What needs checking?',
      question: 'What should I check next?',
      intent: 'next_action',
      domain: 'business_health',
    },
  ];
}
