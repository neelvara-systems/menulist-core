/**
 * Campaign Utilities — Shared between desktop + mobile
 *
 * Used by:
 * - Desktop: PrimaryCard, OperationalSection (src/components/templates/main-app/today/)
 * - Mobile: MobileHoursScreen (src/components/mobile/screens/MobileHoursScreen.tsx)
 *
 * Pure functions — no UI framework dependencies.
 */

import { ExecutionSurface, ExportMethod } from '@type/campaigns';

/**
 * Derive meal name from current time of day.
 * Used by campaign cards to contextualize campaign copy.
 */
export const getMealName = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'Breakfast';
    if (hour >= 11 && hour < 15) return 'Lunch';
    if (hour >= 15 && hour < 18) return 'Snack';
    return 'Dinner';
};

/**
 * Determine export method based on execution surface.
 * Maps campaign surface to the correct export action.
 */
export const getExportMethod = (surface: ExecutionSurface): ExportMethod => {
    switch (surface) {
        case 'whatsapp_status':
        case 'whatsapp_message':
            return 'whatsapp_share';
        case 'print_poster':
        case 'qr_tent':
        case 'digital_screen':
            return 'download';
        default:
            return 'copy_text';
    }
};

/**
 * Get short button text for operational campaign cards.
 */
export const getShortButtonText = (surface: string): string => {
    switch (surface) {
        case 'whatsapp_status':
        case 'whatsapp_message':
            return 'Mark as shared';
        case 'print_poster':
        case 'qr_tent':
        case 'digital_screen':
            return 'Mark as done';
        default:
            return 'Mark as done';
    }
};
