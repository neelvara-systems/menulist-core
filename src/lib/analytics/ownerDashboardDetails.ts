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
type UnknownRecord = Record<string, unknown>;

interface ProjectedOwnerAnalyticsDetailData {
    metrics: OwnerDashboardMetrics;
    sourceQuality: SourceQuality[];
    utmSources: TrafficBreakdown[];
    utmMediums: TrafficBreakdown[];
    utmCampaigns: TrafficBreakdown[];
    utmContent: TrafficBreakdown[];
    topItems: TopItem[];
    topCategories: TopCategory[];
    menuActions?: MenuActionBreakdown;
    openHoursActionBreakdown?: OpenHoursActionBreakdown;
    topSearchTerms: SearchTerm[];
    topZeroResultSearchTerms: SearchTerm[];
    unavailableItems: TopItem[];
    topLanguages: LanguageUsage[];
    topAttributeFilters: AttributeFilterInterest[];
    blockPerformance?: BlockPerformance;
}

export type OwnerDashboardTranslator = (key: string, values?: DashboardTranslationValues) => string;

const MENU_ACTION_LABEL_KEYS: Record<keyof MenuActionBreakdown, string> = {
    call: 'Call',
    whatsapp: 'WhatsApp',
    directions: 'Get directions',
    reserve: 'Reserve',
    order: 'Order',
};

const MAX_ANALYTICS_ROWS = 100;
const MAX_ANALYTICS_TEXT_LENGTH = 160;
const MAX_ANALYTICS_COUNT = 1_000_000_000_000_000;

function isRecord(value: unknown): value is UnknownRecord {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readOwnDataField(value: unknown, field: string): unknown {
    if (!isRecord(value)) return undefined;
    const descriptor = Object.getOwnPropertyDescriptor(value, field);
    return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}

function normalizeAnalyticsText(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/\s+/g, ' ').slice(0, MAX_ANALYTICS_TEXT_LENGTH).trim();
}

function normalizeAnalyticsCount(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0;
    return Math.min(MAX_ANALYTICS_COUNT, Math.floor(value));
}

function normalizeAnalyticsRate(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0;
    return Math.min(100, Math.round(value * 100) / 100);
}

function projectRecordArray<T>(
    value: unknown,
    projector: (entry: UnknownRecord, index: number) => T | null,
): T[] {
    if (!Array.isArray(value)) return [];
    const projected: T[] = [];
    value.slice(0, MAX_ANALYTICS_ROWS).forEach((entry, index) => {
        if (!isRecord(entry)) return;
        const row = projector(entry, index);
        if (row) projected.push(row);
    });
    return projected;
}

function projectMetrics(value: unknown): OwnerDashboardMetrics {
    const metrics = isRecord(value) ? value : {};
    return {
        menuVisits: normalizeAnalyticsCount(readOwnDataField(metrics, 'menuVisits') ?? readOwnDataField(metrics, 'totalViews')),
        itemClicks: normalizeAnalyticsCount(readOwnDataField(metrics, 'itemClicks') ?? readOwnDataField(metrics, 'totalClicks')),
        menuSessions: normalizeAnalyticsCount(readOwnDataField(metrics, 'menuSessions')),
        engagedSessions: normalizeAnalyticsCount(readOwnDataField(metrics, 'engagedSessions')),
        intentSessions: normalizeAnalyticsCount(readOwnDataField(metrics, 'intentSessions')),
        actionSessions: normalizeAnalyticsCount(readOwnDataField(metrics, 'actionSessions')),
        engagedSessionRate: normalizeAnalyticsRate(readOwnDataField(metrics, 'engagedSessionRate')),
        intentRate: normalizeAnalyticsRate(readOwnDataField(metrics, 'intentRate')),
        actionRate: normalizeAnalyticsRate(readOwnDataField(metrics, 'actionRate')),
        searches: normalizeAnalyticsCount(readOwnDataField(metrics, 'searches') ?? readOwnDataField(metrics, 'totalSearches')),
        unavailableItemTaps: normalizeAnalyticsCount(
            readOwnDataField(metrics, 'unavailableItemTaps')
            ?? readOwnDataField(metrics, 'totalUnavailableItemTaps'),
        ),
        menuActionClicks: normalizeAnalyticsCount(
            readOwnDataField(metrics, 'menuActionClicks')
            ?? readOwnDataField(metrics, 'totalMenuActionClicks'),
        ),
        zeroResultSearches: normalizeAnalyticsCount(
            readOwnDataField(metrics, 'zeroResultSearches')
            ?? readOwnDataField(metrics, 'totalZeroResultSearches'),
        ),
        smartPicksRendered: normalizeAnalyticsCount(
            readOwnDataField(metrics, 'smartPicksRendered')
            ?? readOwnDataField(metrics, 'totalSmartPicksRendered'),
        ),
        smartPicksClicks: normalizeAnalyticsCount(
            readOwnDataField(metrics, 'smartPicksClicks')
            ?? readOwnDataField(metrics, 'totalSmartPicksClicks'),
        ),
    };
}

