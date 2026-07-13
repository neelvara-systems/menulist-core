/**
 * OBP Analytics Aggregation — Nightly Rollup (Full Parity with Digital Menu)
 *
 * Produces the SAME document structure as digital menu analytics:
 * - Weekly doc:  analytics/{tId}_{sId}_obp_weekly_{YYYY-Www}
 * - Monthly doc: analytics/{tId}_{sId}_obp_monthly_{YYYY-MM}
 * - Summary doc: analytics/{tId}_{sId}_obp_overall_summary
 *   └─ lifetime:  { totalOBPViews, totalOBPActionClicks, actions }
 *   └─ weekly:    { totalOBPViews, totalOBPActionClicks, actions, viewsChange }
 *
 * OBP is treated as a first-class analytics layer — equal weight to digital menu.
 * Owners may focus on OBP before they even publish a menu.
 *
 * @see __docs__/official-business-page/official-business-page_firebase.md
 */

import { FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import {
    DB_COLLECTIONS,
    getAnalyticsDocId,
    getMonthDateRange,
    getWeekDateRange,
} from '../constants/database';
import { firestoreAdmin } from '../firebaseAdmin';
import { logger as appLogger } from '../lib/logger';
import { parsePlatformStoreSummary } from '../sharedData/storeSummaryBoundary';
import {
    addDaysToAnalyticsDateKey,
    getAnalyticsDateKey,
    getAnalyticsDateRange,
    parseAnalyticsDateKey,
} from '../utils/analyticsDate';
import { getBusinessAnalyticsDateKey, resolveBusinessDayEndTime } from '../utils/businessDay';

const logger = functions.logger;

const OBP_PROJECT_ID = 'obp';
const OBP_DAILY_CACHE_DAYS = 45;
const OBP_LIFETIME_DATE_LEDGER_LIMIT = 120;
const OBP_ANALYTICS_DAILY_CONTRACT_INVALID = 'OBP_ANALYTICS_DAILY_CONTRACT_INVALID';
const OBP_ANALYTICS_DASHBOARD_CONTRACT_INVALID = 'OBP_ANALYTICS_DASHBOARD_CONTRACT_INVALID';
const OBP_ANALYTICS_DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// ================================================================
// TYPES
// ================================================================

interface OBPDailyData {
    date?: string;
    totalOBPViews?: number;
    totalOBPActionClicks?: number;
    totalOBPMenuClicks?: number;
    totalOBPLinkClicks?: number;
    totalOBPShares?: number;
    totalSessions?: number;
    obpActionClicks?: {
        call?: number;
        whatsapp?: number;
        directions?: number;
        reserve?: number;
        order?: number;
    };
    obpLinkClicks?: {
        google_review?: number;
        instagram?: number;
        facebook?: number;
        twitter?: number;
        linkedin?: number;
        youtube?: number;
        whatsapp?: number;
        website?: number;
    };
    obpShares?: {
        whatsapp?: number;
        copy_link?: number;
        copy_message?: number;
    };
    viewsByEntrySource?: Record<string, number>;
    viewsBySource?: Record<string, number>;
    obpActionClicksBySource?: Record<string, number>;
    obpMenuClicksBySource?: Record<string, number>;
    obpLinkClicksBySource?: Record<string, number>;
    obpActionClicksByOpenHoursState?: Record<string, number>;
    obpMenuClicksByOpenHoursState?: Record<string, number>;
    obpLinkClicksByOpenHoursState?: Record<string, number>;
    obpLanguageTrackingEnabled?: boolean;
    obpViewsByLanguage?: Record<string, number>;
    obpSessionsByLanguage?: Record<string, number>;
    obpLanguageAdoptions?: Record<string, number>;
    obpLanguageNames?: Record<string, string>;
    viewsByDevice?: Record<string, number>;
    viewsByLocation?: Record<string, number>;
    viewsByMedium?: Record<string, number>;
    viewsByCampaign?: Record<string, number>;
    viewsByContent?: Record<string, number>;
    hourlyViews?: Record<string, number>;
    hourlyOBPActionClicks?: Record<string, number>;
    hourlyOBPLinkClicks?: Record<string, number>;
    hourlyOBPMenuClicks?: Record<string, number>;
    obpMenuClicksBySurface?: Record<string, number>;
}

const OBP_DAILY_NUMERIC_FIELDS: ReadonlyArray<keyof OBPDailyData> = [
    'totalOBPActionClicks',
    'totalOBPLinkClicks',
    'totalOBPMenuClicks',
    'totalOBPShares',
    'totalOBPViews',
    'totalSessions',
];
const OBP_DAILY_NUMERIC_MAP_FIELDS: ReadonlyArray<keyof OBPDailyData> = [
    'hourlyViews',
    'hourlyOBPActionClicks',
    'hourlyOBPLinkClicks',
    'hourlyOBPMenuClicks',
    'obpActionClicks',
    'obpActionClicksByOpenHoursState',
    'obpActionClicksBySource',
    'obpLanguageAdoptions',
    'obpLinkClicks',
    'obpLinkClicksByOpenHoursState',
    'obpLinkClicksBySource',
    'obpMenuClicksByOpenHoursState',
    'obpMenuClicksBySource',
    'obpMenuClicksBySurface',
    'obpSessionsByLanguage',
    'obpShares',
    'obpViewsByLanguage',
    'viewsByDevice',
    'viewsByLocation',
    'viewsByMedium',
    'viewsByCampaign',
    'viewsByContent',
    'viewsByEntrySource',
    'viewsBySource',
];

interface OBPAggregatedMetrics {
    totalOBPViews: number;
    totalOBPActionClicks: number;
    totalOBPMenuClicks: number;
    totalOBPLinkClicks: number;
    totalOBPShares: number;
    obpActionClicks: { call: number; whatsapp: number; directions: number; reserve: number; order: number };
    obpLinkClicks: { google_review: number; instagram: number; facebook: number; twitter: number; linkedin: number; youtube: number; whatsapp: number; website: number };
    obpShares: { whatsapp: number; copy_link: number; copy_message: number };
    viewsByEntrySource: Record<string, number>;
    viewsBySource: Record<string, number>;
    obpActionClicksBySource: Record<string, number>;
    obpMenuClicksBySource: Record<string, number>;
    obpLinkClicksBySource: Record<string, number>;
    obpActionClicksByOpenHoursState: Record<string, number>;
    obpMenuClicksByOpenHoursState: Record<string, number>;
    obpLinkClicksByOpenHoursState: Record<string, number>;
    obpLanguageTrackingEnabled: boolean;
    obpViewsByLanguage: Record<string, number>;
    obpSessionsByLanguage: Record<string, number>;
    obpLanguageAdoptions: Record<string, number>;
    obpLanguageNames: Record<string, string>;
    daysWithData: number;
}

// ================================================================
// HELPERS
// ================================================================

function getDateRange(start: Date, end: Date): string[] {
    return getAnalyticsDateRange(
        getAnalyticsDateKey(start),
        getAnalyticsDateKey(end),
    );
}

function emptyMetrics(): OBPAggregatedMetrics {
    return {
        totalOBPViews: 0,
        totalOBPActionClicks: 0,
        totalOBPMenuClicks: 0,
        totalOBPLinkClicks: 0,
        totalOBPShares: 0,
        obpActionClicks: { call: 0, whatsapp: 0, directions: 0, reserve: 0, order: 0 },
        obpLinkClicks: { google_review: 0, instagram: 0, facebook: 0, twitter: 0, linkedin: 0, youtube: 0, whatsapp: 0, website: 0 },
        obpShares: { whatsapp: 0, copy_link: 0, copy_message: 0 },
        viewsByEntrySource: {},
        viewsBySource: {},
        obpActionClicksBySource: {},
        obpMenuClicksBySource: {},
        obpLinkClicksBySource: {},
        obpActionClicksByOpenHoursState: {},
        obpMenuClicksByOpenHoursState: {},
        obpLinkClicksByOpenHoursState: {},
        obpLanguageTrackingEnabled: false,
        obpViewsByLanguage: {},
        obpSessionsByLanguage: {},
        obpLanguageAdoptions: {},
        obpLanguageNames: {},
        daysWithData: 0,
    };
}

function getOBPDashboardSummaryDocId(tId: string, sId: string): string {
    return `${tId}_${sId}_${OBP_PROJECT_ID}_dashboard_summary`;
}

function toDashboardMetrics(metrics: OBPAggregatedMetrics) {
    return {
        views: metrics.totalOBPViews,
        actionClicks: metrics.totalOBPActionClicks,
        menuClicks: metrics.totalOBPMenuClicks,
        linkClicks: metrics.totalOBPLinkClicks,
        shares: metrics.totalOBPShares,
        actions: metrics.obpActionClicks,
        shareMethods: metrics.obpShares,
        links: metrics.obpLinkClicks,
        sources: buildOBPSourceBreakdown(metrics),
        openHoursActionBreakdown: buildOBPOpenHoursBreakdown(metrics),
        topLanguages: buildOBPLanguageBreakdown(metrics),
        daysWithData: metrics.daysWithData,
    };
}

function readOBPCounter(data: Record<string, any>, mapName: string, key: string): number {
    return Number(data?.[mapName]?.[key] || data?.[`${mapName}.${key}`] || 0);
}

function normalizeOBPAnalyticsMapKey(value: string): string | null {
    const normalized = String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80);
    return normalized || null;
}

function isOBPAnalyticsRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeOBPAnalyticsDateKey(value: unknown): string | null {
    if (typeof value !== 'string' || !OBP_ANALYTICS_DATE_KEY_PATTERN.test(value)) return null;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
}

function isValidOBPNumberMap(value: unknown): boolean {
    return value === undefined || (
        isOBPAnalyticsRecord(value)
        && Object.entries(value).every(([key, entry]) => (
            /^[A-Za-z0-9_:-]{1,120}$/.test(key)
            && typeof entry === 'number'
            && Number.isFinite(entry)
            && entry >= 0
        ))
    );
}

function isValidOBPStringMap(value: unknown): boolean {
    return value === undefined || (
        isOBPAnalyticsRecord(value)
        && Object.entries(value).every(([key, entry]) => (
            /^[A-Za-z0-9_:-]{1,120}$/.test(key)
            && typeof entry === 'string'
            && entry.trim().length > 0
            && entry.length <= 120
        ))
    );
}

function normalizeOBPDailyMetrics(value: unknown, expectedDate: string): OBPDailyData | null {
    if (!isOBPAnalyticsRecord(value) || normalizeOBPAnalyticsDateKey(value.date ?? expectedDate) !== expectedDate) return null;
    if (
        OBP_DAILY_NUMERIC_FIELDS.some((field) => (
            value[field] !== undefined
            && (typeof value[field] !== 'number' || !Number.isFinite(value[field]) || Number(value[field]) < 0)
        ))
        || OBP_DAILY_NUMERIC_MAP_FIELDS.some((field) => !isValidOBPNumberMap(value[field]))
        || !isValidOBPStringMap(value.obpLanguageNames)
        || value.obpLanguageTrackingEnabled !== undefined && typeof value.obpLanguageTrackingEnabled !== 'boolean'
    ) return null;
    return { ...value, date: expectedDate } as OBPDailyData;
}

function normalizeOBPDailyDocument(
    value: unknown,
    expected: { date: string; docId: string; sId: string; tId: string },
): OBPDailyData | null {
    if (!isOBPAnalyticsRecord(value)) return null;
    const date = normalizeOBPAnalyticsDateKey(value.localDate ?? value.date);
    const optionalDate = value.date === undefined ? expected.date : normalizeOBPAnalyticsDateKey(value.date);
    if (
        String(value.tId ?? '') !== expected.tId
        || String(value.sId ?? '') !== expected.sId
        || value.projectId !== OBP_PROJECT_ID
        || value.grain !== 'daily'
        || value.analyticsScope !== 'customer'
        || value.surface !== 'obp'
        || date !== expected.date
        || optionalDate !== expected.date
        || expected.docId !== getAnalyticsDocId.daily(expected.tId, expected.sId, OBP_PROJECT_ID, expected.date)
    ) return null;
    return normalizeOBPDailyMetrics(value, expected.date);
}

function normalizeOBPDashboardIdentity(value: unknown, tId: string, sId: string): Record<string, any> | null {
    if (!isOBPAnalyticsRecord(value)) return null;
    return String(value.tId ?? '') === tId
        && String(value.sId ?? '') === sId
        && value.projectId === OBP_PROJECT_ID
        && value.kind === 'obpDashboardSummary'
        ? value as Record<string, any>
        : null;
}

function assertValidOBPAnalyticsSummary(value: unknown, tId: string, sId: string): asserts value is Record<string, any> {
    if (!isOBPAnalyticsRecord(value)) throw new Error('OBP_ANALYTICS_SUMMARY_CONTRACT_INVALID');
    if (
        value.tId !== undefined && String(value.tId) !== tId
        || value.sId !== undefined && String(value.sId) !== sId
        || value.projectId !== undefined && value.projectId !== OBP_PROJECT_ID
        || value.grain !== undefined && value.grain !== 'summary'
        || value.analyticsScope !== undefined && value.analyticsScope !== 'customer'
        || value.surface !== undefined && value.surface !== 'obp'
    ) throw new Error('OBP_ANALYTICS_SUMMARY_CONTRACT_INVALID');
    for (const field of ['firstDataDate', 'lastCorrectionDate', 'lastProcessedDate'] as const) {
        if (value[field] !== undefined && !normalizeOBPAnalyticsDateKey(value[field])) {
            throw new Error('OBP_ANALYTICS_SUMMARY_CONTRACT_INVALID');
        }
    }
    if (value.processedLifetimeDates !== undefined) {
        if (
            !isOBPAnalyticsRecord(value.processedLifetimeDates)
            || Object.keys(value.processedLifetimeDates).length > OBP_LIFETIME_DATE_LEDGER_LIMIT
            || Object.entries(value.processedLifetimeDates).some(([date, settled]) => (
                !normalizeOBPAnalyticsDateKey(date) || settled !== true
            ))
        ) throw new Error('OBP_ANALYTICS_SUMMARY_CONTRACT_INVALID');
    }
    if (value.lifetime === undefined) return;
    if (!isOBPAnalyticsRecord(value.lifetime)) throw new Error('OBP_ANALYTICS_SUMMARY_CONTRACT_INVALID');
    const lifetime = value.lifetime;
    for (const field of OBP_DAILY_NUMERIC_FIELDS) {
        if (
            lifetime[field] !== undefined
            && (typeof lifetime[field] !== 'number' || !Number.isFinite(lifetime[field]) || Number(lifetime[field]) < 0)
        ) throw new Error('OBP_ANALYTICS_SUMMARY_CONTRACT_INVALID');
    }
    for (const field of OBP_DAILY_NUMERIC_MAP_FIELDS) {
        if (!isValidOBPNumberMap(lifetime[field])) throw new Error('OBP_ANALYTICS_SUMMARY_CONTRACT_INVALID');
    }
    if (
        !isValidOBPStringMap(lifetime.obpLanguageNames)
        || lifetime.obpLanguageTrackingEnabled !== undefined && typeof lifetime.obpLanguageTrackingEnabled !== 'boolean'
    ) throw new Error('OBP_ANALYTICS_SUMMARY_CONTRACT_INVALID');
}

export function normalizeOBPDailyForTest(value: unknown, expectedDate: string): OBPDailyData | null {
    return normalizeOBPDailyMetrics(value, expectedDate);
}

export function normalizeOBPDashboardIdentityForTest(value: unknown, tId: string, sId: string): Record<string, any> | null {
    return normalizeOBPDashboardIdentity(value, tId, sId);
}

function assignOBPNumericMapValue(target: Record<string, number>, key: string, value: unknown): void {
    const normalizedKey = normalizeOBPAnalyticsMapKey(key);
    const numeric = Number(value || 0);
    if (!normalizedKey || numeric <= 0) return;
    target[normalizedKey] = (target[normalizedKey] || 0) + numeric;
}

function readAnalyticsMap(data: Record<string, any> = {}, field: string): Record<string, number> {
    const result: Record<string, number> = {};
    Object.entries(data?.[field] || {}).forEach(([key, value]) => {
        assignOBPNumericMapValue(result, key, value);
    });

    const prefix = `${field}.`;
    Object.entries(data || {}).forEach(([key, value]) => {
        if (!key.startsWith(prefix)) return;
        assignOBPNumericMapValue(result, key.slice(prefix.length), value);
    });

    return result;
}

