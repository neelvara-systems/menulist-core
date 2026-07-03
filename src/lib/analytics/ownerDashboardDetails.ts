import type {
    AttributeFilterInterest,
    BlockPerformance,
    DailyViewData,
    LanguageUsage,
    MenuActionBreakdown,
    MonthlyViewData,
    MTDViewData,
    OpenHoursActionBreakdown,
    OverallData,
    OwnerDashboardMetrics,
    SearchTerm,
    SourceQuality,
    TopCategory,
    TopItem,
    TrafficBreakdown,
    WeeklyViewData,
    WTDViewData,
} from '@template/main-app/projects/types';

export type OwnerMenuAnalyticsDetailData =
    | DailyViewData
    | WeeklyViewData
    | MonthlyViewData
    | WTDViewData
    | MTDViewData
    | OverallData;

export interface MenuAnalyticsDetailRow {
    key: string;
    label: string;
    value: string;
    detail?: string;
}

export interface MenuAnalyticsDetailSection {
    key: string;
    title: string;
    description?: string;
    rows: MenuAnalyticsDetailRow[];
}

type DashboardTranslationValues = Record<string, string | number>;

export type OwnerDashboardTranslator = (key: string, values?: DashboardTranslationValues) => string;

const MENU_ACTION_LABEL_KEYS: Record<keyof MenuActionBreakdown, string> = {
    call: 'Call',
    whatsapp: 'WhatsApp',
    directions: 'Directions',
    reserve: 'Reserve',
    order: 'Order',
};

function dashboardLabel(
    t: OwnerDashboardTranslator | undefined,
    key: string,
    fallback: string,
    values?: DashboardTranslationValues,
): string {
    return t ? t(key, values) : fallback;
}

function formatCount(value?: number): string {
    return Math.max(0, Number(value) || 0).toLocaleString();
}

function formatRate(value?: number): string {
    return `${Math.max(0, Number(value) || 0)}%`;
}

function hasPositiveValue(values: Array<number | undefined>): boolean {
    return values.some((value) => Number(value || 0) > 0);
}

function getMetrics(data: OwnerMenuAnalyticsDetailData): OwnerDashboardMetrics {
    if ('metrics' in data) return data.metrics;

    return {
        menuVisits: data.lifetimeMetrics.totalViews || 0,
        itemClicks: data.lifetimeMetrics.totalClicks || 0,
        menuSessions: data.lifetimeMetrics.menuSessions || 0,
        engagedSessions: data.lifetimeMetrics.engagedSessions || 0,
        intentSessions: data.lifetimeMetrics.intentSessions || 0,
        actionSessions: data.lifetimeMetrics.actionSessions || 0,
        engagedSessionRate: data.lifetimeMetrics.engagedSessionRate || 0,
        intentRate: data.lifetimeMetrics.intentRate || 0,
        actionRate: data.lifetimeMetrics.actionRate || 0,
        searches: data.lifetimeMetrics.totalSearches || 0,
        unavailableItemTaps: data.lifetimeMetrics.totalUnavailableItemTaps || 0,
        menuActionClicks: data.lifetimeMetrics.totalMenuActionClicks || 0,
        zeroResultSearches: data.lifetimeMetrics.totalZeroResultSearches || 0,
        smartPicksRendered: data.lifetimeMetrics.totalSmartPicksRendered || 0,
        smartPicksClicks: data.lifetimeMetrics.totalSmartPicksClicks || 0,
    };
}

function pushSection(sections: MenuAnalyticsDetailSection[], section: MenuAnalyticsDetailSection): void {
    if (section.rows.length > 0) {
        sections.push(section);
    }
}