function projectTopItems(value: unknown): TopItem[] {
    return projectRecordArray(value, (entry, index) => {
        const itemId = normalizeAnalyticsText(readOwnDataField(entry, 'itemId'));
        const name = normalizeAnalyticsText(readOwnDataField(entry, 'name'));
        if (!itemId && !name) return null;
        return {
            itemId: itemId || `legacy-item-${index + 1}`,
            ...(name ? { name } : {}),
            clicks: normalizeAnalyticsCount(readOwnDataField(entry, 'clicks')),
            views: normalizeAnalyticsCount(readOwnDataField(entry, 'views')),
            recommendationClicks: normalizeAnalyticsCount(readOwnDataField(entry, 'recommendationClicks')),
            unavailableTaps: normalizeAnalyticsCount(readOwnDataField(entry, 'unavailableTaps')),
            ...(normalizeAnalyticsText(readOwnDataField(entry, 'statusLabel'))
                ? { statusLabel: normalizeAnalyticsText(readOwnDataField(entry, 'statusLabel')) }
                : {}),
            ...(normalizeAnalyticsText(readOwnDataField(entry, 'statusReason'))
                ? { statusReason: normalizeAnalyticsText(readOwnDataField(entry, 'statusReason')) }
                : {}),
        };
    });
}

function projectTopCategories(value: unknown): TopCategory[] {
    return projectRecordArray(value, (entry, index) => {
        const categoryId = normalizeAnalyticsText(readOwnDataField(entry, 'categoryId'));
        const name = normalizeAnalyticsText(readOwnDataField(entry, 'name'));
        if (!categoryId && !name) return null;
        return {
            categoryId: categoryId || `legacy-category-${index + 1}`,
            ...(name ? { name } : {}),
            views: normalizeAnalyticsCount(readOwnDataField(entry, 'views')),
            clicks: normalizeAnalyticsCount(readOwnDataField(entry, 'clicks')),
        };
    });
}

function projectSourceQuality(value: unknown): SourceQuality[] {
    return projectRecordArray(value, (entry) => {
        const source = normalizeAnalyticsText(readOwnDataField(entry, 'source'));
        const label = normalizeAnalyticsText(readOwnDataField(entry, 'label'));
        if (!source && !label) return null;
        return {
            source: source || label,
            label: label || source,
            menuSessions: normalizeAnalyticsCount(readOwnDataField(entry, 'menuSessions')),
            actionSessions: normalizeAnalyticsCount(readOwnDataField(entry, 'actionSessions')),
            actionClicks: normalizeAnalyticsCount(readOwnDataField(entry, 'actionClicks')),
            actionRate: normalizeAnalyticsRate(readOwnDataField(entry, 'actionRate')),
        };
    });
}

function projectTraffic(value: unknown): TrafficBreakdown[] {
    return projectRecordArray(value, (entry) => {
        const key = normalizeAnalyticsText(readOwnDataField(entry, 'key'));
        const label = normalizeAnalyticsText(readOwnDataField(entry, 'label'));
        if (!key && !label) return null;
        return {
            key: key || label,
            label: label || key,
            views: normalizeAnalyticsCount(readOwnDataField(entry, 'views')),
        };
    });
}

function projectSearchTerms(value: unknown): SearchTerm[] {
    return projectRecordArray(value, (entry) => {
        const term = normalizeAnalyticsText(readOwnDataField(entry, 'term'));
        if (!term) return null;
        return {
            term,
            count: normalizeAnalyticsCount(readOwnDataField(entry, 'count')),
        };
    });
}

function projectLanguages(value: unknown): LanguageUsage[] {
    return projectRecordArray(value, (entry) => {
        const language = normalizeAnalyticsText(readOwnDataField(entry, 'language'));
        const label = normalizeAnalyticsText(readOwnDataField(entry, 'label'));
        if (!language && !label) return null;
        return {
            language: language || label,
            label: label || language,
            menuViews: normalizeAnalyticsCount(readOwnDataField(entry, 'menuViews')),
            menuSessions: normalizeAnalyticsCount(readOwnDataField(entry, 'menuSessions')),
            adoptions: normalizeAnalyticsCount(readOwnDataField(entry, 'adoptions')),
        };
    });
}