function readStringMap(data: Record<string, any> = {}, field: string): Record<string, string> {
    const result: Record<string, string> = {};
    Object.entries(data?.[field] || {}).forEach(([key, value]) => {
        if (typeof value !== 'string' || !value.trim()) return;
        const normalizedKey = normalizeOBPAnalyticsMapKey(key);
        if (normalizedKey) result[normalizedKey] = value.trim();
    });

    const prefix = `${field}.`;
    Object.entries(data || {}).forEach(([key, value]) => {
        if (!key.startsWith(prefix) || typeof value !== 'string' || !value.trim()) return;
        const normalizedKey = normalizeOBPAnalyticsMapKey(key.slice(prefix.length));
        if (normalizedKey) result[normalizedKey] = value.trim();
    });

    return result;
}

function mergeNumericMap(target: Record<string, number>, source: Record<string, number> = {}) {
    Object.entries(source).forEach(([key, value]) => {
        const numeric = Number(value || 0);
        if (numeric > 0) target[key] = (target[key] || 0) + numeric;
    });
}

function sumNumericMaps(...maps: Array<Record<string, number> | undefined>): Record<string, number> {
    const result: Record<string, number> = {};
    maps.forEach((map) => mergeNumericMap(result, map || {}));
    return result;
}

const OBP_SOURCE_LABELS: Record<string, string> = {
    copy_link: 'Copied link',
    direct: 'Direct link',
    facebook: 'Facebook',
    google: 'Google',
    instagram: 'Instagram',
    menu_kit: 'Menu kit',
    native_share: 'Phone share',
    obp: 'Official business page',
    qr: 'QR / table scan',
    shortcut: 'Customer app shortcut',
    whatsapp: 'WhatsApp',
    other: 'Other source',
};

function buildOBPSourceBreakdown(metrics: OBPAggregatedMetrics) {
    const sourceIds = new Set<string>([
        ...Object.keys(metrics.viewsByEntrySource || {}),
        ...Object.keys(metrics.obpActionClicksBySource || {}),
        ...Object.keys(metrics.obpMenuClicksBySource || {}),
        ...Object.keys(metrics.obpLinkClicksBySource || {}),
    ]);

    return Array.from(sourceIds)
        .map((source) => ({
            source,
            label: OBP_SOURCE_LABELS[source] || source,
            views: metrics.viewsByEntrySource[source] || 0,
            actionClicks: metrics.obpActionClicksBySource[source] || 0,
            menuClicks: metrics.obpMenuClicksBySource[source] || 0,
            linkClicks: metrics.obpLinkClicksBySource[source] || 0,
        }))
        .filter((entry) => entry.views > 0 || entry.actionClicks > 0 || entry.menuClicks > 0 || entry.linkClicks > 0)
        .sort((a, b) => (b.views + b.actionClicks + b.menuClicks + b.linkClicks) - (a.views + a.actionClicks + a.menuClicks + a.linkClicks))
        .slice(0, 6);
}

function buildOBPOpenHoursBreakdown(metrics: {
    obpActionClicksByOpenHoursState?: Record<string, number>;
    obpMenuClicksByOpenHoursState?: Record<string, number>;
    obpLinkClicksByOpenHoursState?: Record<string, number>;
}) {
    const read = (state: 'open' | 'closed' | 'unknown') => (
        (metrics.obpActionClicksByOpenHoursState?.[state] || 0)
        + (metrics.obpMenuClicksByOpenHoursState?.[state] || 0)
        + (metrics.obpLinkClicksByOpenHoursState?.[state] || 0)
    );
    const open = read('open');
    const closed = read('closed');
    const unknown = read('unknown');
    const total = open + closed + unknown;
    return {
        open,
        closed,
        unknown,
        closedShare: total > 0 ? Math.round((closed / total) * 100) : 0,
    };
}

function buildOBPLanguageBreakdown(data: {
    obpLanguageTrackingEnabled?: boolean;
    obpViewsByLanguage?: Record<string, number>;
    obpSessionsByLanguage?: Record<string, number>;
    obpLanguageAdoptions?: Record<string, number>;
    obpLanguageNames?: Record<string, string>;
}) {
    if (!data.obpLanguageTrackingEnabled) return [];

    const views = data.obpViewsByLanguage || {};
    const sessions = data.obpSessionsByLanguage || {};
    const adoptions = data.obpLanguageAdoptions || {};
    const names = data.obpLanguageNames || {};
    const languageIds = new Set<string>([
        ...Object.keys(views),
        ...Object.keys(sessions),
        ...Object.keys(adoptions),
    ]);

    return Array.from(languageIds)
        .map((language) => ({
            language,
            label: names[language] || language.toUpperCase(),
            views: views[language] || 0,
            sessions: sessions[language] || 0,
            adoptions: adoptions[language] || 0,
        }))
        .filter((entry) => entry.views > 0 || entry.sessions > 0 || entry.adoptions > 0)
        .sort((a, b) => ((b.sessions + b.adoptions + b.views) - (a.sessions + a.adoptions + a.views)))
        .slice(0, 5);
}

function normalizeOBPActionClicks(data: Record<string, any> = {}) {
    return {
        call: readOBPCounter(data, 'obpActionClicks', 'call'),
        whatsapp: readOBPCounter(data, 'obpActionClicks', 'whatsapp'),
        directions: readOBPCounter(data, 'obpActionClicks', 'directions'),
        reserve: readOBPCounter(data, 'obpActionClicks', 'reserve'),
        order: readOBPCounter(data, 'obpActionClicks', 'order'),
    };
}

function normalizeOBPLinkClicks(data: Record<string, any> = {}) {
    return {
        google_review: readOBPCounter(data, 'obpLinkClicks', 'google_review'),
        instagram: readOBPCounter(data, 'obpLinkClicks', 'instagram'),
        facebook: readOBPCounter(data, 'obpLinkClicks', 'facebook'),
        twitter: readOBPCounter(data, 'obpLinkClicks', 'twitter'),
        linkedin: readOBPCounter(data, 'obpLinkClicks', 'linkedin'),
        youtube: readOBPCounter(data, 'obpLinkClicks', 'youtube'),
        whatsapp: readOBPCounter(data, 'obpLinkClicks', 'whatsapp'),
        website: readOBPCounter(data, 'obpLinkClicks', 'website'),
    };
}

function normalizeOBPShares(data: Record<string, any> = {}) {
    return {
        whatsapp: readOBPCounter(data, 'obpShares', 'whatsapp'),
        copy_link: readOBPCounter(data, 'obpShares', 'copy_link'),
        copy_message: readOBPCounter(data, 'obpShares', 'copy_message'),
    };
}

function normalizeOBPDailyData(data: OBPDailyData): OBPDailyData {
    return {
        ...data,
        obpActionClicks: normalizeOBPActionClicks(data as Record<string, any>),
        obpLinkClicks: normalizeOBPLinkClicks(data as Record<string, any>),
        obpShares: normalizeOBPShares(data as Record<string, any>),
        viewsByEntrySource: readAnalyticsMap(data as Record<string, any>, 'viewsByEntrySource'),
        viewsBySource: readAnalyticsMap(data as Record<string, any>, 'viewsBySource'),
        obpActionClicksBySource: readAnalyticsMap(data as Record<string, any>, 'obpActionClicksBySource'),
        obpMenuClicksBySource: readAnalyticsMap(data as Record<string, any>, 'obpMenuClicksBySource'),
        obpLinkClicksBySource: readAnalyticsMap(data as Record<string, any>, 'obpLinkClicksBySource'),
        obpActionClicksByOpenHoursState: readAnalyticsMap(data as Record<string, any>, 'obpActionClicksByOpenHoursState'),
        obpMenuClicksByOpenHoursState: readAnalyticsMap(data as Record<string, any>, 'obpMenuClicksByOpenHoursState'),
        obpLinkClicksByOpenHoursState: readAnalyticsMap(data as Record<string, any>, 'obpLinkClicksByOpenHoursState'),
        obpLanguageTrackingEnabled: Boolean((data as Record<string, any>).obpLanguageTrackingEnabled),
        obpViewsByLanguage: readAnalyticsMap(data as Record<string, any>, 'obpViewsByLanguage'),
        obpSessionsByLanguage: readAnalyticsMap(data as Record<string, any>, 'obpSessionsByLanguage'),
        obpLanguageAdoptions: readAnalyticsMap(data as Record<string, any>, 'obpLanguageAdoptions'),
        obpLanguageNames: readStringMap(data as Record<string, any>, 'obpLanguageNames'),
    };
}

