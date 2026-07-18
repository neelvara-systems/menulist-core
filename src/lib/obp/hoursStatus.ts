import { getStoreStatus } from '@lib/hours/hoursEngine';

/**
 * OBP adapter for the canonical weekly-hours engine.
 *
 * Keeping this small prevents public-menu and Official Business Page status
 * calculations from drifting at overnight and exact closing boundaries.
 */
export interface StoreOpenStatus {
    isOpen: boolean;
    statusText: string;
    nextChange?: string;
}

export function getStoreOpenStatus(
    workingHours?: Record<string, string>,
    timeZone?: string,
    now = new Date(),
): StoreOpenStatus {
    const status = getStoreStatus(workingHours, timeZone || 'Asia/Kolkata', undefined, now);
    return {
        isOpen: status.isOpen,
        nextChange: status.nextChange?.replace(' at ', ' '),
        statusText: status.statusText === 'Open' ? 'Open now' : status.statusText,
    };
}