function buildMetricRows(metrics: OwnerDashboardMetrics, t?: OwnerDashboardTranslator): MenuAnalyticsDetailRow[] {
    const rows = [
        { key: 'menu-visits', label: dashboardLabel(t, 'details.metrics.menuViews', 'Menu views'), value: formatCount(metrics.menuVisits) },
        { key: 'item-clicks', label: dashboardLabel(t, 'details.metrics.itemTaps', 'Item taps'), value: formatCount(metrics.itemClicks) },
        { key: 'menu-sessions', label: dashboardLabel(t, 'details.metrics.menuSessions', 'Menu sessions'), value: formatCount(metrics.menuSessions) },
        {
            key: 'engaged-sessions',
            label: dashboardLabel(t, 'details.metrics.engagedSessions', 'Engaged sessions'),
            value: formatCount(metrics.engagedSessions),
            detail: dashboardLabel(t, 'details.metricDetails.ofMenuSessions', `${formatRate(metrics.engagedSessionRate)} of menu sessions`, {
                rate: formatRate(metrics.engagedSessionRate),
            }),
        },
        {
            key: 'action-sessions',
            label: dashboardLabel(t, 'details.metrics.actionSessions', 'Action sessions'),
            value: formatCount(metrics.actionSessions),
            detail: dashboardLabel(t, 'details.metricDetails.ofMenuSessions', `${formatRate(metrics.actionRate)} of menu sessions`, {
                rate: formatRate(metrics.actionRate),
            }),
        },
        { key: 'customer-actions', label: dashboardLabel(t, 'metrics.customerActions', 'Customer actions'), value: formatCount(metrics.menuActionClicks) },
        { key: 'searches', label: dashboardLabel(t, 'metrics.searches', 'Searches'), value: formatCount(metrics.searches) },
        { key: 'zero-result-searches', label: dashboardLabel(t, 'metrics.noResultSearches', 'No-result searches'), value: formatCount(metrics.zeroResultSearches) },
        { key: 'unavailable-interest', label: dashboardLabel(t, 'metrics.unavailableInterest', 'Unavailable interest'), value: formatCount(metrics.unavailableItemTaps) },
        { key: 'smart-picks-shown', label: dashboardLabel(t, 'metrics.smartPicksShown', 'Smart Picks shown'), value: formatCount(metrics.smartPicksRendered) },
        { key: 'smart-picks-clicks', label: dashboardLabel(t, 'metrics.smartPicksTaps', 'Smart Picks taps'), value: formatCount(metrics.smartPicksClicks) },
    ];

    return rows.filter((row) => Number(row.value.replace(/,/g, '')) > 0);
}

function buildSourceRows(sourceQuality?: SourceQuality[], t?: OwnerDashboardTranslator): MenuAnalyticsDetailRow[] {
    return (sourceQuality || [])
        .filter((source) => hasPositiveValue([source.menuSessions, source.actionSessions, source.actionClicks]))
        .map((source) => ({
            key: `source-${source.source}`,
            label: source.label || source.source,
            value: dashboardLabel(t, 'details.units.sessions', `${formatCount(source.menuSessions)} sessions`, {
                count: formatCount(source.menuSessions),
            }),
            detail: dashboardLabel(t, 'details.sourceRowDetail', `${formatCount(source.actionSessions)} action sessions - ${formatCount(source.actionClicks)} action clicks - ${formatRate(source.actionRate)} action rate`, {
                sessions: formatCount(source.actionSessions),
                clicks: formatCount(source.actionClicks),
                rate: formatRate(source.actionRate),
            }),
        }));
}

function buildTrafficRows(label: string, values?: TrafficBreakdown[], t?: OwnerDashboardTranslator): MenuAnalyticsDetailRow[] {
    return (values || [])
        .filter((entry) => Number(entry.views || 0) > 0)
        .map((entry) => ({
            key: `${label.toLowerCase()}-${entry.key}`,
            label: dashboardLabel(t, 'details.trafficLabel', `${label}: ${entry.label || entry.key}`, {
                label,
                value: entry.label || entry.key,
            }),
            value: dashboardLabel(t, 'details.units.views', `${formatCount(entry.views)} views`, {
                count: formatCount(entry.views),
            }),
        }));
}

function buildTopItemRows(items?: TopItem[], t?: OwnerDashboardTranslator): MenuAnalyticsDetailRow[] {
    return (items || [])
        .filter((item) => hasPositiveValue([item.clicks, item.views, item.recommendationClicks, item.unavailableTaps]))
        .map((item, index) => ({
            key: `item-${item.itemId}`,
            label: `${index + 1}. ${item.name || item.itemId}`,
            value: dashboardLabel(t, 'details.units.taps', `${formatCount(item.clicks)} taps`, {
                count: formatCount(item.clicks),
            }),
            detail: item.statusLabel
                ? [item.statusLabel, item.statusReason].filter(Boolean).join(' · ')
                : undefined,
        }));
}

function buildCategoryRows(categories?: TopCategory[], t?: OwnerDashboardTranslator): MenuAnalyticsDetailRow[] {
    return (categories || [])
        .filter((category) => hasPositiveValue([category.views, category.clicks]))
        .map((category) => ({
            key: `category-${category.categoryId}`,
            label: category.name || category.categoryId,
            value: dashboardLabel(t, 'details.units.views', `${formatCount(category.views)} views`, {
                count: formatCount(category.views),
            }),
            detail: dashboardLabel(t, 'details.units.taps', `${formatCount(category.clicks)} taps`, {
                count: formatCount(category.clicks),
            }),
        }));
}

function buildActionRows(actions?: MenuActionBreakdown, t?: OwnerDashboardTranslator): MenuAnalyticsDetailRow[] {
    if (!actions) return [];

    return (Object.keys(MENU_ACTION_LABEL_KEYS) as Array<keyof MenuActionBreakdown>)
        .map((key) => ({
            key: `action-${key}`,
            label: dashboardLabel(t, `actions.${key}`, MENU_ACTION_LABEL_KEYS[key]),
            value: formatCount(actions[key]),
        }))
        .filter((row) => Number(row.value.replace(/,/g, '')) > 0);
}