function normalizeOBPLifetimeData(data: Record<string, any>): OBPDailyData {
    const lifetime = data?.lifetime || {};
    const readNumber = (field: string) => Number(lifetime[field] || data?.[`lifetime.${field}`] || 0);
    const readMapNumber = (mapName: string, key: string) => (
        Number(lifetime?.[mapName]?.[key] || data?.[`lifetime.${mapName}.${key}`] || 0)
    );

    return {
        totalOBPViews: readNumber('totalOBPViews'),
        totalOBPActionClicks: readNumber('totalOBPActionClicks'),
        totalOBPMenuClicks: readNumber('totalOBPMenuClicks'),
        totalOBPLinkClicks: readNumber('totalOBPLinkClicks'),
        totalOBPShares: readNumber('totalOBPShares'),
        obpActionClicks: {
            call: readMapNumber('obpActionClicks', 'call'),
            whatsapp: readMapNumber('obpActionClicks', 'whatsapp'),
            directions: readMapNumber('obpActionClicks', 'directions'),
            reserve: readMapNumber('obpActionClicks', 'reserve'),
            order: readMapNumber('obpActionClicks', 'order'),
        },
        obpLinkClicks: {
            google_review: readMapNumber('obpLinkClicks', 'google_review'),
            instagram: readMapNumber('obpLinkClicks', 'instagram'),
            facebook: readMapNumber('obpLinkClicks', 'facebook'),
            website: readMapNumber('obpLinkClicks', 'website'),
        },
        obpShares: {
            whatsapp: readMapNumber('obpShares', 'whatsapp'),
            copy_link: readMapNumber('obpShares', 'copy_link'),
            copy_message: readMapNumber('obpShares', 'copy_message'),
        },
        viewsByEntrySource: readAnalyticsMap(lifetime, 'viewsByEntrySource'),
        viewsBySource: readAnalyticsMap(lifetime, 'viewsBySource'),
        obpActionClicksBySource: readAnalyticsMap(lifetime, 'obpActionClicksBySource'),
        obpMenuClicksBySource: readAnalyticsMap(lifetime, 'obpMenuClicksBySource'),
        obpLinkClicksBySource: readAnalyticsMap(lifetime, 'obpLinkClicksBySource'),
        obpActionClicksByOpenHoursState: readAnalyticsMap(lifetime, 'obpActionClicksByOpenHoursState'),
        obpMenuClicksByOpenHoursState: readAnalyticsMap(lifetime, 'obpMenuClicksByOpenHoursState'),
        obpLinkClicksByOpenHoursState: readAnalyticsMap(lifetime, 'obpLinkClicksByOpenHoursState'),
        obpLanguageTrackingEnabled: Boolean(lifetime.obpLanguageTrackingEnabled || data?.['lifetime.obpLanguageTrackingEnabled']),
        obpViewsByLanguage: readAnalyticsMap(lifetime, 'obpViewsByLanguage'),
        obpSessionsByLanguage: readAnalyticsMap(lifetime, 'obpSessionsByLanguage'),
        obpLanguageAdoptions: readAnalyticsMap(lifetime, 'obpLanguageAdoptions'),
        obpLanguageNames: {
            ...readStringMap(data, 'lifetime.obpLanguageNames'),
            ...readStringMap(lifetime, 'obpLanguageNames'),
        },
    };
}

function buildOBPLifetimeUpdate(
    existingLifetime: OBPDailyData,
    daily: OBPDailyData | null,
    shouldIncrement: boolean,
): OBPDailyData {
    if (!shouldIncrement || !daily) return existingLifetime;
    return {
        totalOBPViews: (existingLifetime.totalOBPViews || 0) + (daily.totalOBPViews || 0),
        totalOBPActionClicks: (existingLifetime.totalOBPActionClicks || 0) + (daily.totalOBPActionClicks || 0),
        totalOBPMenuClicks: (existingLifetime.totalOBPMenuClicks || 0) + (daily.totalOBPMenuClicks || 0),
        totalOBPLinkClicks: (existingLifetime.totalOBPLinkClicks || 0) + (daily.totalOBPLinkClicks || 0),
        totalOBPShares: (existingLifetime.totalOBPShares || 0) + (daily.totalOBPShares || 0),
        obpActionClicks: sumNumericMaps(existingLifetime.obpActionClicks, daily.obpActionClicks),
        obpLinkClicks: sumNumericMaps(existingLifetime.obpLinkClicks, daily.obpLinkClicks),
        obpShares: sumNumericMaps(existingLifetime.obpShares, daily.obpShares),
        viewsByEntrySource: sumNumericMaps(existingLifetime.viewsByEntrySource, daily.viewsByEntrySource),
        viewsBySource: sumNumericMaps(existingLifetime.viewsBySource, daily.viewsBySource),
        obpActionClicksBySource: sumNumericMaps(existingLifetime.obpActionClicksBySource, daily.obpActionClicksBySource),
        obpMenuClicksBySource: sumNumericMaps(existingLifetime.obpMenuClicksBySource, daily.obpMenuClicksBySource),
        obpLinkClicksBySource: sumNumericMaps(existingLifetime.obpLinkClicksBySource, daily.obpLinkClicksBySource),
        obpActionClicksByOpenHoursState: sumNumericMaps(existingLifetime.obpActionClicksByOpenHoursState, daily.obpActionClicksByOpenHoursState),
        obpMenuClicksByOpenHoursState: sumNumericMaps(existingLifetime.obpMenuClicksByOpenHoursState, daily.obpMenuClicksByOpenHoursState),
        obpLinkClicksByOpenHoursState: sumNumericMaps(existingLifetime.obpLinkClicksByOpenHoursState, daily.obpLinkClicksByOpenHoursState),
        obpLanguageTrackingEnabled: Boolean(existingLifetime.obpLanguageTrackingEnabled || daily.obpLanguageTrackingEnabled),
        obpViewsByLanguage: sumNumericMaps(existingLifetime.obpViewsByLanguage, daily.obpViewsByLanguage),
        obpSessionsByLanguage: sumNumericMaps(existingLifetime.obpSessionsByLanguage, daily.obpSessionsByLanguage),
        obpLanguageAdoptions: sumNumericMaps(existingLifetime.obpLanguageAdoptions, daily.obpLanguageAdoptions),
        obpLanguageNames: {
            ...(existingLifetime.obpLanguageNames || {}),
            ...(daily.obpLanguageNames || {}),
        },
    };
}

function assignNestedPathUpdate(target: Record<string, any>, path: string, value: any): void {
    const parts = path.split('.');
    let cursor = target;
    parts.slice(0, -1).forEach((part) => {
        cursor[part] = cursor[part] || {};
        cursor = cursor[part];
    });
    cursor[parts[parts.length - 1]] = value;
}

function toDashboardDailyMetrics(data: OBPDailyData) {
    const normalized = normalizeOBPDailyData(data);
    return {
        views: normalized.totalOBPViews || 0,
        actionClicks: normalized.totalOBPActionClicks || 0,
        menuClicks: normalized.totalOBPMenuClicks || 0,
        linkClicks: normalized.totalOBPLinkClicks || 0,
        shares: normalized.totalOBPShares || 0,
        actions: normalized.obpActionClicks || emptyMetrics().obpActionClicks,
        shareMethods: normalized.obpShares || emptyMetrics().obpShares,
        links: normalized.obpLinkClicks || emptyMetrics().obpLinkClicks,
        sources: buildOBPSourceBreakdown({
            ...emptyMetrics(),
            totalOBPViews: normalized.totalOBPViews || 0,
            totalOBPActionClicks: normalized.totalOBPActionClicks || 0,
            totalOBPMenuClicks: normalized.totalOBPMenuClicks || 0,
            totalOBPLinkClicks: normalized.totalOBPLinkClicks || 0,
            viewsByEntrySource: normalized.viewsByEntrySource || {},
            viewsBySource: normalized.viewsBySource || {},
            obpActionClicksBySource: normalized.obpActionClicksBySource || {},
            obpMenuClicksBySource: normalized.obpMenuClicksBySource || {},
            obpLinkClicksBySource: normalized.obpLinkClicksBySource || {},
            obpActionClicksByOpenHoursState: normalized.obpActionClicksByOpenHoursState || {},
            obpMenuClicksByOpenHoursState: normalized.obpMenuClicksByOpenHoursState || {},
            obpLinkClicksByOpenHoursState: normalized.obpLinkClicksByOpenHoursState || {},
            obpLanguageTrackingEnabled: Boolean(normalized.obpLanguageTrackingEnabled),
            obpViewsByLanguage: normalized.obpViewsByLanguage || {},
            obpSessionsByLanguage: normalized.obpSessionsByLanguage || {},
            obpLanguageAdoptions: normalized.obpLanguageAdoptions || {},
            obpLanguageNames: normalized.obpLanguageNames || {},
        }),
        openHoursActionBreakdown: buildOBPOpenHoursBreakdown(normalized),
        topLanguages: buildOBPLanguageBreakdown(normalized),
        daysWithData: 1,
    };
}

