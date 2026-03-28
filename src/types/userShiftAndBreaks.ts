export interface Break {
    breakType: string;
    startTime: string;
    endTime: string;
}

export interface RegularBreak {
    startDate: string;
    endDate?: string;
    // For simple pattern
    startTime?: string;
    endTime?: string;
    breakType?: string;
    // For week-based pattern
    weekPattern?: BreakWeekPattern;
}

export interface Shift {
    startTime: string;
    endTime: string;
    shiftType: string;
    isRegular?: boolean;
    startDate?: string;
    endDate?: string;
    weekNumber?: number;
    dayOfWeek?: string;
}

export interface WeekDayShift {
    breakType?: string;
    startTime: string;
    endTime: string;
    shiftType: string;
}

export interface WeekDayBreak {
    startTime: string;
    endTime: string;
    breakType: string;
}

export interface ShiftWeekPattern {
    [key: number]: {  // 1-4 for weeks
        [key: string]: WeekDayShift[];  // Sunday-Saturday
    };
}
export interface BreakWeekPattern {
    [key: number]: {  // 1-4 for weeks
        [key: string]: WeekDayBreak[];  // Sunday-Saturday
    };
}

export interface RegularShift {
    startDate: string;
    endDate?: string;
    // For simple pattern
    startTime?: string;
    endTime?: string;
    shiftType?: string;
    // For week-based pattern
    weekPattern?: ShiftWeekPattern;
}

export interface StaffShift {
    staffId: string;
    shifts: Shift[];
    breaks: Break[];
    regularShifts?: RegularShift[];
    regularBreaks?: RegularBreak[];
}
