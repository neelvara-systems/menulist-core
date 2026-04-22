export interface FeatureGuideSection {
    title: string;
    description: string;
}

export const TODAY_FEATURE_GUIDE_TITLE = 'How Today Actions Work';
export const PAST_ACTIVITY_GUIDE_TITLE = 'How Past Activity Works';

export const TODAY_FEATURE_GUIDE_SECTIONS: FeatureGuideSection[] = [
    {
        title: 'What this is',
        description:
            'Today gives you one clear action for today, based on your current menu and availability. You do not need to plan campaigns.'
    },
    {
        title: 'What to do',
        description:
            'Tap the main action button when it looks right for your business today. It is designed to be completed quickly from phone or desktop.'
    },
    {
        title: 'If you skip',
        description:
            'Skipping is okay. The system learns from this and reduces repeated suggestions that are not useful for you.'
    },
    {
        title: 'What this achieves',
        description:
            'It helps you stay visible daily with minimal effort. Goal is consistency, not extra work or complicated marketing steps.'
    },
    {
        title: 'What this is not',
        description:
            'This is not an analytics dashboard. You will not see complex reports, comparisons, or settings to manage every detail.'
    },
];

export const PAST_ACTIVITY_GUIDE_SECTIONS: FeatureGuideSection[] = [
    {
        title: 'What you see here',
        description:
            'Past Activity shows simple memory from the last 7 days: what was generated, completed, or skipped.'
    },
    {
        title: 'Why it exists',
        description:
            'It helps you remember what was already prepared and what was already handled, so you can move forward without confusion.'
    },
    {
        title: 'How to use it',
        description:
            'Use this as a quick history check. If you already acted, no action is needed.'
    },
    {
        title: 'What it does not show',
        description:
            'It does not show heavy reporting, scorecards, or performance analytics. It is intentionally simple.'
    },
];