function compactOBPAnalyticsDay(date: string, data: OBPDailyData) {
    const normalized = normalizeOBPDailyData(data);
    return {
        date,
        totalOBPViews: normalized.totalOBPViews || 0,
        totalOBPActionClicks: normalized.totalOBPActionClicks || 0,
        totalOBPMenuClicks: normalized.totalOBPMenuClicks || 0,
        totalOBPLinkClicks: normalized.totalOBPLinkClicks || 0,
        totalOBPShares: normalized.totalOBPShares || 0,
        obpActionClicks: normalized.obpActionClicks || {},
        obpLinkClicks: normalized.obpLinkClicks || {},
        obpShares: normalized.obpShares || {},
        viewsByEntrySource: normalized.viewsByEntrySource || {},
        viewsBySource: normalized.viewsBySource || {},
        obpActionClicksBySource: normalized.obpActionClicksBySource || {},
        obpMenuClicksBySource: normalized.obpMenuClicksBySource || {},
        obpLinkClicksBySource: normalized.obpLinkClicksBySource || {},
        obpActionClicksByOpenHoursState: normalized.obpActionClicksByOpenHoursState || {},
        obpMenuClicksByOpenHoursState: normalized.obpMenuClicksByOpenHoursState || {},
        obpLinkClicksByOpenHoursState: normalized.obpLinkClicksByOpenHoursState || {},
        obpLanguageTrackingEnabled: Boolean(normalized.obpLanguageTrackingEnabled),
        obpViewsByLanguage: normalized.obpViewsByLanguage || {},
        obpSessionsByLanguage: normalized.obpSessionsByLanguage || {},
        obpLanguageAdoptions: normalized.obpLanguageAdoptions || {},
        obpLanguageNames: normalized.obpLanguageNames || {},
    };
}

function buildOBPDailyMapFromRows(rows: any[], startDate: string, endDate: string): Map<string, OBPDailyData> {
    const result = new Map<string, OBPDailyData>();
    rows.forEach((row) => {
        const date = normalizeOBPAnalyticsDateKey(row?.date);
        const normalized = date ? normalizeOBPDailyMetrics(row, date) : null;
        if (!date || !normalized || date < startDate || date > endDate) return;
        result.set(date, normalized);
    });
    return result;
}

async function buildIncrementalOBPDailyMap(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    settlementDate: string,
    existingDashboard: Record<string, any> | null,
    requiredDates: string[],
): Promise<{ dailyDocsByDate: Map<string, OBPDailyData>; yesterdayData: OBPDailyData | null; source: 'incremental' | 'rebuild' }> {
    const requiredSorted = Array.from(new Set(requiredDates.filter(Boolean))).sort();
    const requiredStartDate = requiredSorted[0] || settlementDate;
    const cacheStartDate = addDaysToAnalyticsDateKey(settlementDate, -(OBP_DAILY_CACHE_DAYS - 1));
    const startDate = requiredStartDate < cacheStartDate ? requiredStartDate : cacheStartDate;
    const previousSettledDate = addDaysToAnalyticsDateKey(settlementDate, -1);
    const existingRows = Array.isArray(existingDashboard?.daily30d) ? existingDashboard.daily30d : [];
    const normalizedExistingRows = existingRows.flatMap((row: unknown) => {
        const date = normalizeOBPAnalyticsDateKey(isOBPAnalyticsRecord(row) ? row.date : null);
        const normalized = date ? normalizeOBPDailyMetrics(row, date) : null;
        return normalized ? [normalized] : [];
    });
    const firstExistingDate = normalizedExistingRows
        .map((row) => String(row.date || ''))
        .filter(Boolean)
        .sort()[0] || '';
    const canIncrement = existingDashboard?.lastSettledLocalDate === previousSettledDate
        && existingRows.length > 0
        && normalizedExistingRows.length === existingRows.length
        && firstExistingDate <= startDate;

    if (canIncrement) {
        const yesterdayRef = db.collection(DB_COLLECTIONS.ANALYTICS)
            .doc(getAnalyticsDocId.daily(tId, sId, OBP_PROJECT_ID, settlementDate));
        const yesterdaySnap = await yesterdayRef.get();
        const yesterdayData = yesterdaySnap.exists
            ? normalizeOBPDailyDocument(yesterdaySnap.data(), {
                date: settlementDate,
                docId: yesterdaySnap.id,
                sId,
                tId,
            })
            : null;
        if (yesterdaySnap.exists && !yesterdayData) throw new Error(OBP_ANALYTICS_DAILY_CONTRACT_INVALID);
        const dailyDocsByDate = buildOBPDailyMapFromRows(normalizedExistingRows, startDate, previousSettledDate);

        if (yesterdayData) {
            dailyDocsByDate.set(settlementDate, compactOBPAnalyticsDay(settlementDate, yesterdayData));
        }

        return { dailyDocsByDate, yesterdayData, source: 'incremental' };
    }

    const dailyDocsByDate = await fetchOBPDailyDocsByDate(db, tId, sId, requiredSorted);
    return {
        dailyDocsByDate,
        yesterdayData: dailyDocsByDate.get(settlementDate) || null,
        source: 'rebuild',
    };
}

