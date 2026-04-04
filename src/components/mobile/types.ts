/**
 * Shared types for mobile components.
 * Single source of truth — no duplicating types across screens/sheets.
 */

export type MobileMenuItemType = {
    id: string;
    name: string;
    price: number;
    available: boolean;
    active: boolean;
    categoryId?: string;
    categoryName?: string;
    description?: string;
    image?: string;
};

export type MobileFeedbackItemType = {
    id: string;
    customerName: string;
    rating: number;
    message: string;
    status: 'new' | 'read' | 'resolved';
    createdAt: string;
    needsAttention?: boolean;
    email?: string;
    phone?: string;
};