function buildOpenHoursRows(
    breakdown?: OpenHoursActionBreakdown,
    t?: OwnerDashboardTranslator,
): MenuAnalyticsDetailRow[] {
    if (!breakdown || !hasPositiveValue([breakdown.open, breakdown.closed, breakdown.unknown])) return [];

    return [
        {
            key: 'open-hours-open',
            label: dashboardLabel(t, 'details.openHours.open', 'Actions while open'),
            value: formatCount(breakdown.open),
        },
        {
            key: 'open-hours-closed',
            label: dashboardLabel(t, 'details.openHours.closed', 'Actions while closed'),
            value: formatCount(breakdown.closed),
            detail: Number(breakdown.closed || 0) > 0
                ? dashboardLabel(t, 'details.openHours.closedShare', `${breakdown.closedShare || 0}% of timed actions`, {
                    rate: breakdown.closedShare || 0,
                })
                : undefined,
        },
        {
            key: 'open-hours-unknown',
            label: dashboardLabel(t, 'details.openHours.unknown', 'Actions with hours hidden'),
            value: formatCount(breakdown.unknown),
        },
    ].filter((row) => Number(row.value.replace(/,/g, '')) > 0);
}

function buildSearchRows(
    metrics: OwnerDashboardMetrics,
    topTerms?: SearchTerm[],
    zeroResultTerms?: SearchTerm[],
    t?: OwnerDashboardTranslator,
): MenuAnalyticsDetailRow[] {
    const rows: MenuAnalyticsDetailRow[] = [];

    if (Number(metrics.searches || 0) > 0) {
        rows.push({ key: 'search-total', label: dashboardLabel(t, 'details.metrics.totalSearches', 'Total searches'), value: formatCount(metrics.searches) });
    }
    if (Number(metrics.zeroResultSearches || 0) > 0) {
        rows.push({ key: 'search-zero-total', label: dashboardLabel(t, 'metrics.noResultSearches', 'No-result searches'), value: formatCount(metrics.zeroResultSearches) });
    }

    (topTerms || [])
        .filter((term) => Number(term.count || 0) > 0)
        .forEach((term) => {
            rows.push({
                key: `search-${term.term}`,
                label: term.term,
                value: formatCount(term.count),
                detail: dashboardLabel(t, 'details.searchTerm', 'Search term'),
            });
        });

    (zeroResultTerms || [])
        .filter((term) => Number(term.count || 0) > 0)
        .forEach((term) => {
            rows.push({
                key: `zero-search-${term.term}`,
                label: term.term,
                value: formatCount(term.count),
                detail: dashboardLabel(t, 'details.noResultTerm', 'No-result term'),
            });
        });

    return rows;
}

function buildLanguageRows(languages?: LanguageUsage[], t?: OwnerDashboardTranslator): MenuAnalyticsDetailRow[] {
    return (languages || [])
        .filter((language) => hasPositiveValue([language.menuSessions, language.menuViews, language.adoptions]))
        .map((language) => ({
            key: `language-${language.language}`,
            label: language.label || language.language.toUpperCase(),
            value: dashboardLabel(t, 'details.units.sessionsViews', `${formatCount(language.menuSessions || language.menuViews)} sessions/views`, {
                count: formatCount(language.menuSessions || language.menuViews),
            }),
            detail: dashboardLabel(t, 'details.languageStayedAfterSwitching', `${formatCount(language.adoptions)} stayed after switching`, {
                count: formatCount(language.adoptions),
            }),
        }));
}

function buildFilterRows(filters?: AttributeFilterInterest[], t?: OwnerDashboardTranslator): MenuAnalyticsDetailRow[] {
    return (filters || [])
        .filter((filter) => hasPositiveValue([
            filter.interactions,
            filter.itemViews,
            filter.itemTaps,
            filter.searches,
            filter.unavailableTaps,
            filter.actionClicks,
        ]))
        .map((filter) => ({
            key: `filter-${filter.filterId}`,
            label: filter.label || filter.filterId,
            value: dashboardLabel(t, 'details.units.interactions', `${formatCount(filter.interactions)} interactions`, {
                count: formatCount(filter.interactions),
            }),
            detail: dashboardLabel(t, 'details.filterRowDetail', `${formatCount(filter.itemTaps)} item taps - ${formatCount(filter.searches)} searches - ${formatCount(filter.actionClicks)} actions`, {
                taps: formatCount(filter.itemTaps),
                searches: formatCount(filter.searches),
                actions: formatCount(filter.actionClicks),
            }),
        }));
}