export async function applyLateOBPCorrection(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    correctionDate: string,
): Promise<boolean> {
    const dashboardRef = db.collection(DB_COLLECTIONS.ANALYTICS).doc(getOBPDashboardSummaryDocId(tId, sId));
    const dailyRef = db.collection(DB_COLLECTIONS.ANALYTICS)
        .doc(getAnalyticsDocId.daily(tId, sId, OBP_PROJECT_ID, correctionDate));
    const summaryRef = db.collection(DB_COLLECTIONS.ANALYTICS)
        .doc(getAnalyticsDocId.summary(tId, sId, OBP_PROJECT_ID));
    const corrected = await db.runTransaction(async (transaction) => {
        const [dashboardSnap, dailySnap, summarySnap] = await Promise.all([
            transaction.get(dashboardRef),
            transaction.get(dailyRef),
            transaction.get(summaryRef),
        ]);
        if (!dashboardSnap.exists || !dailySnap.exists) return false;

        const dashboard = normalizeOBPDashboardIdentity(dashboardSnap.data(), tId, sId);
        if (!dashboard) throw new Error(OBP_ANALYTICS_DASHBOARD_CONTRACT_INVALID);
        if (summarySnap.exists) assertValidOBPAnalyticsSummary(summarySnap.data(), tId, sId);
        const rawRows = Array.isArray(dashboard.daily30d) ? dashboard.daily30d : [];
        const dailyRows = rawRows.flatMap((row: unknown) => {
            const date = normalizeOBPAnalyticsDateKey(isOBPAnalyticsRecord(row) ? row.date : null);
            const normalized = date ? normalizeOBPDailyMetrics(row, date) : null;
            return normalized ? [normalized] : [];
        });
        if (dailyRows.length !== rawRows.length) throw new Error(OBP_ANALYTICS_DAILY_CONTRACT_INVALID);
        const previousRow = dailyRows.find((row) => row.date === correctionDate);
        if (!previousRow) return false;
        const normalizedCurrent = normalizeOBPDailyDocument(dailySnap.data(), {
            date: correctionDate,
            docId: dailySnap.id,
            sId,
            tId,
        });
        if (!normalizedCurrent) throw new Error(OBP_ANALYTICS_DAILY_CONTRACT_INVALID);
        const currentDaily = compactOBPAnalyticsDay(correctionDate, normalizedCurrent);
        const updates: Record<string, any> = {
            lastCorrectionDate: correctionDate,
            lastCorrectedAt: FieldValue.serverTimestamp(),
        };
        let hasDelta = false;
        const addNumericDelta = (field: string, target: string) => {
            const currentValue = (currentDaily as Record<string, any>)[field] || 0;
            const previousValue = (previousRow as Record<string, any>)[field] || 0;
            const delta = Math.max(0, currentValue - previousValue);
            if (delta > 0) {
                assignNestedPathUpdate(updates, target, FieldValue.increment(delta));
                hasDelta = true;
            }
        };
        const addMapDelta = (field: string, target: string) => {
            const currentMap = readAnalyticsMap(currentDaily as Record<string, any>, field);
            const previousMap = readAnalyticsMap(previousRow as Record<string, any>, field);
            for (const [key, value] of Object.entries(currentMap)) {
                const delta = Math.max(0, value - (previousMap[key] || 0));
                if (delta > 0) {
                    assignNestedPathUpdate(updates, `${target}.${key}`, FieldValue.increment(delta));
                    hasDelta = true;
                }
            }
        };

        addNumericDelta('totalOBPViews', 'lifetime.totalOBPViews');
        addNumericDelta('totalOBPActionClicks', 'lifetime.totalOBPActionClicks');
        addNumericDelta('totalOBPMenuClicks', 'lifetime.totalOBPMenuClicks');
        addNumericDelta('totalOBPLinkClicks', 'lifetime.totalOBPLinkClicks');
        addNumericDelta('totalOBPShares', 'lifetime.totalOBPShares');
        for (const field of [
            'obpActionClicks', 'obpLinkClicks', 'obpShares', 'viewsByEntrySource', 'viewsBySource',
            'obpActionClicksBySource', 'obpMenuClicksBySource', 'obpLinkClicksBySource',
            'obpActionClicksByOpenHoursState', 'obpMenuClicksByOpenHoursState', 'obpLinkClicksByOpenHoursState',
            'obpViewsByLanguage', 'obpSessionsByLanguage', 'obpLanguageAdoptions',
        ]) addMapDelta(field, `lifetime.${field}`);
        if (currentDaily.obpLanguageTrackingEnabled) {
            assignNestedPathUpdate(updates, 'lifetime.obpLanguageTrackingEnabled', true);
            Object.entries(currentDaily.obpLanguageNames || {}).forEach(([language, name]) => {
                assignNestedPathUpdate(updates, `lifetime.obpLanguageNames.${language}`, name);
            });
            hasDelta = true;
        }
        if (!hasDelta) return false;

        const updatedRows = dailyRows.map((row) => row.date === correctionDate ? currentDaily : row);
        transaction.set(summaryRef, updates, { merge: true });
        transaction.set(dashboardRef, {
            daily30d: updatedRows,
            lateCorrection: {
                lastCorrectedLocalDate: correctionDate,
                correctedAt: FieldValue.serverTimestamp(),
            },
            modifiedOn: FieldValue.serverTimestamp(),
        }, { merge: true });
        return true;
    });
    if (!corrected) return false;

    appLogger.warn('[OBPAnalyticsSettlement] Late daily correction applied', {
        tId,
        sId,
        correctionDate,
    });

    return true;
}

/**
 * Read OBP daily docs for a date range and aggregate
 */
async function fetchOBPDailyDocsByDate(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    dates: string[],
): Promise<Map<string, OBPDailyData>> {
    const uniqueDates = Array.from(new Set(dates.filter(Boolean))).sort();
    const result = new Map<string, OBPDailyData>();

    if (uniqueDates.length === 0) {
        return result;
    }

    const prefix = getAnalyticsDocId.dailyPrefix(tId, sId, OBP_PROJECT_ID);
    const startDate = uniqueDates[0];
    const endDate = uniqueDates[uniqueDates.length - 1];
    const allowedDates = new Set(uniqueDates);

    const snapshot = await db.collection(DB_COLLECTIONS.ANALYTICS)
        .where('__name__', '>=', `${prefix}${startDate}`)
        .where('__name__', '<=', `${prefix}${endDate}`)
        .get();

    snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const date = normalizeOBPAnalyticsDateKey(data.date ?? data.localDate ?? doc.id.slice(prefix.length));
        if (!date || !allowedDates.has(date)) return;
        const normalized = normalizeOBPDailyDocument(data, { date, docId: doc.id, sId, tId });
        if (!normalized) throw new Error(OBP_ANALYTICS_DAILY_CONTRACT_INVALID);
        result.set(date, normalized);
    });

    return result;
}

function aggregateOBPDailyDocsFromMap(
    docsByDate: Map<string, OBPDailyData>,
    dates: string[],
): OBPAggregatedMetrics {
    const metrics = emptyMetrics();

    for (const date of dates) {
        const rawData = docsByDate.get(date);
        if (!rawData) continue;
        const data = normalizeOBPDailyData(rawData);

        metrics.totalOBPViews += data.totalOBPViews || 0;
        metrics.totalOBPActionClicks += data.totalOBPActionClicks || 0;
        metrics.totalOBPMenuClicks += data.totalOBPMenuClicks || 0;
        metrics.totalOBPLinkClicks += data.totalOBPLinkClicks || 0;
        metrics.totalOBPShares += data.totalOBPShares || 0;
        metrics.obpActionClicks.call += data.obpActionClicks?.call || 0;
        metrics.obpActionClicks.whatsapp += data.obpActionClicks?.whatsapp || 0;
        metrics.obpActionClicks.directions += data.obpActionClicks?.directions || 0;
        metrics.obpActionClicks.reserve += data.obpActionClicks?.reserve || 0;
        metrics.obpActionClicks.order += data.obpActionClicks?.order || 0;
        metrics.obpLinkClicks.google_review += data.obpLinkClicks?.google_review || 0;
        metrics.obpLinkClicks.instagram += data.obpLinkClicks?.instagram || 0;
        metrics.obpLinkClicks.facebook += data.obpLinkClicks?.facebook || 0;
        metrics.obpLinkClicks.twitter += data.obpLinkClicks?.twitter || 0;
        metrics.obpLinkClicks.linkedin += data.obpLinkClicks?.linkedin || 0;
        metrics.obpLinkClicks.youtube += data.obpLinkClicks?.youtube || 0;
        metrics.obpLinkClicks.whatsapp += data.obpLinkClicks?.whatsapp || 0;
        metrics.obpLinkClicks.website += data.obpLinkClicks?.website || 0;
        metrics.obpShares.whatsapp += data.obpShares?.whatsapp || 0;
        metrics.obpShares.copy_link += data.obpShares?.copy_link || 0;
        metrics.obpShares.copy_message += data.obpShares?.copy_message || 0;
        mergeNumericMap(metrics.viewsByEntrySource, data.viewsByEntrySource || {});
        mergeNumericMap(metrics.viewsBySource, data.viewsBySource || {});
        mergeNumericMap(metrics.obpActionClicksBySource, data.obpActionClicksBySource || {});
        mergeNumericMap(metrics.obpMenuClicksBySource, data.obpMenuClicksBySource || {});
        mergeNumericMap(metrics.obpLinkClicksBySource, data.obpLinkClicksBySource || {});
        mergeNumericMap(metrics.obpActionClicksByOpenHoursState, data.obpActionClicksByOpenHoursState || {});
        mergeNumericMap(metrics.obpMenuClicksByOpenHoursState, data.obpMenuClicksByOpenHoursState || {});
        mergeNumericMap(metrics.obpLinkClicksByOpenHoursState, data.obpLinkClicksByOpenHoursState || {});
        metrics.obpLanguageTrackingEnabled = Boolean(metrics.obpLanguageTrackingEnabled || data.obpLanguageTrackingEnabled);
        mergeNumericMap(metrics.obpViewsByLanguage, data.obpViewsByLanguage || {});
        mergeNumericMap(metrics.obpSessionsByLanguage, data.obpSessionsByLanguage || {});
        mergeNumericMap(metrics.obpLanguageAdoptions, data.obpLanguageAdoptions || {});
        Object.assign(metrics.obpLanguageNames, data.obpLanguageNames || {});
        metrics.daysWithData++;
    }

    return metrics;
}

