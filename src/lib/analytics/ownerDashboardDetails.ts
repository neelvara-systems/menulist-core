import type {
    AttributeFilterInterest,
    BlockPerformance,
    DailyViewData,
    LanguageUsage,
    MenuActionBreakdown,
    MonthlyViewData,
    MTDViewData,
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

const MENU_ACTION_LABELS: Record<keyof MenuActionBreakdown, string> = {
    call: 'Call',
    whatsapp: 'WhatsApp',
    directions: 'Directions',
    reserve: 'Reserve',
    order: 'Order',
};

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

function buildMetricRows(metrics: OwnerDashboardMetrics): MenuAnalyticsDetailRow[] {
    const rows = [
        { key: 'menu-visits', label: 'Menu views', value: formatCount(metrics.menuVisits) },
        { key: 'item-clicks', label: 'Item taps', value: formatCount(metrics.itemClicks) },
        { key: 'menu-sessions', label: 'Menu sessions', value: formatCount(metrics.menuSessions) },
        {
            key: 'engaged-sessions',
            label: 'Engaged sessions',
            value: formatCount(metrics.engagedSessions),
            detail: `${formatRate(metrics.engagedSessionRate)} of menu sessions`,
        },
        {
            key: 'action-sessions',
            label: 'Action sessions',
            value: formatCount(metrics.actionSessions),
            detail: `${formatRate(metrics.actionRate)} of menu sessions`,
        },
        { key: 'customer-actions', label: 'Customer actions', value: formatCount(metrics.menuActionClicks) },
        { key: 'searches', label: 'Searches', value: formatCount(metrics.searches) },
        { key: 'zero-result-searches', label: 'No-result searches', value: formatCount(metrics.zeroResultSearches) },
        { key: 'unavailable-interest', label: 'Unavailable interest', value: formatCount(metrics.unavailableItemTaps) },
        { key: 'smart-picks-shown', label: 'Smart Picks shown', value: formatCount(metrics.smartPicksRendered) },
        { key: 'smart-picks-clicks', label: 'Smart Picks taps', value: formatCount(metrics.smartPicksClicks) },
    ];

    return rows.filter((row) => Number(row.value.replace(/,/g, '')) > 0);
}

function buildSourceRows(sourceQuality?: SourceQuality[]): MenuAnalyticsDetailRow[] {
    return (sourceQuality || [])
        .filter((source) => hasPositiveValue([source.menuSessions, source.actionSessions, source.actionClicks]))
        .map((source) => ({
            key: `source-${source.source}`,
            label: source.label || source.source,
            value: `${formatCount(source.menuSessions)} sessions`,
            detail: `${formatCount(source.actionSessions)} action sessions - ${formatCount(source.actionClicks)} action clicks - ${formatRate(source.actionRate)} action rate`,
        }));
}

function buildTrafficRows(label: string, values?: TrafficBreakdown[]): MenuAnalyticsDetailRow[] {
    return (values || [])
        .filter((entry) => Number(entry.views || 0) > 0)
        .map((entry) => ({
            key: `${label.toLowerCase()}-${entry.key}`,
            label: `${label}: ${entry.label || entry.key}`,
            value: `${formatCount(entry.views)} views`,
        }));
}

function buildTopItemRows(items?: TopItem[]): MenuAnalyticsDetailRow[] {
    return (items || [])
        .filter((item) => Number(item.clicks || 0) > 0)
        .map((item, index) => ({
            key: `item-${item.itemId}`,
            label: `${index + 1}. ${item.name || item.itemId}`,
            value: `${formatCount(item.clicks)} taps`,
        }));
}

function buildCategoryRows(categories?: TopCategory[]): MenuAnalyticsDetailRow[] {
    return (categories || [])
        .filter((category) => hasPositiveValue([category.views, category.clicks]))
        .map((category) => ({
            key: `category-${category.categoryId}`,
            label: category.name || category.categoryId,
            value: `${formatCount(category.views)} views`,
            detail: `${formatCount(category.clicks)} taps`,
        }));
}

function buildActionRows(actions?: MenuActionBreakdown): MenuAnalyticsDetailRow[] {
    if (!actions) return [];

    return (Object.keys(MENU_ACTION_LABELS) as Array<keyof MenuActionBreakdown>)
        .map((key) => ({
            key: `action-${key}`,
            label: MENU_ACTION_LABELS[key],
            value: formatCount(actions[key]),
        }))
        .filter((row) => Number(row.value.replace(/,/g, '')) > 0);
}

function buildSearchRows(metrics: OwnerDashboardMetrics, topTerms?: SearchTerm[], zeroResultTerms?: SearchTerm[]): MenuAnalyticsDetailRow[] {
    const rows: MenuAnalyticsDetailRow[] = [];

    if (Number(metrics.searches || 0) > 0) {
        rows.push({ key: 'search-total', label: 'Total searches', value: formatCount(metrics.searches) });
    }
    if (Number(metrics.zeroResultSearches || 0) > 0) {
        rows.push({ key: 'search-zero-total', label: 'No-result searches', value: formatCount(metrics.zeroResultSearches) });
    }

    (topTerms || [])
        .filter((term) => Number(term.count || 0) > 0)
        .forEach((term) => {
            rows.push({
                key: `search-${term.term}`,
                label: term.term,
                value: formatCount(term.count),
                detail: 'Search term',
            });
        });

    (zeroResultTerms || [])
        .filter((term) => Number(term.count || 0) > 0)
        .forEach((term) => {
            rows.push({
                key: `zero-search-${term.term}`,
                label: term.term,
                value: formatCount(term.count),
                detail: 'No-result term',
            });
        });

    return rows;
}

function buildLanguageRows(languages?: LanguageUsage[]): MenuAnalyticsDetailRow[] {
    return (languages || [])
        .filter((language) => hasPositiveValue([language.menuSessions, language.menuViews, language.adoptions]))
        .map((language) => ({
            key: `language-${language.language}`,
            label: language.label || language.language.toUpperCase(),
            value: `${formatCount(language.menuSessions || language.menuViews)} sessions/views`,
            detail: `${formatCount(language.adoptions)} stayed after switching`,
        }));
}

function buildFilterRows(filters?: AttributeFilterInterest[]): MenuAnalyticsDetailRow[] {
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
            value: `${formatCount(filter.interactions)} interactions`,
            detail: `${formatCount(filter.itemTaps)} item taps - ${formatCount(filter.searches)} searches - ${formatCount(filter.actionClicks)} actions`,
        }));
}

