export type SharedDecisionBlockType = 'popular' | 'quickPick' | 'bestValue';

export interface SharedDecisionBlockDurationConfig {
    default: number;
    quickThreshold: number;
    unit: string;
    label: string;
}

export const DECISION_BLOCK_DURATION_CONFIGS: Record<string, SharedDecisionBlockDurationConfig> = {
    food: {
        default: 15,
        quickThreshold: 10,
        unit: 'min',
        label: 'Prep time',
    },
    service: {
        default: 30,
        quickThreshold: 20,
        unit: 'min',
        label: 'Duration',
    },
    retail: {
        default: 0,
        quickThreshold: 5,
        unit: 'min',
        label: 'Ready time',
    },
    health: {
        default: 45,
        quickThreshold: 30,
        unit: 'min',
        label: 'Session duration',
    },
    professional: {
        default: 60,
        quickThreshold: 30,
        unit: 'min',
        label: 'Duration',
    },
    creative: {
        default: 45,
        quickThreshold: 30,
        unit: 'min',
        label: 'Duration',
    },
    specialty: {
        default: 30,
        quickThreshold: 20,
        unit: 'min',
        label: 'Duration',
    },
};

export const DECISION_BLOCK_ENABLED_BLOCKS: Record<string, SharedDecisionBlockType[]> = {
    food: ['popular', 'quickPick', 'bestValue'],
    service: ['popular', 'quickPick', 'bestValue'],
    retail: ['popular', 'bestValue'],
    health: ['popular', 'bestValue'],
    professional: ['popular', 'bestValue'],
    creative: ['popular', 'bestValue'],
    specialty: ['popular', 'quickPick', 'bestValue'],
};

export const DEFAULT_DECISION_BLOCK_CATEGORY = 'food';