function projectFilters(value: unknown): AttributeFilterInterest[] {
    return projectRecordArray(value, (entry) => {
        const filterId = normalizeAnalyticsText(readOwnDataField(entry, 'filterId'));
        const label = normalizeAnalyticsText(readOwnDataField(entry, 'label'));
        if (!filterId && !label) return null;
        return {
            filterId: filterId || label,
            label: label || filterId,
            interactions: normalizeAnalyticsCount(readOwnDataField(entry, 'interactions')),
            itemViews: normalizeAnalyticsCount(readOwnDataField(entry, 'itemViews')),
            itemTaps: normalizeAnalyticsCount(readOwnDataField(entry, 'itemTaps')),
            searches: normalizeAnalyticsCount(readOwnDataField(entry, 'searches')),
            unavailableTaps: normalizeAnalyticsCount(readOwnDataField(entry, 'unavailableTaps')),
            actionClicks: normalizeAnalyticsCount(readOwnDataField(entry, 'actionClicks')),
        };
    });
}

function projectMenuActions(value: unknown): MenuActionBreakdown | undefined {
    if (!isRecord(value)) return undefined;
    return {
        call: normalizeAnalyticsCount(readOwnDataField(value, 'call')),
        whatsapp: normalizeAnalyticsCount(readOwnDataField(value, 'whatsapp')),
        directions: normalizeAnalyticsCount(readOwnDataField(value, 'directions')),
        reserve: normalizeAnalyticsCount(readOwnDataField(value, 'reserve')),
        order: normalizeAnalyticsCount(readOwnDataField(value, 'order')),
    };
}

function projectOpenHours(value: unknown): OpenHoursActionBreakdown | undefined {
    if (!isRecord(value)) return undefined;
    return {
        open: normalizeAnalyticsCount(readOwnDataField(value, 'open')),
        closed: normalizeAnalyticsCount(readOwnDataField(value, 'closed')),
        unknown: normalizeAnalyticsCount(readOwnDataField(value, 'unknown')),
        closedShare: normalizeAnalyticsRate(readOwnDataField(value, 'closedShare')),
    };
}

function projectBlockPerformance(value: unknown): BlockPerformance | undefined {
    if (!isRecord(value)) return undefined;
    const projectBlock = (block: unknown) => ({
        rendered: normalizeAnalyticsCount(readOwnDataField(block, 'rendered')),
        clicks: normalizeAnalyticsCount(readOwnDataField(block, 'clicks')),
    });
    return {
        popular: projectBlock(readOwnDataField(value, 'popular')),
        quickPick: projectBlock(readOwnDataField(value, 'quickPick')),
        bestValue: projectBlock(readOwnDataField(value, 'bestValue')),
    };
}

function projectOwnerAnalyticsDetailData(value: unknown): ProjectedOwnerAnalyticsDetailData | null {
    if (!isRecord(value)) return null;
    const directMetrics = readOwnDataField(value, 'metrics');
    const lifetimeMetrics = readOwnDataField(value, 'lifetimeMetrics');
    return {
        metrics: projectMetrics(isRecord(directMetrics) ? directMetrics : lifetimeMetrics),
        sourceQuality: projectSourceQuality(readOwnDataField(value, 'sourceQuality')),
        utmSources: projectTraffic(readOwnDataField(value, 'utmSources')),
        utmMediums: projectTraffic(readOwnDataField(value, 'utmMediums')),
        utmCampaigns: projectTraffic(readOwnDataField(value, 'utmCampaigns')),
        utmContent: projectTraffic(readOwnDataField(value, 'utmContent')),
        topItems: projectTopItems(readOwnDataField(value, 'topItems')),
        topCategories: projectTopCategories(readOwnDataField(value, 'topCategories')),
        menuActions: projectMenuActions(readOwnDataField(value, 'menuActions')),
        openHoursActionBreakdown: projectOpenHours(readOwnDataField(value, 'openHoursActionBreakdown')),
        topSearchTerms: projectSearchTerms(readOwnDataField(value, 'topSearchTerms')),
        topZeroResultSearchTerms: projectSearchTerms(readOwnDataField(value, 'topZeroResultSearchTerms')),
        unavailableItems: projectTopItems(readOwnDataField(value, 'unavailableItems')),
        topLanguages: projectLanguages(readOwnDataField(value, 'topLanguages')),
        topAttributeFilters: projectFilters(readOwnDataField(value, 'topAttributeFilters')),
        blockPerformance: projectBlockPerformance(readOwnDataField(value, 'blockPerformance')),
    };
}