function buildSmartPickRows(blockPerformance?: BlockPerformance): MenuAnalyticsDetailRow[] {
    if (!blockPerformance) return [];

    return [
        { key: 'smart-popular', label: 'Popular Items', data: blockPerformance.popular },
        { key: 'smart-quick-pick', label: 'Quick Pick', data: blockPerformance.quickPick },
        { key: 'smart-best-value', label: 'Best Value', data: blockPerformance.bestValue },
    ]
        .filter((row) => hasPositiveValue([row.data.rendered, row.data.clicks]))
        .map((row) => ({
            key: row.key,
            label: row.label,
            value: `${formatCount(row.data.clicks)} taps`,
            detail: `${formatCount(row.data.rendered)} views`,
        }));
}

export function buildMenuAnalyticsDetailSections(
    data: OwnerMenuAnalyticsDetailData | null | undefined,
): MenuAnalyticsDetailSection[] {
    if (!data) return [];

    const metrics = getMetrics(data);
    const sections: MenuAnalyticsDetailSection[] = [];

    pushSection(sections, {
        key: 'signals',
        title: 'Menu Signals',
        rows: buildMetricRows(metrics),
    });

    pushSection(sections, {
        key: 'source-quality',
        title: 'Visitor Sources',
        description: 'Sessions and final actions by entry source.',
        rows: buildSourceRows(data.sourceQuality),
    });

    pushSection(sections, {
        key: 'campaigns',
        title: 'Campaign Tracking',
        description: 'UTM traffic saved from links and QR placements.',
        rows: [
            ...buildTrafficRows('Source', data.utmSources),
            ...buildTrafficRows('Medium', data.utmMediums),
            ...buildTrafficRows('Campaign', data.utmCampaigns),
            ...buildTrafficRows('Content', data.utmContent),
        ],
    });

    pushSection(sections, {
        key: 'top-items',
        title: 'Top Items',
        rows: buildTopItemRows(data.topItems),
    });

    pushSection(sections, {
        key: 'categories',
        title: 'Categories',
        rows: buildCategoryRows(data.topCategories),
    });

    pushSection(sections, {
        key: 'actions',
        title: 'Customer Actions',
        rows: buildActionRows(data.menuActions),
    });

    pushSection(sections, {
        key: 'search',
        title: 'Search Demand',
        rows: buildSearchRows(metrics, data.topSearchTerms, data.topZeroResultSearchTerms),
    });

    pushSection(sections, {
        key: 'unavailable',
        title: 'Unavailable Interest',
        rows: buildTopItemRows(data.unavailableItems),
    });

    pushSection(sections, {
        key: 'languages',
        title: 'Languages',
        rows: buildLanguageRows(data.topLanguages),
    });

    pushSection(sections, {
        key: 'filters',
        title: 'Filters',
        rows: buildFilterRows(data.topAttributeFilters),
    });

    pushSection(sections, {
        key: 'smart-picks',
        title: 'Smart Picks',
        rows: buildSmartPickRows(data.blockPerformance),
    });

    return sections;
}