// ================================================================
// MAIN AGGREGATION — Per Store
// ================================================================

export async function aggregateOBPAnalyticsForStore(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    now: Date = new Date(),
    timeZone?: string,
    businessDayEndTime?: string,
): Promise<boolean> {
    const localTodayStr = getBusinessAnalyticsDateKey(now, timeZone, businessDayEndTime);
    const yesterdayStr = addDaysToAnalyticsDateKey(localTodayStr, -1);
    return aggregateOBPAnalyticsForStoreDate(db, tId, sId, yesterdayStr);
}

export async function aggregateOBPAnalyticsForStoreDate(
    db: FirebaseFirestore.Firestore,
    tId: string,
    sId: string,
    settlementDate: string,
): Promise<boolean> {
    const yesterdayStr = settlementDate;
    const yesterday = parseAnalyticsDateKey(yesterdayStr);

    // ── 1. Current week aggregation → weekly doc ──
    const { weekStr, weekStart, weekEnd } = getWeekDateRange(yesterday);
    const weekDates = getDateRange(weekStart, weekEnd);

    // ── 2. Previous week (for comparison) ──
    const prevWeekEnd = new Date(weekStart);
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
    const { weekStr: prevWeekStr, weekStart: prevWeekStart } = getWeekDateRange(prevWeekEnd);
    const prevWeekDates = getDateRange(prevWeekStart, prevWeekEnd);

    // ── 3. Current month aggregation → monthly doc ──
    const { monthStr, firstDay, lastDay } = getMonthDateRange(yesterday);
    const monthDates = getDateRange(firstDay, yesterday); // Only up to yesterday

    const requiredDates = Array.from(new Set([...weekDates, ...prevWeekDates, ...monthDates, yesterdayStr]));
    const summaryDocId = getAnalyticsDocId.summary(tId, sId, OBP_PROJECT_ID);
    const summaryRef = db.collection(DB_COLLECTIONS.ANALYTICS).doc(summaryDocId);
    const dashboardRef = db.collection(DB_COLLECTIONS.ANALYTICS).doc(getOBPDashboardSummaryDocId(tId, sId));
    let existingDashboardSnap = await dashboardRef.get();
    let existingDashboard = existingDashboardSnap.exists
        ? normalizeOBPDashboardIdentity(existingDashboardSnap.data(), tId, sId)
        : null;
    if (existingDashboardSnap.exists && !existingDashboard) {
        throw new Error(OBP_ANALYTICS_DASHBOARD_CONTRACT_INVALID);
    }
    const correctionDate = addDaysToAnalyticsDateKey(yesterdayStr, -1);
    const correctionApplied = await applyLateOBPCorrection(db, tId, sId, correctionDate);
    if (correctionApplied) {
        existingDashboardSnap = await dashboardRef.get();
        existingDashboard = existingDashboardSnap.exists
            ? normalizeOBPDashboardIdentity(existingDashboardSnap.data(), tId, sId)
            : null;
        if (existingDashboardSnap.exists && !existingDashboard) {
            throw new Error(OBP_ANALYTICS_DASHBOARD_CONTRACT_INVALID);
        }
    }

    // COST OPTIMIZATION: steady-state OBP aggregation reads the existing compact
    // dashboard cache plus yesterday's doc. The wider daily range query is only
    // used for first deploy, cache gaps, or catch-up rebuilds.
    const { dailyDocsByDate, yesterdayData, source } = await buildIncrementalOBPDailyMap(
        db,
        tId,
        sId,
        yesterdayStr,
        existingDashboard,
        requiredDates,
    );
    if (source === 'rebuild') {
        appLogger.warn('[OBPAnalyticsSettlement] Dashboard summary rebuilt from daily docs', {
            tId,
            sId,
            settlementDate: yesterdayStr,
            daysLoaded: dailyDocsByDate.size,
        });
    }
    const currentWeekMetrics = aggregateOBPDailyDocsFromMap(dailyDocsByDate, weekDates);
    const prevWeekMetrics = aggregateOBPDailyDocsFromMap(dailyDocsByDate, prevWeekDates);
    const currentMonthMetrics = aggregateOBPDailyDocsFromMap(dailyDocsByDate, monthDates);

    if (currentWeekMetrics.daysWithData > 0) {
        const weeklyDocId = getAnalyticsDocId.weekly(tId, sId, OBP_PROJECT_ID, yesterday);
        await db.collection(DB_COLLECTIONS.ANALYTICS).doc(weeklyDocId).set({
            ...currentWeekMetrics,
            weekStr,
            weekStart: weekStart.toISOString().split('T')[0],
            weekEnd: weekEnd.toISOString().split('T')[0],
            modifiedOn: FieldValue.serverTimestamp(),
        }, { merge: true });
    }

    if (currentMonthMetrics.daysWithData > 0) {
        const monthlyDocId = getAnalyticsDocId.monthly(tId, sId, OBP_PROJECT_ID, yesterday);
        await db.collection(DB_COLLECTIONS.ANALYTICS).doc(monthlyDocId).set({
            ...currentMonthMetrics,
            monthStr,
            monthStart: firstDay.toISOString().split('T')[0],
            monthEnd: lastDay.toISOString().split('T')[0],
            modifiedOn: FieldValue.serverTimestamp(),
        }, { merge: true });
    }

    // Calculate week-over-week change
    let viewsChange: number | null = null;
    if (prevWeekMetrics.totalOBPViews > 0 && currentWeekMetrics.totalOBPViews > 0) {
        viewsChange = Math.round(
            ((currentWeekMetrics.totalOBPViews - prevWeekMetrics.totalOBPViews)
                / prevWeekMetrics.totalOBPViews) * 100
        );
    }

    const normalizedYesterdayData = yesterdayData ? normalizeOBPDailyData(yesterdayData) : null;
    const summaryState = await db.runTransaction(async (transaction) => {
        const summarySnap = await transaction.get(summaryRef);
        const rawExistingData = summarySnap.exists ? summarySnap.data() : null;
        if (summarySnap.exists) assertValidOBPAnalyticsSummary(rawExistingData, tId, sId);
        const existingData = rawExistingData || {};
        const existingLifetime = normalizeOBPLifetimeData(existingData);
        const lastProcessedDate = existingData.lastProcessedDate
            ? normalizeOBPAnalyticsDateKey(existingData.lastProcessedDate) || ''
            : '';
        const hasDateLedger = isOBPAnalyticsRecord(existingData.processedLifetimeDates);
        const processedLifetimeDates: Record<string, true> = hasDateLedger
            ? Object.fromEntries(Object.keys(existingData.processedLifetimeDates).map((date) => [date, true]))
            : {};
        const alreadySettled = processedLifetimeDates[yesterdayStr] === true
            || !hasDateLedger && lastProcessedDate >= yesterdayStr;
        const shouldIncrementLifetime = Boolean(normalizedYesterdayData) && !alreadySettled;
        const lifetimeUpdate = buildOBPLifetimeUpdate(
            existingLifetime,
            normalizedYesterdayData,
            shouldIncrementLifetime,
        );
        if (shouldIncrementLifetime) processedLifetimeDates[yesterdayStr] = true;
        const boundedProcessedLifetimeDates = Object.fromEntries(
            Object.entries(processedLifetimeDates)
                .sort(([left], [right]) => right.localeCompare(left))
                .slice(0, OBP_LIFETIME_DATE_LEDGER_LIMIT),
        );
        const hasAnyData = currentWeekMetrics.daysWithData > 0
            || currentMonthMetrics.daysWithData > 0
            || (lifetimeUpdate.totalOBPViews || 0) > 0;
        if (!hasAnyData) return null;

        const firstDataDate = existingData.firstDataDate || yesterdayStr;
        transaction.set(summaryRef, {
            analyticsScope: 'customer',
            firstDataDate,
            grain: 'summary',
            lastProcessedDate: lastProcessedDate > yesterdayStr ? lastProcessedDate : yesterdayStr,
            lifetime: lifetimeUpdate,
            modifiedOn: FieldValue.serverTimestamp(),
            monthly: { ...currentMonthMetrics, monthStr },
            previousWeek: {
                totalOBPViews: prevWeekMetrics.totalOBPViews,
                totalOBPActionClicks: prevWeekMetrics.totalOBPActionClicks,
                weekStr: prevWeekStr,
            },
            processedLifetimeDates: boundedProcessedLifetimeDates,
            projectId: OBP_PROJECT_ID,
            sId,
            surface: 'obp',
            tId,
            weekly: { ...currentWeekMetrics, weekStr, viewsChange },
        }, { merge: true });
        return { firstDataDate, lifetimeUpdate };
    });
    if (!summaryState) return false;
    const { firstDataDate, lifetimeUpdate } = summaryState;

    const yesterdayMetrics = yesterdayData ? toDashboardDailyMetrics(yesterdayData) : null;
    const wtd = currentWeekMetrics.daysWithData > 0 ? toDashboardMetrics(currentWeekMetrics) : null;
    const mtd = currentMonthMetrics.daysWithData > 0
        ? { ...toDashboardMetrics(currentMonthMetrics), monthName: monthStr }
        : null;
    const overall = {
        lifetimeViews: lifetimeUpdate.totalOBPViews || 0,
        lifetimeActionClicks: lifetimeUpdate.totalOBPActionClicks || 0,
        lifetimeMenuClicks: lifetimeUpdate.totalOBPMenuClicks || 0,
        lifetimeLinkClicks: lifetimeUpdate.totalOBPLinkClicks || 0,
        lifetimeShares: lifetimeUpdate.totalOBPShares || 0,
        lifetimeActions: lifetimeUpdate.obpActionClicks || emptyMetrics().obpActionClicks,
        lifetimeShareMethods: lifetimeUpdate.obpShares || emptyMetrics().obpShares,
        lifetimeLinks: lifetimeUpdate.obpLinkClicks || emptyMetrics().obpLinkClicks,
        lifetimeSources: buildOBPSourceBreakdown({
            ...emptyMetrics(),
            totalOBPViews: lifetimeUpdate.totalOBPViews || 0,
            totalOBPActionClicks: lifetimeUpdate.totalOBPActionClicks || 0,
            totalOBPMenuClicks: lifetimeUpdate.totalOBPMenuClicks || 0,
            totalOBPLinkClicks: lifetimeUpdate.totalOBPLinkClicks || 0,
            viewsByEntrySource: lifetimeUpdate.viewsByEntrySource || {},
            viewsBySource: lifetimeUpdate.viewsBySource || {},
            obpActionClicksBySource: lifetimeUpdate.obpActionClicksBySource || {},
            obpMenuClicksBySource: lifetimeUpdate.obpMenuClicksBySource || {},
            obpLinkClicksBySource: lifetimeUpdate.obpLinkClicksBySource || {},
        }),
        lifetimeOpenHoursActionBreakdown: buildOBPOpenHoursBreakdown(lifetimeUpdate),
        lifetimeLanguages: buildOBPLanguageBreakdown({
            obpLanguageTrackingEnabled: Boolean(lifetimeUpdate.obpLanguageTrackingEnabled),
            obpViewsByLanguage: lifetimeUpdate.obpViewsByLanguage || {},
            obpSessionsByLanguage: lifetimeUpdate.obpSessionsByLanguage || {},
            obpLanguageAdoptions: lifetimeUpdate.obpLanguageAdoptions || {},
            obpLanguageNames: lifetimeUpdate.obpLanguageNames || {},
        }),
        firstDataDate,
        lastUpdated: FieldValue.serverTimestamp(),
    };
    let status: 'working' | 'low_activity' | 'no_data' = 'no_data';
    let statusMessage = 'No visitors yet. Share your official link to start getting views.';
    if (wtd) {
        if (wtd.views >= 3) {
            status = 'working';
            statusMessage = 'Your official page is getting visitors!';
        } else if (wtd.views > 0) {
            status = 'low_activity';
            statusMessage = 'Some visitors this week. Share your link more to grow.';
        }
    } else if (yesterdayMetrics && yesterdayMetrics.views > 0) {
        status = 'low_activity';
        statusMessage = 'Activity detected yesterday.';
    }

    const dashboardPayload = {
        tId,
        sId,
        projectId: OBP_PROJECT_ID,
        kind: 'obpDashboardSummary',
        buildSource: source,
        generatedForLocalDate: addDaysToAnalyticsDateKey(yesterdayStr, 1),
        lastSettledLocalDate: yesterdayStr,
        overview: {
            status,
            statusMessage,
            yesterday: yesterdayMetrics,
            wtd,
            mtd,
            historicalWeeks: currentWeekMetrics.daysWithData > 0 ? [{
                weekStart: weekStart.toISOString().split('T')[0],
                weekEnd: weekEnd.toISOString().split('T')[0],
                weekLabel: weekStr,
                views: currentWeekMetrics.totalOBPViews,
                actionClicks: currentWeekMetrics.totalOBPActionClicks,
                isCurrentWeek: true,
            }] : [],
            viewsChange,
        },
        overall,
        daily30d: Array.from(dailyDocsByDate.entries())
            .filter(([date]) => date >= addDaysToAnalyticsDateKey(yesterdayStr, -(OBP_DAILY_CACHE_DAYS - 1)) && date <= yesterdayStr)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, data]) => compactOBPAnalyticsDay(date, data)),
        modifiedOn: FieldValue.serverTimestamp(),
    };
    await db.runTransaction(async (transaction) => {
        const latestDashboardSnap = await transaction.get(dashboardRef);
        if (latestDashboardSnap.exists) {
            const latestDashboard = normalizeOBPDashboardIdentity(latestDashboardSnap.data(), tId, sId);
            if (!latestDashboard) throw new Error(OBP_ANALYTICS_DASHBOARD_CONTRACT_INVALID);
            const latestSettledDate = normalizeOBPAnalyticsDateKey(latestDashboard.lastSettledLocalDate);
            if (!latestSettledDate) throw new Error(OBP_ANALYTICS_DASHBOARD_CONTRACT_INVALID);
            if (latestSettledDate > yesterdayStr) return;
        }
        transaction.set(dashboardRef, dashboardPayload, { merge: true });
    });

    return true;
}

