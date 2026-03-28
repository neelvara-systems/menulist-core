interface DateRange {
    startDate: string;
    endDate: string;
}

const getAnalyticsData = async (endpoint: string, propertyId: string, params?: Record<string, string>) => {
    if (!propertyId) {
        throw new Error('Analytics not configured');
    }

    const searchParams = new URLSearchParams({
        propertyId,
        ...params
    });

    const response = await fetch(`/api/analytics/${endpoint}?${searchParams}`);
    if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
    }

    return response.json();
};

export const fetchRealTimeStats = async (propertyId: string) => {
    return getAnalyticsData('realtime', propertyId);
};

export const fetchDateRangeStats = async (propertyId: string, dateRange: DateRange) => {
    return getAnalyticsData('reports', propertyId, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
    });
};

export const fetchMenuItemStats = async (propertyId: string, dateRange: DateRange) => {
    return getAnalyticsData('menu', propertyId, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
    });
};

export const fetchLocationStats = async (propertyId: string, dateRange: DateRange) => {
    return getAnalyticsData('locations', propertyId, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
    });
};