function dashboardLabel(
    t: OwnerDashboardTranslator | undefined,
    key: string,
    fallback: string,
    values?: DashboardTranslationValues,
): string {
    const translated = t ? t(key, values) : fallback;
    return normalizeAnalyticsText(translated) || fallback;
}

function formatCount(value?: number): string {
    return normalizeAnalyticsCount(value).toLocaleString();
}

function formatRate(value?: number): string {
    return `${normalizeAnalyticsRate(value)}%`;
}

function hasPositiveValue(values: Array<number | undefined>): boolean {
    return values.some((value) => normalizeAnalyticsCount(value) > 0);
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
            label: dashboardLabel(t, 'details.metrics.engagedSessions', 'Sessions with activity'),
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
            label: dashboardLabel(t, 'details.openHours.open', 'Actions when open'),
            value: formatCount(breakdown.open),
        },
        {
            key: 'open-hours-closed',
            label: dashboardLabel(t, 'details.openHours.closed', 'Actions when closed'),
            value: formatCount(breakdown.closed),
            detail: Number(breakdown.closed || 0) > 0
                ? dashboardLabel(t, 'details.openHours.closedShare', `${breakdown.closedShare || 0}% of all recorded actions happened while closed`, {
                    rate: breakdown.closedShare || 0,
                })
                : undefined,
        },
        {
            key: 'open-hours-unknown',
            label: dashboardLabel(t, 'details.openHours.unknown', 'Actions when hours status was unavailable'),
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
    const projected = projectOwnerAnalyticsDetailData(data);
    if (!projected) return [];

    const metrics = projected.metrics;
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
        rows: buildSourceRows(projected.sourceQuality, t),
    });

    pushSection(sections, {
        key: 'campaigns',
        title: dashboardLabel(t, 'details.sections.campaignTracking', 'Campaign Tracking'),
        description: dashboardLabel(t, 'details.descriptions.campaignTracking', 'UTM traffic saved from links and QR placements.'),
        rows: [
            ...buildTrafficRows(dashboardLabel(t, 'details.traffic.source', 'Source'), projected.utmSources, t),
            ...buildTrafficRows(dashboardLabel(t, 'details.traffic.medium', 'Medium'), projected.utmMediums, t),
            ...buildTrafficRows(dashboardLabel(t, 'details.traffic.campaign', 'Campaign'), projected.utmCampaigns, t),
            ...buildTrafficRows(dashboardLabel(t, 'details.traffic.content', 'Content'), projected.utmContent, t),
        ],
    });

    pushSection(sections, {
        key: 'top-items',
        title: dashboardLabel(t, 'details.sections.topItems', 'Top Items'),
        rows: buildTopItemRows(projected.topItems, t),
    });

    pushSection(sections, {
        key: 'categories',
        title: dashboardLabel(t, 'details.sections.categories', 'Categories'),
        rows: buildCategoryRows(projected.topCategories, t),
    });

    pushSection(sections, {
        key: 'actions',
        title: dashboardLabel(t, 'details.sections.customerActions', 'Customer Actions'),
        rows: buildActionRows(projected.menuActions, t),
    });

    pushSection(sections, {
        key: 'open-hours-actions',
        title: dashboardLabel(t, 'details.sections.openHoursActions', 'Actions by business hours'),
        description: dashboardLabel(t, 'details.descriptions.openHoursActions', 'Final customer actions grouped by whether the business was open, closed, or its hours status was unavailable when the customer visited.'),
        rows: buildOpenHoursRows(projected.openHoursActionBreakdown, t),
    });

    pushSection(sections, {
        key: 'search',
        title: dashboardLabel(t, 'details.sections.searchDemand', 'Search Demand'),
        rows: buildSearchRows(metrics, projected.topSearchTerms, projected.topZeroResultSearchTerms, t),
    });

    pushSection(sections, {
        key: 'unavailable',
        title: dashboardLabel(t, 'details.sections.unavailableInterest', 'Unavailable Interest'),
        rows: buildTopItemRows(projected.unavailableItems, t),
    });

    pushSection(sections, {
        key: 'languages',
        title: dashboardLabel(t, 'details.sections.languages', 'Languages'),
        rows: buildLanguageRows(projected.topLanguages, t),
    });

    pushSection(sections, {
        key: 'filters',
        title: dashboardLabel(t, 'details.sections.filters', 'Filters'),
        rows: buildFilterRows(projected.topAttributeFilters, t),
    });

    pushSection(sections, {
        key: 'smart-picks',
        title: dashboardLabel(t, 'details.sections.smartPicks', 'Smart Picks'),
        rows: buildSmartPickRows(projected.blockPerformance, t),
    });

    return sections;
}
