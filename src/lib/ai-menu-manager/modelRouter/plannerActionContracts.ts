import { Type, type Schema } from '@google/genai';
import type { AiMenuManagerActionType } from '@type/aiMenuManager';

export interface AiMenuManagerPlannerActionContract {
    actionType: AiMenuManagerActionType;
    target: 'one_item' | 'one_category' | 'one_or_more_items' | 'menu' | 'menu_or_one_item';
    values: string[];
}

const ACTION_CONTRACT_BY_TYPE: Partial<Record<AiMenuManagerActionType, Omit<AiMenuManagerPlannerActionContract, 'actionType'>>> = {
    item_price_update: { target: 'one_item', values: ['newPrice:number'] },
    item_name_update: { target: 'one_item', values: ['newName:string'] },
    item_description_update: { target: 'one_item', values: ['description:string'] },
    item_category_update: { target: 'one_item', values: ['categoryId:category_id_from_context'] },
    item_availability_update: { target: 'one_item', values: ['available:boolean'] },
    item_visibility_update: { target: 'one_item', values: ['visible:boolean'] },
    item_bestseller_update: { target: 'one_item', values: ['enabled:boolean'] },
    item_prep_time_update: { target: 'one_item', values: ['minutes:number'] },
    category_name_update: { target: 'one_category', values: ['newName:string'] },
    category_visibility_update: { target: 'one_category', values: ['visible:boolean'] },
    decision_blocks_update: { target: 'menu_or_one_item', values: ['enabled:true'] },
    menu_special_note_update: { target: 'menu', values: ['note:string'] },
    menu_design_mood_update: { target: 'menu', values: ['mood:clean|warm|premium|bold|fast'] },
    menu_design_layout_update: { target: 'menu', values: ['layout:list|grid|card'] },
    menu_design_preset_apply: {
        target: 'menu',
        values: ['preset:premium minimal|fast ordering|warm dining|bold social|clean service'],
    },
    menu_design_visibility_update: {
        target: 'menu',
        values: ['setting:prices|images|category_icons|category_tabs', 'visible:boolean'],
    },
    menu_design_color_update: { target: 'menu', values: ['color:string'] },
    bulk_price_update: {
        target: 'one_or_more_items',
        values: ['newPrice:number OR direction:increase|decrease + amount:number + isPercent:boolean'],
    },
    bulk_availability_update: { target: 'one_or_more_items', values: ['available:boolean'] },
};

export function buildAiMenuManagerPlannerActionContracts(
    allowedActions: AiMenuManagerActionType[],
): AiMenuManagerPlannerActionContract[] {
    return allowedActions.map((actionType) => {
        const contract = ACTION_CONTRACT_BY_TYPE[actionType];
        if (!contract) {
            throw new Error(`Missing planner contract for ${actionType}`);
        }
        return { actionType, ...contract };
    });
}

export function listAiMenuManagerPlannerContractActionTypes(): AiMenuManagerActionType[] {
    return Object.keys(ACTION_CONTRACT_BY_TYPE) as AiMenuManagerActionType[];
}

export function buildAiMenuManagerPlannerResponseSchema(
    allowedActions: AiMenuManagerActionType[],
): Schema {
    return {
        type: Type.OBJECT,
        required: ['outcome', 'ownerReply'],
        propertyOrdering: [
            'outcome',
            'ownerReply',
            'actionType',
            'targets',
            'values',
            'clarification',
            'suggestedReplies',
        ],
        properties: {
            outcome: {
                type: Type.STRING,
                enum: [
                    'answer',
                    'diagnostic',
                    'recommendation',
                    'clarification',
                    'prepare_action',
                    'unsupported',
                ],
            },
            ownerReply: {
                type: Type.STRING,
                description: 'A calm owner-facing reply of no more than four short lines.',
            },
            actionType: {
                type: Type.STRING,
                enum: allowedActions,
                description: 'Required only for prepare_action.',
            },
            targets: {
                type: Type.ARRAY,
                maxItems: '50',
                items: {
                    type: Type.OBJECT,
                    required: ['entityType'],
                    properties: {
                        entityType: {
                            type: Type.STRING,
                            enum: ['item', 'category', 'project', 'design', 'store', 'surface'],
                        },
                        entityId: {
                            type: Type.STRING,
                            description: 'Use an ID from selectedMenuContext only.',
                        },
                        displayName: { type: Type.STRING },
                    },
                },
            },
            values: {
                type: Type.OBJECT,
                description: 'Use exactly the value keys declared by the selected action contract.',
                properties: {
                    newPrice: { type: Type.NUMBER },
                    newName: { type: Type.STRING },
                    description: { type: Type.STRING },
                    categoryId: { type: Type.STRING },
                    available: { type: Type.BOOLEAN },
                    visible: { type: Type.BOOLEAN },
                    enabled: { type: Type.BOOLEAN },
                    minutes: { type: Type.NUMBER },
                    note: { type: Type.STRING },
                    mood: { type: Type.STRING, enum: ['clean', 'warm', 'premium', 'bold', 'fast'] },
                    layout: { type: Type.STRING, enum: ['list', 'grid', 'card'] },
                    preset: { type: Type.STRING },
                    setting: {
                        type: Type.STRING,
                        enum: ['prices', 'images', 'category_icons', 'category_tabs'],
                    },
                    color: { type: Type.STRING },
                    amount: { type: Type.NUMBER },
                    direction: { type: Type.STRING, enum: ['increase', 'decrease'] },
                    isPercent: { type: Type.BOOLEAN },
                },
            },
            clarification: {
                type: Type.OBJECT,
                required: ['question', 'options'],
                properties: {
                    question: { type: Type.STRING },
                    options: {
                        type: Type.ARRAY,
                        minItems: '1',
                        maxItems: '5',
                        items: {
                            type: Type.OBJECT,
                            required: ['label'],
                            properties: {
                                label: { type: Type.STRING },
                                entityId: { type: Type.STRING },
                                prompt: { type: Type.STRING },
                            },
                        },
                    },
                },
            },
            suggestedReplies: {
                type: Type.ARRAY,
                maxItems: '4',
                items: {
                    type: Type.OBJECT,
                    required: ['label', 'prompt'],
                    properties: {
                        label: { type: Type.STRING },
                        prompt: { type: Type.STRING },
                        helper: { type: Type.STRING },
                    },
                },
            },
        },
    };
}
