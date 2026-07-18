/**
 * Shared types for mobile components.
 * Single source of truth — no duplicating types across screens/sheets.
 */

import type { ExtractedDataItem } from '../templates/main-app/projects/types';

export type MobileMenuItemType = {
    id: string;
    name: string;
    price: string | number;
    attributes?: {
        id: string;
        name: string;
        price: string | number;
        active?: boolean;
    }[];
    available: boolean;
    active: boolean;
    duration?: number;
    ownerBoost?: number;
    categoryId?: string;
    categoryName?: string;
    hiddenByCategory?: boolean;
    isBestSeller?: boolean;
    description?: string;
    descriptionMissing?: boolean;
    fileId?: string;
    image?: string;
    rawItem?: ExtractedDataItem;
    translationMissing?: boolean;
};

export type MobileFeedbackItemType = {
    id: string;
    customerName: string;
    rating: number;
    message: string;
    status: 'new' | 'resolved';
    createdAt: string;
    needsAttention?: boolean;
    email?: string;
    phone?: string;
};