// ================================================================
// PUBLIC API — Called by nightly scheduler
// ================================================================

/**
 * Aggregate OBP analytics for all stores.
 * Produces weekly doc, monthly doc, and summary doc per store.
 * Same document pattern as digital menu analytics.
 */
export async function aggregateOBPAnalyticsForAllStores(): Promise<{
    storesProcessed: number;
    storesWithData: number;
    errors: number;
}> {
    const db = firestoreAdmin;
    const result = { storesProcessed: 0, storesWithData: 0, errors: 0 };

    try {
        const summaryDoc = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc('storesSummary')
            .get();

        if (!summaryDoc.exists) {
            logger.warn('[OBP Aggregation] No storesSummary found');
            return result;
        }

        const storesMap = parsePlatformStoreSummary(summaryDoc.data());
        const storeEntries = Object.entries(storesMap);

        for (const [sId, storeInfo] of storeEntries) {
            if (storeInfo.active === false) continue;

            const tId = storeInfo.tId;
            const businessType = typeof storeInfo.businessType === 'string' ? storeInfo.businessType : undefined;
            const businessCategory = typeof storeInfo.businessCategory === 'string' ? storeInfo.businessCategory : undefined;
            const configuredDayEnd = typeof storeInfo.businessDayEndTime === 'string' ? storeInfo.businessDayEndTime : undefined;
            const timeZone = typeof storeInfo.timeZone === 'string' ? storeInfo.timeZone : undefined;
            const businessDayEndTime = resolveBusinessDayEndTime(businessType, configuredDayEnd, businessCategory);
            result.storesProcessed++;

            try {
                const hadData = await aggregateOBPAnalyticsForStore(db, tId, sId, new Date(), timeZone, businessDayEndTime);
                if (hadData) result.storesWithData++;
            } catch (e: any) {
                appLogger.error('[OBPAnalyticsSettlement] Store aggregation failed', e, {
                    tId,
                    sId,
                    timeZone: timeZone || 'UTC',
                    businessDayEndTime,
                });
                result.errors++;
            }
        }
    } catch (e: any) {
        appLogger.error('[OBPAnalyticsSettlement] All-store aggregation failed', e);
    }

    return result;
}
