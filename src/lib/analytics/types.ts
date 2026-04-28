/**
 * Types for the Firebase Analytics system
 */

export type AnalyticsEventType = 'menuView' | 'itemClick';

export interface DeviceInfo {
  type: any;
  browser?: string;
  os?: string;
}

export interface EventData {
  tenantId: string;
  storeId: string;
  sessionId: string;
  menuItemId?: string;
  menuItemName?: string;
  deviceInfo?: DeviceInfo;
}

export interface DailyAnalytics {
  // Core metrics
  date: string; // YYYY-MM-DD
  totalViews: number;
  totalClicks: number;

  // Device breakdowns
  viewsByDevice: {
    [deviceType: string]: number; // e.g., "mobile": 5
  };
  clicksByDevice: {
    [deviceType: string]: number;
  };

  // Location breakdowns
  viewsByLocation: {
    [locationKey: string]: number; // e.g., "US_NewYork": 5
  };
  clicksByLocation: {
    [locationKey: string]: number;
  };

  // Item breakdowns
  clicksByItem: {
    [menuItemId: string]: number; // e.g., "item_123": 10
  };
  viewsByItem: {
    [menuItemId: string]: number; // e.g., "item_123": 25 (item modal opened)
  };
  itemNames: {
    [menuItemId: string]: string; // e.g., "item_123": "Margherita Pizza"
  };
  // Time-of-day per-item clicks (for CMI time eligibility)
  hourlyClicksByItem: {
    [menuItemId: string]: {
      [hour: string]: number; // e.g., "item_123": { "12": 5, "13": 8 }
    };
  };

  // Hourly breakdowns
  hourlyViews: {
    [hour: string]: number; // e.g., "00": 5, "01": 10
  };
  hourlyClicks: {
    [hour: string]: number;
  };
  hourlyItemViews: {
    [hour: string]: number; // Aggregate item views by hour
  };
  hourlySearches?: {
    [hour: string]: number;
  };
  totalSearches?: number;
  searchTerms?: {
    [term: string]: number;
  };
  zeroResultSearches?: number;
  zeroResultSearchTerms?: {
    [term: string]: number;
  };
  totalUnavailableItemTaps?: number;
  unavailableItemTapsByItem?: {
    [menuItemId: string]: number;
  };
  hourlyUnavailableItemTaps?: {
    [hour: string]: number;
  };
  totalMenuActionClicks?: number;
  menuActionClicks?: {
    [action: string]: number;
  };
  hourlyMenuActionClicks?: {
    [hour: string]: number;
  };

  // Metadata
  lastUpdated: Date;
}

export interface AnalyticsSummary {
  // Lifetime totals
  lifetimeTotalViews: number;
  lifetimeTotalClicks: number;
  lifetimeTotalSearches?: number;
  lifetimeZeroResultSearches?: number;
  lifetimeTotalUnavailableItemTaps?: number;
  lifetimeTotalMenuActionClicks?: number;
  menuActionClicks?: {
    [action: string]: number;
  };
  searchTerms?: {
    [term: string]: number;
  };
  unavailableItemTapsByItem?: {
    [menuItemId: string]: number;
  };

  // Top items (limited to prevent document size issues)
  topItems: Array<{
    menuItemId: string;
    name: string;
    totalClicks: number;
    lastClicked: string; // ISO date string
  }>;

  // UTM Breakdowns
  viewsBySource?: {
    [source: string]: number;
  };
  viewsByMedium?: {
    [medium: string]: number;
  };
  viewsByCampaign?: {
    [campaign: string]: number;
  };

  // Rolling periods
  last7Days: {
    totalViews: number;
    totalClicks: number;
    startDate: string;
    endDate: string;
  };
  last30Days: {
    totalViews: number;
    totalClicks: number;
    startDate: string;
    endDate: string;
  };

  // Metadata
  lastUpdated: Date;
  lastAggregatedDate: string; // YYYY-MM-DD
}

export interface AnalyticsDateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface AnalyticsData {
  summary: AnalyticsSummary | null;
  daily: DailyAnalytics[];
}