function buildSmartPickRows(blockPerformance?: BlockPerformance, t?: OwnerDashboardTranslator): MenuAnalyticsDetailRow[] {
    if (!blockPerformance) return [];

    return [
        { key: 'smart-popular', label: dashboardLabel(t, 'smartPicks.popularItems', 'Popular Items'), data: blockPerformance.popular },
        { key: 'smart-quick-pick', label: dashboardLabel(t, 'smartPicks.quickPick', 'Quick Pick'), data: blockPerformance.quickPick },
        { key: 'smart-best-value', label: dashboardLabel(t, 'smartPicks.bestValue', 'Best Value'), data: blockPerformance.bestValue },
    ]
        .filter((row) => hasPositiveValue([row.data.rendered, row.data.clicks]))
        .map((row) => ({
            key: row.key,
            label: row.label,
            value: dashboardLabel(t, 'details.units.taps', `${formatCount(row.data.clicks)} taps`, {
                count: formatCount(row.data.clicks),
            }),
            detail: dashboardLabel(t, 'details.units.views', `${formatCount(row.data.rendered)} views`, {
                count: formatCount(row.data.rendered),
            }),
        }));
}

export function buildMenuAnalyticsDetailSections(
    data: OwnerMenuAnalyticsDetailData | null | undefined,
    t?: OwnerDashboardTranslator,
): MenuAnalyticsDetailSection[] {
    if (!data) return [];

    const metrics = getMetrics(data);
    const sections: MenuAnalyticsDetailSection[] = [];

    pushSection(sections, {
        key: 'signals',
        title: dashboardLabel(t, 'details.sections.signals', 'Menu Signals'),
        rows: buildMetricRows(metrics, t),
    });

    pushSection(sections, {
        key: 'source-quality',
        title: dashboardLabel(t, 'details.sections.visitorSources', 'Visitor Sources'),
        description: dashboardLabel(t, 'details.descriptions.visitorSources', 'Sessions and final actions by entry source.'),
        rows: buildSourceRows(data.sourceQuality, t),
    });

    pushSection(sections, {
        key: 'campaigns',
        title: dashboardLabel(t, 'details.sections.campaignTracking', 'Campaign Tracking'),
        description: dashboardLabel(t, 'details.descriptions.campaignTracking', 'UTM traffic saved from links and QR placements.'),
        rows: [
            ...buildTrafficRows(dashboardLabel(t, 'details.traffic.source', 'Source'), data.utmSources, t),
            ...buildTrafficRows(dashboardLabel(t, 'details.traffic.medium', 'Medium'), data.utmMediums, t),
            ...buildTrafficRows(dashboardLabel(t, 'details.traffic.campaign', 'Campaign'), data.utmCampaigns, t),
            ...buildTrafficRows(dashboardLabel(t, 'details.traffic.content', 'Content'), data.utmContent, t),
        ],
    });

    pushSection(sections, {
        key: 'top-items',
        title: dashboardLabel(t, 'details.sections.topItems', 'Top Items'),
        rows: buildTopItemRows(data.topItems, t),
    });

    pushSection(sections, {
        key: 'categories',
        title: dashboardLabel(t, 'details.sections.categories', 'Categories'),
        rows: buildCategoryRows(data.topCategories, t),
    });

    pushSection(sections, {
        key: 'actions',
        title: dashboardLabel(t, 'details.sections.customerActions', 'Customer Actions'),
        rows: buildActionRows(data.menuActions, t),
    });

    pushSection(sections, {
        key: 'open-hours-actions',
        title: dashboardLabel(t, 'details.sections.openHoursActions', 'Open/Closed Action Timing'),
        description: dashboardLabel(t, 'details.descriptions.openHoursActions', 'Final customer actions grouped by the business hours state customers saw.'),
        rows: buildOpenHoursRows(data.openHoursActionBreakdown, t),
    });

    pushSection(sections, {
        key: 'search',
        title: dashboardLabel(t, 'details.sections.searchDemand', 'Search Demand'),
        rows: buildSearchRows(metrics, data.topSearchTerms, data.topZeroResultSearchTerms, t),
    });

    pushSection(sections, {
        key: 'unavailable',
        title: dashboardLabel(t, 'details.sections.unavailableInterest', 'Unavailable Interest'),
        rows: buildTopItemRows(data.unavailableItems, t),
    });

    pushSection(sections, {
        key: 'languages',
        title: dashboardLabel(t, 'details.sections.languages', 'Languages'),
        rows: buildLanguageRows(data.topLanguages, t),
    });

    pushSection(sections, {
        key: 'filters',
        title: dashboardLabel(t, 'details.sections.filters', 'Filters'),
        rows: buildFilterRows(data.topAttributeFilters, t),
    });

    pushSection(sections, {
        key: 'smart-picks',
        title: dashboardLabel(t, 'details.sections.smartPicks', 'Smart Picks'),
        rows: buildSmartPickRows(data.blockPerformance, t),
    });

    return sections;
}
