/**
 * Business-Specific Labels Configuration
 * 
 * Different business types need different terminology:
 * - Restaurant: "Sold out" (food ran out)
 * - Salon/Spa: "Unavailable" (service not available)
 * - Retail: "Out of stock" (product not available)
 * - Gym/Fitness: "Fully booked" (class/slot not available)
 * 
 * This config maps business categories to appropriate labels.
 */

import { resolveBusinessCategory } from '@data/shared/businessTypes';

// Labels for availability status by business category
export interface AvailabilityLabels {
    customerUnavailable: string;  // What customer sees when item is unavailable
    ownerUnavailable: string;     // What owner sees in editor toggle
    ownerAvailable: string;       // What owner sees when available
}

// Category-based label mappings
const CATEGORY_LABELS: Record<string, AvailabilityLabels> = {
    food: {
        customerUnavailable: 'Sold out',
        ownerUnavailable: 'Unavailable',
        ownerAvailable: 'Available',
    },
    service: {
        customerUnavailable: 'Unavailable',
        ownerUnavailable: 'Unavailable',
        ownerAvailable: 'Available',
    },
    retail: {
        customerUnavailable: 'Out of stock',
        ownerUnavailable: 'Out of stock',
        ownerAvailable: 'In stock',
    },
    health: {
        customerUnavailable: 'Unavailable',
        ownerUnavailable: 'Unavailable',
        ownerAvailable: 'Available',
    },
    professional: {
        customerUnavailable: 'Unavailable',
        ownerUnavailable: 'Unavailable',
        ownerAvailable: 'Available',
    },
    creative: {
        customerUnavailable: 'Unavailable',
        ownerUnavailable: 'Unavailable',
        ownerAvailable: 'Available',
    },
    specialty: {
        customerUnavailable: 'Unavailable',
        ownerUnavailable: 'Unavailable',
        ownerAvailable: 'Available',
    },
};

// Default labels (fallback)
const DEFAULT_LABELS: AvailabilityLabels = {
    customerUnavailable: 'Unavailable',
    ownerUnavailable: 'Unavailable',
    ownerAvailable: 'Available',
};

/**
 * Get availability labels for a business type
 * 
 * @param businessType - The store's business type (e.g., "Restaurant", "Salon")
 * @param businessCategory - Optional broad category when exact type is generic
 * @returns Labels appropriate for that business type
 */
export function getAvailabilityLabels(businessType?: string, businessCategory?: string): AvailabilityLabels {
    const category = resolveBusinessCategory(businessType, businessCategory);
    if (category && CATEGORY_LABELS[category]) {
        return CATEGORY_LABELS[category];
    }
    return DEFAULT_LABELS;
}

/**
 * Get the customer-facing unavailable label
 * Convenience function for use in customer-facing components
 */
export function getUnavailableLabel(businessType?: string, businessCategory?: string): string {
    return getAvailabilityLabels(businessType, businessCategory).customerUnavailable;
}

/**
 * Get owner-facing labels for the availability toggle
 * Convenience function for use in editor components
 */
export function getOwnerLabels(businessType?: string, businessCategory?: string): { available: string; unavailable: string } {
    const labels = getAvailabilityLabels(businessType, businessCategory);
    return {
        available: labels.ownerAvailable,
        unavailable: labels.ownerUnavailable,
    };
}
