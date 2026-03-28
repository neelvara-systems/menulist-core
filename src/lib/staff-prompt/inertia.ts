import { STAFF_PROMPT_INERTIA, StaffPrompt } from "@type/campaigns";

interface InertiaInput {
    currentPrompt: StaffPrompt | undefined;
    newItemId: string;
    today: string; // "YYYY-MM-DD"
}

interface InertiaResult {
    shouldShow: boolean;
    updatedInertia: StaffPrompt["inertia"];
}

/**
 * Get Monday of the week for a given date
 */
function getWeekMonday(dateStr: string): string {
    const date = new Date(dateStr);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return date.toISOString().slice(0, 10);
}

/**
 * Calculate if prompt should show based on inertia rules
 * Per spec: 3 days min, max 2 days/week
 */
export function calculateInertia(input: InertiaInput): InertiaResult {
    const { currentPrompt, newItemId, today } = input;
    const weekMonday = getWeekMonday(today);

    // No existing prompt - start fresh
    if (!currentPrompt || !currentPrompt.inertia) {
        return {
            shouldShow: true,
            updatedInertia: {
                startDate: today,
                consecutiveDays: 1,
                weekAppearances: 1,
                weekStartDate: weekMonday,
            },
        };
    }

    const inertia = currentPrompt.inertia;

    // Different item - check if we can switch
    if (currentPrompt.itemId !== newItemId) {
        // Can only switch if current item has shown for MIN_CONSECUTIVE_DAYS
        if (inertia.consecutiveDays < STAFF_PROMPT_INERTIA.MIN_CONSECUTIVE_DAYS) {
            // Continue with current item, don't switch
            return {
                shouldShow: true,
                updatedInertia: {
                    ...inertia,
                    consecutiveDays: inertia.consecutiveDays + 1,
                    weekAppearances:
                        inertia.weekStartDate === weekMonday
                            ? inertia.weekAppearances + 1
                            : 1,
                    weekStartDate: weekMonday,
                },
            };
        }
        // Can switch - start fresh with new item
        return {
            shouldShow: true,
            updatedInertia: {
                startDate: today,
                consecutiveDays: 1,
                weekAppearances:
                    inertia.weekStartDate === weekMonday
                        ? inertia.weekAppearances + 1
                        : 1,
                weekStartDate: weekMonday,
            },
        };
    }

    // Same item - check weekly limit
    const weekAppearances =
        inertia.weekStartDate === weekMonday ? inertia.weekAppearances : 0;

    if (weekAppearances >= STAFF_PROMPT_INERTIA.MAX_DAYS_PER_WEEK) {
        // Already shown max times this week
        return {
            shouldShow: false,
            updatedInertia: inertia, // Keep as-is
        };
    }

    // Can show
    return {
        shouldShow: true,
        updatedInertia: {
            ...inertia,
            consecutiveDays: inertia.consecutiveDays + 1,
            weekAppearances: weekAppearances + 1,
            weekStartDate: weekMonday,
        },
    };
}
