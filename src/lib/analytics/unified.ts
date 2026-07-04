/**
 * Unified Analytics Tracking System
 * Handles both Firebase Analytics and Google Analytics 4 tracking
 * 
 * COST OPTIMIZATION:
 * - Client-side debouncing prevents duplicate events
 * - Rate limiting prevents abuse (max 20 events/minute)
 * - Session-based deduplication for menu views
 */
import { trackAnalyticsEvent } from '@database/analytics';
import { getBusinessAnalyticsDateKey } from '@lib/analytics/businessDay';
import { getAnalyticsHourKey } from '@lib/analytics/dateKey';
import {
  getAnalyticsTrackingContext,
  getBoundedAnalyticsStringContext,
  logAnalyticsFailure,
} from './analyticsDiagnostics';
import { getDeviceInfo } from './device';
import { getLocationInfo } from './geo';
import { getSessionId } from './session';

// ================================================================
// CLIENT-SIDE RATE LIMITING & DEBOUNCING
// ================================================================

/**
 * Rate limiting configuration
 * Prevents abuse and reduces Firebase costs
 */
const RATE_LIMIT = {
  MAX_EVENTS_PER_MINUTE: 20,      // Max events per minute per session
  DEBOUNCE_MS: 1000,               // Debounce window for same event type
  MENU_VIEW_COOLDOWN_MS: 30000,    // 30 second cooldown for menu views (same project)
};

// Track recent events for rate limiting
const recentEvents: Map<string, number[]> = new Map();
const lastEventTime: Map<string, number> = new Map();
const menuViewTracker: Map<string, number> = new Map();
const SESSION_MILESTONE_STORAGE_PREFIX = 'menulist_analytics_session_milestones_v1';
const SESSION_SOURCE_STORAGE_PREFIX = 'menulist_analytics_session_source_v1';
const SESSION_FILTER_STORAGE_PREFIX = 'menulist_analytics_active_filter_v1';
const ALLOWED_ATTRIBUTE_FILTERS = new Set(['popular', 'veg', 'nonveg', 'forMen', 'forWomen']);

type SessionMilestoneState = {
  menuSession?: boolean;
  engaged?: boolean;
  intent?: boolean;
  action?: boolean;
  itemIds?: string[];
  viewedItemIds?: string[];
  languageSessions?: string[];
  languageAdoptions?: string[];
};

type EntrySource =
  | 'copy_link'
  | 'qr'
  | 'whatsapp'
  | 'instagram'
  | 'facebook'
  | 'google'
  | 'obp'
  | 'menu_kit'
  | 'native_share'
  | 'shortcut'
  | 'direct'
  | 'other';

type ActiveAttributeFilterState = {
  filter: string;
  label?: string;
  selectedAt?: number;
};

const getAnalyticsSessionStorageContext = (
  key: string | null,
  value?: unknown,
  includeValue = false,
) => ({
  ...getBoundedAnalyticsStringContext('storageKey', key),
  ...(includeValue ? getBoundedAnalyticsStringContext('storedValue', value) : {}),
});

const getSessionMilestoneStateContext = (state?: SessionMilestoneState | null) => ({
  hasMenuSession: Boolean(state?.menuSession),
  hasEngagedSession: Boolean(state?.engaged),
  hasIntentSession: Boolean(state?.intent),
  hasActionSession: Boolean(state?.action),
  itemIdCount: Array.isArray(state?.itemIds) ? state.itemIds.length : 0,
  viewedItemIdCount: Array.isArray(state?.viewedItemIds) ? state.viewedItemIds.length : 0,
  languageSessionCount: Array.isArray(state?.languageSessions) ? state.languageSessions.length : 0,
  languageAdoptionCount: Array.isArray(state?.languageAdoptions) ? state.languageAdoptions.length : 0,
});

/**
 * Check if event should be rate limited
 * Returns true if event should be BLOCKED
 */
const shouldRateLimit = (eventKey: string): boolean => {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // Get or initialize event timestamps
  let timestamps = recentEvents.get(eventKey) || [];

  // Remove timestamps older than 1 minute
  timestamps = timestamps.filter(t => t > oneMinuteAgo);

  // Check if over limit
  if (timestamps.length >= RATE_LIMIT.MAX_EVENTS_PER_MINUTE) {
    logAnalyticsFailure('analytics_rate_limit_exceeded', undefined, {
      ...getBoundedAnalyticsStringContext('eventKey', eventKey),
      eventCount: timestamps.length,
    });
    return true;
  }

  // Add current timestamp
  timestamps.push(now);
  recentEvents.set(eventKey, timestamps);

  return false;
};

/**
 * Check if event should be debounced (same event type fired too quickly)
 * Returns true if event should be BLOCKED
 */
const shouldDebounce = (eventType: string, projectId?: string): boolean => {
  const key = `${eventType}_${projectId || 'global'}`;
  const now = Date.now();
  const lastTime = lastEventTime.get(key) || 0;

  if (now - lastTime < RATE_LIMIT.DEBOUNCE_MS) {
    return true;
  }

  lastEventTime.set(key, now);
  return false;
};

/**
 * Check if menu view should be tracked (prevent spam on page refresh)
 * Returns true if menu view should be BLOCKED
 */
const shouldBlockMenuView = (projectId?: string): boolean => {
  if (!projectId) return false;

  const now = Date.now();
  const lastViewTime = menuViewTracker.get(projectId) || 0;

  if (now - lastViewTime < RATE_LIMIT.MENU_VIEW_COOLDOWN_MS) {
    return true;
  }

  menuViewTracker.set(projectId, now);
  return false;
};

const getSessionMilestoneKey = (data: TrackingData, localDate: string, sessionId: string): string | null => {
  if (!data.tenantId || !data.storeId || !data.projectId || !sessionId) return null;
  return [
    SESSION_MILESTONE_STORAGE_PREFIX,
    String(data.tenantId),
    String(data.storeId),
    String(data.projectId),
    localDate,
    sessionId,
  ].join('|');
};

const getSessionSourceKey = (data: TrackingData, localDate: string, sessionId: string): string | null => {
  if (!data.tenantId || !data.storeId || !data.projectId || !sessionId) return null;
  return [
    SESSION_SOURCE_STORAGE_PREFIX,
    String(data.tenantId),
    String(data.storeId),
    String(data.projectId),
    localDate,
    sessionId,
  ].join('|');
};

const getSessionFilterKey = (data: Partial<TrackingData>, localDate: string, sessionId: string): string | null => {
  if (!data.tenantId || !data.storeId || !data.projectId || !sessionId) return null;
  return [
    SESSION_FILTER_STORAGE_PREFIX,
    String(data.tenantId),
    String(data.storeId),
    String(data.projectId),
    localDate,
    sessionId,
  ].join('|');
};

const readSessionMilestoneState = (key: string | null): SessionMilestoneState | null => {
  if (!key || typeof window === 'undefined') return null;
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    logAnalyticsFailure('analytics_session_milestones_read_failed', error, {
      ...getAnalyticsSessionStorageContext(key, raw, true),
    });
    return null;
  }
};

const writeSessionMilestoneState = (key: string | null, state: SessionMilestoneState | null): void => {
  if (!key || !state || typeof window === 'undefined') return;
  let serializedState = '';
  try {
    serializedState = JSON.stringify({
      ...state,
      itemIds: Array.from(new Set(state.itemIds || [])).slice(-10),
      viewedItemIds: Array.from(new Set(state.viewedItemIds || [])).slice(-20),
      languageSessions: Array.from(new Set(state.languageSessions || [])).slice(-8),
      languageAdoptions: Array.from(new Set(state.languageAdoptions || [])).slice(-8),
    });
    window.sessionStorage.setItem(key, serializedState);
  } catch (error) {
    logAnalyticsFailure('analytics_session_milestones_write_failed', error, {
      ...getAnalyticsSessionStorageContext(key),
      ...getSessionMilestoneStateContext(state),
      ...getBoundedAnalyticsStringContext('serializedState', serializedState),
    });
  }
};

const readSessionEntrySource = (key: string | null): EntrySource | null => {
  if (!key || typeof window === 'undefined') return null;
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw)?.entrySource || null : null;
  } catch (error) {
    logAnalyticsFailure('analytics_session_source_read_failed', error, {
      ...getAnalyticsSessionStorageContext(key, raw, true),
    });
    return null;
  }
};

const writeSessionEntrySource = (key: string | null, entrySource: EntrySource | null): void => {
  if (!key || !entrySource || typeof window === 'undefined') return;
  let serializedSource = '';
  try {
    serializedSource = JSON.stringify({ entrySource });
    window.sessionStorage.setItem(key, serializedSource);
  } catch (error) {
    logAnalyticsFailure('analytics_session_source_write_failed', error, {
      ...getAnalyticsSessionStorageContext(key),
      ...getBoundedAnalyticsStringContext('entrySource', entrySource),
      ...getBoundedAnalyticsStringContext('serializedSource', serializedSource),
    });
  }
};

const readActiveAttributeFilter = (key: string | null): ActiveAttributeFilterState | null => {
  if (!key || typeof window === 'undefined') return null;
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    const filter = String(parsed?.filter || '').trim();
    return ALLOWED_ATTRIBUTE_FILTERS.has(filter) ? {
      filter,
      label: parsed?.label,
      selectedAt: parsed?.selectedAt,
    } : null;
  } catch (error) {
    logAnalyticsFailure('analytics_active_filter_read_failed', error, {
      ...getAnalyticsSessionStorageContext(key, raw, true),
    });
    return null;
  }
};

const writeActiveAttributeFilter = (
  key: string | null,
  filter: string | null,
  label?: string,
): void => {
  if (!key || typeof window === 'undefined') return;
  let serializedFilter = '';
  let operation: 'remove' | 'write' = 'write';
  try {
    if (!filter || !ALLOWED_ATTRIBUTE_FILTERS.has(filter)) {
      operation = 'remove';
      window.sessionStorage.removeItem(key);
      return;
    }

    serializedFilter = JSON.stringify({
      filter,
      label: label || filter,
      selectedAt: Date.now(),
    });
    window.sessionStorage.setItem(key, serializedFilter);
  } catch (error) {
    logAnalyticsFailure('analytics_active_filter_write_failed', error, {
      operation,
      ...getAnalyticsSessionStorageContext(key),
      ...getBoundedAnalyticsStringContext('filter', filter),
      ...getBoundedAnalyticsStringContext('filterLabel', label),
      ...getBoundedAnalyticsStringContext('serializedFilter', serializedFilter),
    });
  }
};

const addAttributeFilterContextCounters = (
  updateData: Record<string, any>,
  filterState: ActiveAttributeFilterState | null,
  eventName: TrackingEvent,
) => {
  if (!filterState?.filter) return;

  const filter = filterState.filter;
  updateData[`attributeFilterInteractions.${filter}`] = 1;
  updateData[`attributeFilterNames.${filter}`] = filterState.label || filter;

  switch (eventName) {
    case TrackingEvent.ITEM_VIEW:
      updateData[`attributeFilterItemViews.${filter}`] = 1;
      break;
    case TrackingEvent.ITEM_CLICK:
    case TrackingEvent.DECISION_BLOCK_CLICK:
      updateData[`attributeFilterItemTaps.${filter}`] = 1;
      break;
    case TrackingEvent.SEARCH:
      updateData[`attributeFilterSearches.${filter}`] = 1;
      break;
    case TrackingEvent.UNAVAILABLE_ITEM_ATTEMPT:
      updateData[`attributeFilterUnavailableTaps.${filter}`] = 1;
      break;
    case TrackingEvent.MENU_ACTION_CLICK:
      updateData[`attributeFilterActionClicks.${filter}`] = 1;
      break;
  }
};

const normalizeEntrySource = (value?: string | null): EntrySource | null => {
  const source = String(value || '').trim().toLowerCase();
  if (!source) return null;
  if (source.includes('copy')) return 'copy_link';
  if (source.includes('qr') || source.includes('table_tent') || source.includes('tent')) return 'qr';
  if (source.includes('whatsapp') || source === 'wa') return 'whatsapp';
  if (source.includes('instagram') || source === 'ig') return 'instagram';
  if (source.includes('facebook') || source === 'fb') return 'facebook';
  if (source.includes('google') || source === 'gmb') return 'google';
  if (source.includes('obp') || source.includes('official_business_page')) return 'obp';
  if (source.includes('menu_kit')) return 'menu_kit';
  if (source.includes('native_share') || source === 'share') return 'native_share';
  if (source.includes('shortcut')) return 'shortcut';
  if (source === 'direct' || source === 'open') return 'direct';
  return 'other';
};

const normalizeOpenHoursState = (value?: string | null): 'open' | 'closed' | 'unknown' => {
  return value === 'open' || value === 'closed' ? value : 'unknown';
};

const inferEntrySource = (data: TrackingData): EntrySource => {
  const explicit = normalizeEntrySource(data.entrySource);
  if (explicit) return explicit;

  if (typeof window === 'undefined') return 'direct';

  try {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = normalizeEntrySource(params.get('entry_source'));
    if (fromQuery) return fromQuery;

    const referrer = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : '';
    if (referrer.includes('google.')) return 'google';
    if (referrer.includes('instagram.')) return 'instagram';
    if (referrer.includes('facebook.') || referrer.includes('fb.')) return 'facebook';
    if (referrer.includes('whatsapp.')) return 'whatsapp';
  } catch {
    return 'direct';
  }

  return 'direct';
};

const normalizeMenuLanguage = (value?: string | null): string | null => {
  const language = String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 16);
  return language || null;
};

const normalizeMenuLanguageName = (code: string, value?: string | null): string => {
  const label = String(value || '').trim().slice(0, 48);
  return label || code.toUpperCase();
};

const normalizeSearchTermForAnalytics = (value?: string | null): string | null => {
  const searchTerm = String(value || '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 64);
  if (searchTerm.length < 2) return null;
  return searchTerm;
};

const addMenuLanguageCounters = (
  updateData: Record<string, any>,
  state: SessionMilestoneState | null,
  data: TrackingData,
  mode: 'view' | 'adoption',
): boolean => {
  const language = normalizeMenuLanguage(data.menuLanguage || data.language);
  if (!language) return false;

  const label = normalizeMenuLanguageName(language, data.menuLanguageName || data.languageName);
  updateData.languageTrackingEnabled = true;
  updateData[`languageNames.${language}`] = label;

  if (mode === 'view') {
    updateData[`menuViewsByLanguage.${language}`] = 1;
    if (state) {
      const languages = new Set(state.languageSessions || []);
      if (!languages.has(language)) {
        languages.add(language);
        state.languageSessions = Array.from(languages).slice(-8);
        updateData[`menuSessionsByLanguage.${language}`] = 1;
      }
    }
    return true;
  }

  if (!state) return false;
  const adoptedLanguages = new Set(state.languageAdoptions || []);
  if (adoptedLanguages.has(language)) return false;
  adoptedLanguages.add(language);
  state.languageAdoptions = Array.from(adoptedLanguages).slice(-8);
  updateData[`languageAdoptions.${language}`] = 1;
  return true;
};

const addOBPLanguageCounters = (
  updateData: Record<string, any>,
  state: SessionMilestoneState | null,
  data: TrackingData,
  mode: 'view' | 'adoption',
): boolean => {
  const language = normalizeMenuLanguage(data.obpLanguage || data.menuLanguage || data.language);
  if (!language) return false;

  const label = normalizeMenuLanguageName(language, data.obpLanguageName || data.menuLanguageName || data.languageName);
  updateData.obpLanguageTrackingEnabled = true;
  updateData[`obpLanguageNames.${language}`] = label;

  if (mode === 'view') {
    updateData[`obpViewsByLanguage.${language}`] = 1;
    if (state) {
      const languages = new Set(state.languageSessions || []);
      if (!languages.has(language)) {
        languages.add(language);
        state.languageSessions = Array.from(languages).slice(-8);
        updateData[`obpSessionsByLanguage.${language}`] = 1;
      }
    }
    return true;
  }

  if (!state) return false;
  const adoptedLanguages = new Set(state.languageAdoptions || []);
  if (adoptedLanguages.has(language)) return false;
  adoptedLanguages.add(language);
  state.languageAdoptions = Array.from(adoptedLanguages).slice(-8);
  updateData[`obpLanguageAdoptions.${language}`] = 1;
  return true;
};

const markSessionMilestone = (
  updateData: Record<string, any>,
  state: SessionMilestoneState | null,
  milestone: 'menuSession' | 'engaged' | 'intent' | 'action'
) => {
  if (!state || state[milestone]) return;
  state[milestone] = true;
  if (milestone === 'menuSession') updateData.menuSessions = 1;
  if (milestone === 'engaged') updateData.engagedSessions = 1;
  if (milestone === 'intent') updateData.intentSessions = 1;
  if (milestone === 'action') updateData.actionSessions = 1;
};

const trackSessionItemView = (
  updateData: Record<string, any>,
  state: SessionMilestoneState | null,
  itemId?: string,
) => {
  if (!state || !itemId) return true;

  const viewedItemIds = new Set(state.viewedItemIds || []);
  const isNewSessionItemView = !viewedItemIds.has(itemId);
  viewedItemIds.add(itemId);
  state.viewedItemIds = Array.from(viewedItemIds).slice(-20);

  const itemIds = new Set(state.itemIds || []);
  itemIds.add(itemId);
  state.itemIds = Array.from(itemIds).slice(-10);

  if (state.itemIds.length >= 2) {
    markSessionMilestone(updateData, state, 'engaged');
    markSessionMilestone(updateData, state, 'intent');
  }

  return isNewSessionItemView;
};

const markEngagedIntentSession = (updateData: Record<string, any>, state: SessionMilestoneState | null) => {
  markSessionMilestone(updateData, state, 'engaged');
  markSessionMilestone(updateData, state, 'intent');
};

const addCategoryInterestCounters = (
  updateData: Record<string, any>,
  data: TrackingData,
  counterPrefix: 'viewsByCategory' | 'clicksByCategory',
) => {
  const categoryId = String(data.categoryId || data.itemCategoryId || '').trim();
  if (!categoryId) return;

  updateData[`${counterPrefix}.${categoryId}`] = 1;
  const categoryName = String(data.categoryName || data.itemCategory || '').trim();
  if (categoryName) {
    updateData[`categoryNames.${categoryId}`] = categoryName;
  }
};

/**
 * Standard events we track across both systems
 */
export enum TrackingEvent {
  // Page/Menu level events
  PAGE_VIEW = 'page_view',           // Any page view
  MENU_VIEW = 'menu_view',           // Overall menu/store page view

  // Item level events
  ITEM_VIEW = 'item_view',           // Viewing a specific menu item
  ITEM_CLICK = 'item_click',         // Clicking on a specific menu item
  ADD_TO_CART = 'add_to_cart',       // Adding an item to cart

  // Decision Blocks events
  DECISION_BLOCKS_RENDERED = 'decision_blocks_rendered', // Blocks shown (once per session, only if rendered)
  DECISION_BLOCK_CLICK = 'decision_block_click',   // User clicked on a decision block item

  // Order events
  CHECKOUT_START = 'begin_checkout',  // Starting checkout process
  PURCHASE = 'purchase',              // Completing a purchase

  // User events
  SEARCH = 'search',                 // User searching for items
  UNAVAILABLE_ITEM_ATTEMPT = 'unavailable_item_attempt', // User tapped an unavailable item
  MENU_ACTION_CLICK = 'menu_action_click', // Customer clicked a final CTA from the menu
  MENU_LANGUAGE_ADOPTION = 'menu_language_adoption', // Switched language stayed active long enough to count
  LOGIN = 'login',                   // User login
  SIGN_UP = 'sign_up',               // User registration
  SHARE = 'share',                   // Sharing content
  USER_LOCATION = 'user_location',   // User location tracking

  // Official Business Page (OBP) events
  OBP_VIEW = 'obp_view',                    // Customer opened the OBP page
  OBP_ACTION_CLICK = 'obp_action_click',    // Customer clicked Call/WhatsApp/Directions on OBP
  OBP_MENU_CLICK = 'obp_menu_click',        // Customer clicked "View Menu" from OBP → measures OBP→menu conversion
  OBP_LINK_CLICK = 'obp_link_click',        // Customer clicked review/social/website link from OBP
  OBP_SHARE = 'obp_share',                  // Owner shared OBP link via WhatsApp/copy — measures distribution behavior
  OBP_LANGUAGE_ADOPTION = 'obp_language_adoption', // OBP language stayed active after switching

  // G-10 (§11 + D-04 PUBLIC-ROUTING-DOCTRINE): customer-side project switch.
  // Fires when the customer switches between projects via the in-menu
  // project switcher (D-04) or the OBP secondary-project card (G-06).
  // GA4-only operational signal. Firestore dashboards already capture the
  // owner-facing outcome through OBP menu clicks and destination menu views.
  PROJECT_SWITCH = 'project_switch',

  // T5-N-02 / §11 PUBLIC-ROUTING-DOCTRINE: G-08 subdomain immutability guard.
  // Fires server-side when an owner attempts to mutate subdomain after first
  // publish and the guard blocks it. Key security/support signal — repeated
  // attempts may indicate confusion or attempted circumvention.
  SUBDOMAIN_MUTATION_BLOCKED = 'subdomain_mutation_blocked',

  // Owner-side events (lightweight, GA4-only — no Firestore writes)
  MENU_KIT_DOWNLOAD = 'menu_kit_download',  // Owner downloaded Menu Kit ZIP or shared individual asset

  // Customer App (installable PWA surface) events — stored with projectId='customerApp'
  CUSTOMER_APP_PROMPT_SHOWN = 'customer_app_prompt_shown',          // Install prompt rendered to customer
  CUSTOMER_APP_PROMPT_DISMISSED = 'customer_app_prompt_dismissed',  // Customer dismissed install prompt
  CUSTOMER_APP_INSTALL_STARTED = 'customer_app_install_started',    // Customer tapped "Install" (before native prompt)
  CUSTOMER_APP_INSTALLED = 'customer_app_installed',                // appinstalled event fired — deduped per-device via localStorage
  CUSTOMER_APP_OPENED = 'customer_app_opened',                      // App launched in display-mode: standalone
  CUSTOMER_APP_SHORTCUT_MENU = 'customer_app_shortcut_menu',        // Menu shortcut launched (?entry_source=shortcut-menu)
  CUSTOMER_APP_SHORTCUT_CALL = 'customer_app_shortcut_call',        // Call shortcut launched (?entry_source=shortcut-call)
  CUSTOMER_APP_SHORTCUT_DIRECTIONS = 'customer_app_shortcut_directions', // Directions shortcut launched
  CUSTOMER_APP_SHORTCUT_WHATSAPP = 'customer_app_shortcut_whatsapp', // WhatsApp shortcut launched — previously miscounted as CALL
  CUSTOMER_APP_SHORTCUT_RESERVATION = 'customer_app_shortcut_reservation', // Reservation shortcut launched
  CUSTOMER_APP_SHORTCUT_ORDER = 'customer_app_shortcut_order',      // Online order shortcut launched
}

/**
 * Standard properties for tracking events
 */
export interface TrackingData {
  // Item properties
  itemId?: string;            // ID of the specific item
  itemName?: string;          // Name of the item
  itemCategory?: string;      // Category of the item
  categoryId?: string;        // Stable category ID for dashboard grouping
  categoryName?: string;      // Owner-readable category label
  itemCategoryId?: string;    // Backward-compatible alias for categoryId
  price?: number;             // Price of the item
  currency?: string;          // Currency code (e.g., "USD")
  quantity?: number;          // Quantity of the item

  // Menu/Store properties (for overall menu/store page)
  storeId?: string;            // ID of the entire menu/store
  storeName?: string;          // Name of the store/restaurant

  // Project properties (required for project-wise analytics)
  projectId?: string;          // Project ID - analytics are stored per project
  tenantId?: string | number;  // Tenant ID

  // Transaction properties
  transactionId?: string;     // Order/transaction ID
  revenue?: number;           // Total revenue from transaction
  tax?: number;               // Tax amount
  shipping?: number;          // Shipping cost
  coupon?: string;            // Coupon code used

  // User properties
  userId?: string;            // User identifier
  userType?: string;          // Type of user (e.g., "guest", "member")
  sessionId?: string;         // Session identifier for unique visitor tracking

  // Location properties
  city?: string;              // User's city
  region?: string;            // User's region/state
  country?: string;           // User's country
  timezone?: string;          // User's timezone
  storeTimeZone?: string;     // Store timezone used for local analytics day/hour bucketing
  businessDayEndTime?: string; // Store-local HH:mm analytics business-day cutoff
  includeLocation?: boolean;  // Explicit true allows approximate location collection

  // Search properties
  searchTerm?: string;        // What the user searched for
  searchResults?: number;     // Number of search results
  menuAction?: 'call' | 'whatsapp' | 'directions' | 'reserve' | 'order';
  openHoursState?: 'open' | 'closed' | 'unknown';
  shareMethod?: 'native_share' | 'copy_link';
  shareContentType?: 'menu_item' | 'menu' | 'obp';
  obpAction?: 'call' | 'whatsapp' | 'directions' | 'reserve' | 'order' | 'feedback' | 'copy_link' | 'copy_message';
  obpLink?: 'google_review' | 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'youtube' | 'whatsapp' | 'website';

  // Recommendation properties (Decision Intelligence)
  blockType?: 'popular' | 'quickPick' | 'bestValue';  // Which recommendation block
  recommendationPosition?: number;                     // Position in the block (1, 2, 3)

  // UTM parameters
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  entrySource?: EntrySource | string;

  // Menu language usage. Counts only current language on existing menu-view
  // writes and validated switched-language adoption, not every quick toggle.
  menuLanguage?: string;
  menuLanguageName?: string;
  previousMenuLanguage?: string;
  languageAdoptionReason?: 'dwell' | 'meaningful_action';
  obpLanguage?: string;
  obpLanguageName?: string;
  previousOBPLanguage?: string;

  /**
   * Customer App (PWA) platform tag — 'ios' | 'android' | 'desktop' | 'other'.
   * Captured client-side via detectPlatform() and forwarded on install/open
   * events so the owner dashboard can break installs down by platform.
   * Only honored for CUSTOMER_APP_INSTALLED and CUSTOMER_APP_OPENED events.
   */
  pwaPlatform?: 'ios' | 'android' | 'desktop' | 'other';

  /**
   * Install source tag — 'native' (browser prompt accepted) | 'ios-inferred'
   * (iOS standalone launch shortly after prompt shown) | 'ios-standalone'
   * (iOS first standalone open without prompt history) | 'unknown'.
   * Lets the dashboard distinguish confirmed installs from heuristic/manual ones.
   */
  pwaInstallSource?: 'native' | 'ios-inferred' | 'ios-standalone' | 'unknown';

  /**
   * Entry/source context for Customer App events. This is attribution only:
   * Customer App identity is store-level, so OBP, `/menu`, and project paths
   * remain one installed app and this field only explains where the event
   * originated.
   */
  pwaInstallSurface?: 'obp' | 'menu-alias' | 'project' | 'unknown';

  /**
   * T5-N-01 / §11 PUBLIC-ROUTING-DOCTRINE: indicates this MENU_VIEW was
   * resolved via R5 Layer 2 universal alias (`isMenuAliasFallback=true`)
   * rather than Layer 1 claimed-slug match. Enables measurement of:
   *   - Layer 1 vs Layer 2 share (are owners claiming `/menu`?)
   *   - R5 adoption rate over time
   *   - Whether Layer 2 is cannibalizing SEO vs serving as graceful fallback.
   */
  menuResolutionLayer?: 'layer1' | 'layer2';

  // T5-N-04: G-10 project switch source extension.
  // 'menu_alias_layer2' = customer typed /menu and got served default project.
  // This is distinct from 'obp_secondary_card' and 'in_menu' — it captures
  // the "latent switch" from URL typed to project rendered.
  switchSource?: 'obp_secondary_card' | 'in_menu' | 'menu_alias_layer2' | string;

  // Additional properties
  [key: string]: any;         // Any other custom properties
}

const logMissingRequiredAnalyticsField = (
  eventName: TrackingEvent,
  fieldName: string,
  data: TrackingData,
): void => {
  logAnalyticsFailure('analytics_missing_required_field', undefined, {
    eventName,
    fieldName,
    ...getAnalyticsTrackingContext(data),
  });
};

/**
 * Unified tracking function that handles both Firebase and GA4
 * 
 * COST OPTIMIZATION:
 * - Debounces rapid-fire events (1 second window)
 * - Rate limits to 20 events/minute per session
 * - Special cooldown for menu views (30 seconds per project)
 */
export const trackEvent = async (eventName: TrackingEvent, data: TrackingData = {}): Promise<void> => {
  try {
    // Add session ID to tracking data if not already present
    if (!data.sessionId) {
      data.sessionId = getSessionId();
    }

    // COST OPTIMIZATION: Rate limiting check
    const sessionId = data.sessionId;
    if (shouldRateLimit(sessionId)) {
      return;
    }

    // COST OPTIMIZATION: Debounce rapid-fire same events
    if (shouldDebounce(eventName, data.projectId)) {
      return; // Silently skip duplicate event.
    }

    // COST OPTIMIZATION: Special handling for menu views
    if (eventName === TrackingEvent.MENU_VIEW && shouldBlockMenuView(data.projectId)) {
      return; // Silently skip repeated menu view.
    }

    // Track in Firebase Analytics
    await trackFirebaseEvent(eventName, data);

    // Track in Google Analytics 4
    trackGA4Event(eventName, data);
  } catch (error) {
    logAnalyticsFailure('analytics_track_event_failed', error, {
      eventName,
      ...getAnalyticsTrackingContext(data),
    });
  }
};

/**
 * Track event in Firebase Analytics
 */
const trackFirebaseEvent = async (eventName: TrackingEvent, data: TrackingData): Promise<void> => {
  try {
    // Get device info
    const deviceInfo = getDeviceInfo();

    const now = new Date();
    const hour = getAnalyticsHourKey(now, data.storeTimeZone);

    // Create device key
    const deviceKey = deviceInfo.type || 'unknown';

    const includeLocation = data.includeLocation === true;
    const locationAwareEvents = new Set<TrackingEvent>([
      TrackingEvent.PAGE_VIEW,
      TrackingEvent.MENU_VIEW,
      TrackingEvent.ITEM_CLICK,
      TrackingEvent.OBP_VIEW,
      TrackingEvent.CUSTOMER_APP_INSTALLED,
      TrackingEvent.CUSTOMER_APP_OPENED,
    ]);

    // Try to get location information only for event families that use it.
    let locationKey: string | null = null;
    if (includeLocation && locationAwareEvents.has(eventName)) {
      try {
        locationKey = await getLocationInfo();
      } catch (error) {
        logAnalyticsFailure('analytics_location_context_failed', error, {
          eventName,
          ...getAnalyticsTrackingContext(data),
        });
      }
    }

    // Ensure we have a session ID
    const sessionId = data.sessionId || getSessionId();
    const localDate = getBusinessAnalyticsDateKey(now, data.storeTimeZone, data.businessDayEndTime);
    const sessionMilestoneKey = getSessionMilestoneKey(data, localDate, sessionId);
    const sessionSourceKey = getSessionSourceKey(data, localDate, sessionId);
    const sessionFilterKey = getSessionFilterKey(data, localDate, sessionId);
    const sessionMilestones = readSessionMilestoneState(sessionMilestoneKey);
    const entrySource = readSessionEntrySource(sessionSourceKey) || inferEntrySource(data);
    const activeAttributeFilter = readActiveAttributeFilter(sessionFilterKey);
    const normalizeAnalyticsMapKey = (value?: string): string | null => {
      if (!value) return null;
      const normalized = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80);
      return normalized || null;
    };

    // Prepare update data
    const updateData: any = {
      date: localDate,
    };

    // Map unified events to Firebase Analytics format
    switch (eventName) {
      case TrackingEvent.PAGE_VIEW:
      case TrackingEvent.MENU_VIEW:
        updateData.totalViews = 1;
        updateData[`viewsByDevice.${deviceKey}`] = 1;
        if (locationKey) updateData[`viewsByLocation.${locationKey}`] = 1;
        updateData[`hourlyViews.${hour}`] = 1;
        // COST OPTIMIZATION: Track session count, not individual session IDs
        // This prevents document size from growing unbounded (Firestore 1MB limit)
        // Unique session deduplication handled by nightly Cloud Function
        updateData.totalSessions = 1;
        if (eventName === TrackingEvent.MENU_VIEW) {
          const hadMenuSession = Boolean(sessionMilestones?.menuSession);
          markSessionMilestone(updateData, sessionMilestones, 'menuSession');
          if (!hadMenuSession && updateData.menuSessions) {
            updateData[`menuSessionsBySource.${entrySource}`] = 1;
          }
          addMenuLanguageCounters(updateData, sessionMilestones, data, 'view');
          updateData[`viewsByEntrySource.${entrySource}`] = 1;
          if (data.utm_source) {
            updateData[`viewsBySource.${data.utm_source}`] = 1;
          }
          if (data.utm_medium) updateData[`viewsByMedium.${data.utm_medium}`] = 1;
          if (data.utm_campaign) updateData[`viewsByCampaign.${data.utm_campaign}`] = 1;
          const utmContent = normalizeAnalyticsMapKey(data.utm_content);
          if (utmContent) updateData[`viewsByContent.${utmContent}`] = 1;
          // T5-N-01: R5 Layer resolution split — lets us measure how often /menu
          // resolves via Layer 1 (owner-claimed slug) vs Layer 2 (universal alias).
          if (data.menuResolutionLayer) {
            updateData[`menuResolutionLayer.${data.menuResolutionLayer}`] = 1;
          }
        }
        break;

      case TrackingEvent.MENU_LANGUAGE_ADOPTION:
        if (!data.menuLanguage) {
          logMissingRequiredAnalyticsField(eventName, 'menuLanguage', data);
          return;
        }
        if (!addMenuLanguageCounters(updateData, sessionMilestones, data, 'adoption')) return;
        break;

      case TrackingEvent.ITEM_VIEW:
        // ITEM_VIEW = item modal opened (impression)
        // Separate from ITEM_CLICK for proper CTR calculation
        if (!data.itemId) {
          logMissingRequiredAnalyticsField(eventName, 'itemId', data);
          return;
        }

        if (!trackSessionItemView(updateData, sessionMilestones, data.itemId)) {
          return;
        }

        updateData.totalItemViews = 1;
        updateData[`viewsByItem.${data.itemId}`] = 1;  // Per-item impressions
        updateData[`hourlyItemViews.${hour}`] = 1;
        addCategoryInterestCounters(updateData, data, 'viewsByCategory');

        // Store item name if provided
        if (data.itemName) {
          updateData[`itemNames.${data.itemId}`] = data.itemName;
        }
        break;

      case TrackingEvent.ITEM_CLICK:
        // ITEM_CLICK = explicit user action (add to cart, order, etc.)
        if (!data.itemId) {
          logMissingRequiredAnalyticsField(eventName, 'itemId', data);
          return;
        }

        updateData.totalClicks = 1;
        updateData[`clicksByDevice.${deviceKey}`] = 1;
        if (locationKey) updateData[`clicksByLocation.${locationKey}`] = 1;
        updateData[`clicksByItem.${data.itemId}`] = 1;
        updateData[`hourlyClicks.${hour}`] = 1;
        // NEW: Track which items are clicked at which hours (for time eligibility)
        updateData[`hourlyClicksByItem.${data.itemId}.${hour}`] = 1;
        addCategoryInterestCounters(updateData, data, 'clicksByCategory');
        markEngagedIntentSession(updateData, sessionMilestones);

        // Store item name if provided
        if (data.itemName) {
          updateData[`itemNames.${data.itemId}`] = data.itemName;
        }
        break;

      case TrackingEvent.ADD_TO_CART:
      case TrackingEvent.CHECKOUT_START:
      case TrackingEvent.PURCHASE:
        // GA4 only until MenuList has an owner-visible ordering dashboard.
        // Hidden Firestore ecommerce counters add daily writes/rollups without
        // a current SMB decision surface.
        return;

      case TrackingEvent.SEARCH:
        const normalizedSearchTerm = normalizeSearchTermForAnalytics(data.searchTerm);
        if (data.searchTerm && !normalizedSearchTerm) {
          return;
        }

        updateData.totalSearches = 1;
        updateData[`hourlySearches.${hour}`] = 1;
        markEngagedIntentSession(updateData, sessionMilestones);
        if (normalizedSearchTerm) {
          updateData[`searchTerms.${normalizedSearchTerm}`] = 1;
          if ((data.searchResults || 0) === 0) {
            updateData.zeroResultSearches = 1;
            updateData[`zeroResultSearchTerms.${normalizedSearchTerm}`] = 1;
          }
        }
        break;

      case TrackingEvent.UNAVAILABLE_ITEM_ATTEMPT:
        if (!data.itemId) {
          logMissingRequiredAnalyticsField(eventName, 'itemId', data);
          return;
        }
        updateData.totalUnavailableItemTaps = 1;
        updateData[`unavailableItemTapsByItem.${data.itemId}`] = 1;
        updateData[`hourlyUnavailableItemTaps.${hour}`] = 1;
        markEngagedIntentSession(updateData, sessionMilestones);
        if (data.itemName) {
          updateData[`itemNames.${data.itemId}`] = data.itemName;
        }
        addCategoryInterestCounters(updateData, data, 'clicksByCategory');
        break;

      case TrackingEvent.MENU_ACTION_CLICK:
        if (!data.menuAction) {
          logMissingRequiredAnalyticsField(eventName, 'menuAction', data);
          return;
        }
        const menuActionOpenHoursState = normalizeOpenHoursState(data.openHoursState);
        updateData.totalMenuActionClicks = 1;
        updateData[`menuActionClicks.${data.menuAction}`] = 1;
        updateData[`menuActionClicksByOpenHoursState.${menuActionOpenHoursState}`] = 1;
        updateData[`hourlyMenuActionClicks.${hour}`] = 1;
        markEngagedIntentSession(updateData, sessionMilestones);
        const hadActionSession = Boolean(sessionMilestones?.action);
        markSessionMilestone(updateData, sessionMilestones, 'action');
        updateData[`menuActionClicksBySource.${entrySource}`] = 1;
        if (!hadActionSession && updateData.actionSessions) {
          updateData[`actionSessionsBySource.${entrySource}`] = 1;
          updateData[`actionSessionsByOpenHoursState.${menuActionOpenHoursState}`] = 1;
        }
        break;

      case TrackingEvent.DECISION_BLOCK_CLICK:
        if (!data.itemId || !data.blockType) {
          logMissingRequiredAnalyticsField(eventName, data.itemId ? 'blockType' : 'itemId', data);
          return;
        }
        updateData.totalRecommendationClicks = 1;
        updateData[`recommendationClicks.${data.blockType}`] = 1;
        updateData[`recommendationClicksByItem.${data.itemId}`] = 1;
        updateData[`hourlyRecommendationClicks.${hour}`] = 1;
        addCategoryInterestCounters(updateData, data, 'clicksByCategory');
        if (data.itemName) {
          updateData[`itemNames.${data.itemId}`] = data.itemName;
        }
        markEngagedIntentSession(updateData, sessionMilestones);
        break;

      case TrackingEvent.OBP_VIEW:
        // Official Business Page view — stored with projectId='obp'
        updateData.totalOBPViews = 1;
        updateData[`viewsByDevice.${deviceKey}`] = 1;
        if (locationKey) updateData[`viewsByLocation.${locationKey}`] = 1;
        updateData[`hourlyViews.${hour}`] = 1;
        updateData.totalSessions = 1;
        updateData[`viewsByEntrySource.${entrySource}`] = 1;
        addOBPLanguageCounters(updateData, sessionMilestones, data, 'view');
        if (data.utm_source) {
          updateData[`viewsBySource.${data.utm_source}`] = 1;
        }
        if (data.utm_medium) updateData[`viewsByMedium.${data.utm_medium}`] = 1;
        if (data.utm_campaign) updateData[`viewsByCampaign.${data.utm_campaign}`] = 1;
        const obpUtmContent = normalizeAnalyticsMapKey(data.utm_content);
        if (obpUtmContent) updateData[`viewsByContent.${obpUtmContent}`] = 1;
        break;

      case TrackingEvent.OBP_LANGUAGE_ADOPTION:
        if (!data.obpLanguage && !data.menuLanguage) {
          logMissingRequiredAnalyticsField(eventName, 'obpLanguage', data);
          return;
        }
        if (!addOBPLanguageCounters(updateData, sessionMilestones, data, 'adoption')) return;
        break;

      case TrackingEvent.OBP_ACTION_CLICK:
        // OBP action button click (Call, WhatsApp, Directions)
        if (!data.obpAction) {
          logMissingRequiredAnalyticsField(eventName, 'obpAction', data);
          return;
        }
        const obpActionOpenHoursState = normalizeOpenHoursState(data.openHoursState);
        updateData.totalOBPActionClicks = 1;
        updateData[`obpActionClicks.${data.obpAction}`] = 1;
        updateData[`obpActionClicksBySource.${entrySource}`] = 1;
        updateData[`obpActionClicksByOpenHoursState.${obpActionOpenHoursState}`] = 1;
        updateData[`hourlyOBPActionClicks.${hour}`] = 1;
        break;

      case TrackingEvent.OBP_MENU_CLICK: {
        // OBP → Menu conversion click (customer clicked "View Menu" from OBP)
        // T2-N-02 / A-07: per-surface split so brand-OBP vs outlet-OBP
        // conversion can be measured independently.
        updateData.totalOBPMenuClicks = 1;
        updateData[`hourlyOBPMenuClicks.${hour}`] = 1;
        updateData[`obpMenuClicksBySource.${entrySource}`] = 1;
        updateData[`obpMenuClicksByOpenHoursState.${normalizeOpenHoursState(data.openHoursState)}`] = 1;
        const obpSurface = data.obpSurface === 'outlet' ? 'outlet' : 'brand';
        updateData[`obpMenuClicksBySurface.${obpSurface}`] = 1;
        break;
      }

      case TrackingEvent.OBP_LINK_CLICK:
        if (!data.obpLink) {
          logMissingRequiredAnalyticsField(eventName, 'obpLink', data);
          return;
        }
        updateData.totalOBPLinkClicks = 1;
        updateData[`obpLinkClicks.${data.obpLink}`] = 1;
        updateData[`obpLinkClicksBySource.${entrySource}`] = 1;
        updateData[`obpLinkClicksByOpenHoursState.${normalizeOpenHoursState(data.openHoursState)}`] = 1;
        updateData[`hourlyOBPLinkClicks.${hour}`] = 1;
        break;

      case TrackingEvent.OBP_SHARE:
        // Owner shared OBP link via WhatsApp/copy — measures distribution behavior
        if (!data.obpAction) {
          logMissingRequiredAnalyticsField(eventName, 'obpAction', data);
          return;
        }
        updateData.totalOBPShares = 1;
        updateData[`obpShares.${data.obpAction}`] = 1;
        break;

      case TrackingEvent.DECISION_BLOCKS_RENDERED:
        // Track when Decision Blocks are actually rendered to the customer
        // This is critical for calculating:
        // - Smart Picks Visibility Rate (rendered / views)
        // - Engagement Rate (clicks / rendered) - THE MONEY METRIC
        if (!data.blocksShown || !Array.isArray(data.blocksShown) || data.blocksShown.length === 0) {
          logMissingRequiredAnalyticsField(eventName, 'blocksShown', data);
          return;
        }
        updateData.totalDecisionBlocksRendered = 1;
        // Track each block type that was rendered
        data.blocksShown.forEach((blockType: string) => {
          updateData[`decisionBlocksRendered.${blockType}`] = 1;
        });
        updateData[`hourlyDecisionBlocksRendered.${hour}`] = 1;
        break;

      case TrackingEvent.MENU_KIT_DOWNLOAD:
        // Owner-side event — GA4 only, skip Firestore write
        // GA4 tracking happens separately below, so just return early
        return;

      case TrackingEvent.PROJECT_SWITCH:
        // GA4 only for now. Firestore owner dashboards already capture the
        // business outcome through OBP menu clicks and the destination menu
        // view; storing a second Firestore write here adds cost without a
        // separate owner-facing KPI.
        return;

      case TrackingEvent.LOGIN:
      case TrackingEvent.SIGN_UP:
      case TrackingEvent.SHARE:
      case TrackingEvent.USER_LOCATION:
      case TrackingEvent.SUBDOMAIN_MUTATION_BLOCKED:
        // Operational or generic analytics event. Keep in GA4 only unless a
        // real owner-facing dashboard/report needs the Firestore counter.
        return;

      // ── Customer App (installable PWA surface) — always stored under projectId='customerApp' ──
      case TrackingEvent.CUSTOMER_APP_PROMPT_SHOWN:
        updateData.totalPromptShown = 1;
        updateData[`hourlyPromptShown.${hour}`] = 1;
        break;

      case TrackingEvent.CUSTOMER_APP_PROMPT_DISMISSED:
        updateData.totalPromptDismissed = 1;
        break;

      case TrackingEvent.CUSTOMER_APP_INSTALL_STARTED:
        updateData.totalInstallStarted = 1;
        break;

      case TrackingEvent.CUSTOMER_APP_INSTALLED:
        // Fired once per device per store via fireInstalledEventOnce() localStorage guard.
        updateData.totalInstalled = 1;
        updateData.uniqueInstallSessions = 1;
        updateData[`installsByDevice.${deviceKey}`] = 1;
        if (locationKey) updateData[`installsByLocation.${locationKey}`] = 1;
        // Platform breakdown (iOS / Android / Desktop). Optional — only
        // writes when caller supplied pwaPlatform.
        if (data.pwaPlatform) {
          updateData[`installsByPlatform.${data.pwaPlatform}`] = 1;
        }
        // Install source (native vs ios-inferred) — lets owners distinguish
        // confirmed installs from heuristic ones.
        if (data.pwaInstallSource) {
          updateData[`installsBySource.${data.pwaInstallSource}`] = 1;
        }
        // Entry/source breakdown only. All entries map to the same store-level
        // installed Customer App identity.
        if (data.pwaInstallSurface) {
          updateData[`installsBySurface.${data.pwaInstallSurface}`] = 1;
        }
        break;

      case TrackingEvent.CUSTOMER_APP_OPENED:
        updateData.totalAppOpens = 1;
        updateData[`viewsByDevice.${deviceKey}`] = 1;
        if (locationKey) updateData[`viewsByLocation.${locationKey}`] = 1;
        updateData[`hourlyAppOpens.${hour}`] = 1;
        updateData.totalSessions = 1;
        // Per-platform app-open count — used by the "active by platform" row
        // on the owner dashboard.
        if (data.pwaPlatform) {
          updateData[`appOpensByPlatform.${data.pwaPlatform}`] = 1;
        }
        // Entry/source breakdown only. A project path launch does not imply a
        // separate installed app.
        if (data.pwaInstallSurface) {
          updateData[`appOpensBySurface.${data.pwaInstallSurface}`] = 1;
        }
        break;

      case TrackingEvent.CUSTOMER_APP_SHORTCUT_MENU:
        updateData['shortcutClicks.menu'] = 1;
        break;

      case TrackingEvent.CUSTOMER_APP_SHORTCUT_CALL:
        updateData['shortcutClicks.call'] = 1;
        break;

      case TrackingEvent.CUSTOMER_APP_SHORTCUT_DIRECTIONS:
        updateData['shortcutClicks.directions'] = 1;
        break;

      case TrackingEvent.CUSTOMER_APP_SHORTCUT_WHATSAPP:
        updateData['shortcutClicks.whatsapp'] = 1;
        break;

      case TrackingEvent.CUSTOMER_APP_SHORTCUT_RESERVATION:
        updateData['shortcutClicks.reservation'] = 1;
        break;

      case TrackingEvent.CUSTOMER_APP_SHORTCUT_ORDER:
        updateData['shortcutClicks.order'] = 1;
        break;

      default:
        // Default is GA4 only. Firestore writes are reserved for owner-visible
        // customer analytics that feed scheduler read models.
        return;
    }

    const shouldAttachFilterContext =
      eventName === TrackingEvent.ITEM_VIEW ||
      eventName === TrackingEvent.ITEM_CLICK ||
      eventName === TrackingEvent.SEARCH ||
      eventName === TrackingEvent.UNAVAILABLE_ITEM_ATTEMPT ||
      eventName === TrackingEvent.MENU_ACTION_CLICK ||
      eventName === TrackingEvent.DECISION_BLOCK_CLICK;
    if (shouldAttachFilterContext) {
      addAttributeFilterContextCounters(updateData, activeAttributeFilter, eventName);
    }

    // Customer App events always write under the reserved 'customerApp' project segment,
    // regardless of which menu projectId the page is currently viewing.
    const isCustomerAppEvent =
      eventName === TrackingEvent.CUSTOMER_APP_PROMPT_SHOWN ||
      eventName === TrackingEvent.CUSTOMER_APP_PROMPT_DISMISSED ||
      eventName === TrackingEvent.CUSTOMER_APP_INSTALL_STARTED ||
      eventName === TrackingEvent.CUSTOMER_APP_INSTALLED ||
      eventName === TrackingEvent.CUSTOMER_APP_OPENED ||
      eventName === TrackingEvent.CUSTOMER_APP_SHORTCUT_MENU ||
      eventName === TrackingEvent.CUSTOMER_APP_SHORTCUT_CALL ||
      eventName === TrackingEvent.CUSTOMER_APP_SHORTCUT_DIRECTIONS ||
      eventName === TrackingEvent.CUSTOMER_APP_SHORTCUT_WHATSAPP ||
      eventName === TrackingEvent.CUSTOMER_APP_SHORTCUT_RESERVATION ||
      eventName === TrackingEvent.CUSTOMER_APP_SHORTCUT_ORDER;
    const effectiveProjectId = isCustomerAppEvent ? 'customerApp' : data.projectId;

    // Use the database function to track the event
    // Pass projectId and tenantId for project-wise analytics storage
    await trackAnalyticsEvent(updateData, data.tenantId, data.storeId, effectiveProjectId, data.storeTimeZone, data.businessDayEndTime);
    writeSessionMilestoneState(sessionMilestoneKey, sessionMilestones);
    if (eventName === TrackingEvent.MENU_VIEW || eventName === TrackingEvent.OBP_VIEW) {
      writeSessionEntrySource(sessionSourceKey, entrySource);
    }
  } catch (error) {
    logAnalyticsFailure('analytics_firebase_event_failed', error, {
      eventName,
      ...getAnalyticsTrackingContext(data),
    });
    throw error;
  }
};

/**
 * Track event in Google Analytics 4
 */
const trackGA4Event = (
  eventName: TrackingEvent,
  data: TrackingData
): void => {
  // Only track if GA4 is available
  if (typeof window.gtag !== 'function' || !window.gaId) {
    return;
  }

  try {
    // Map unified events to GA4 format
    switch (eventName) {
      case TrackingEvent.PAGE_VIEW:
        window.gtag('config', window.gaId, {
          page_path: window.location.pathname,
          page_title: document.title
        });
        break;

      case TrackingEvent.MENU_VIEW:
        // Track viewing the entire menu/store page (not individual items)
        window.gtag('event', 'view_item_list', {
          item_list_id: data.storeId,       // ID of the entire menu/store
          item_list_name: data.storeName    // Name of the store/restaurant
        });
        break;

      case TrackingEvent.ITEM_VIEW:
        // Track viewing a specific menu item/dish (not the entire menu)
        window.gtag('event', 'view_item', {
          items: [{
            item_id: data.itemId,           // ID of the specific dish
            item_name: data.itemName,       // Name of the specific dish
            item_category: data.itemCategory,
            price: data.price,
            currency: data.currency || 'USD'
          }]
        });
        break;

      case TrackingEvent.ITEM_CLICK:
        window.gtag('event', 'select_item', {
          items: [{
            item_id: data.itemId,
            item_name: data.itemName,
            item_category: data.itemCategory,
            price: data.price,
            currency: data.currency || 'USD'
          }]
        });
        break;

      case TrackingEvent.ADD_TO_CART:
        window.gtag('event', 'add_to_cart', {
          currency: data.currency || 'USD',
          value: data.price,
          items: [{
            item_id: data.itemId,
            item_name: data.itemName,
            item_category: data.itemCategory,
            price: data.price,
            currency: data.currency || 'USD',
            quantity: data.quantity || 1
          }]
        });
        break;

      case TrackingEvent.PURCHASE:
        window.gtag('event', 'purchase', {
          transaction_id: data.transactionId,
          value: data.revenue,
          currency: data.currency || 'USD',
          tax: data.tax,
          shipping: data.shipping,
          coupon: data.coupon,
          items: data.items || []
        });
        break;

      case TrackingEvent.SEARCH:
        window.gtag('event', 'search', {
          search_term: data.searchTerm,
          search_results_count: data.searchResults
        });
        break;

      case TrackingEvent.SHARE:
        window.gtag('event', 'share', {
          method: data.shareMethod || 'native_share',
          content_type: data.shareContentType || (data.itemId ? 'menu_item' : 'menu'),
          item_id: data.itemId,
          item_name: data.itemName,
          item_category: data.itemCategory,
        });
        break;

        window.gtag('event', eventName, {
          content_type: 'menu_item',
          item_id: data.itemId,
          item_name: data.itemName,
          item_category: data.itemCategory,
          project_id: data.projectId,
          store_id: data.storeId,
        });
        break;

      case TrackingEvent.USER_LOCATION:
        window.gtag('event', 'user_location', {
          city: data.city,
          region: data.region,
          country: data.country
        });
        break;

      case TrackingEvent.DECISION_BLOCK_CLICK:
        window.gtag('event', 'select_promotion', {
          creative_name: data.blockType,
          creative_slot: 'decision_block',
          promotion_id: `rec_${data.blockType}`,
          promotion_name: data.blockType === 'popular' ? 'Popular Right Now' :
            data.blockType === 'quickPick' ? 'Quick Pick' : 'Best Value',
          items: [{
            item_id: data.itemId,
            item_name: data.itemName,
            item_category: data.itemCategory,
            price: data.price,
            currency: data.currency || 'USD'
          }]
        });
        break;

      default:
        // For other events, pass all data as parameters
        window.gtag('event', eventName, {
          ...data,
          timestamp: new Date().toISOString()
        });
    }
  } catch (error) {
    logAnalyticsFailure('analytics_ga4_event_failed', error, {
      eventName,
      ...getAnalyticsTrackingContext(data),
    });
  }
};

/**
 * Convenience functions for common tracking events
 */

/**
 * Track a general page view in GA4 only (not Firebase)
 * This is useful for tracking views on non-menu pages (about, contact, etc.)
 * We only send this to GA4 to reduce load on Firebase
 * @param additionalData Optional additional tracking data
 */
export const trackPageView = (additionalData: Partial<TrackingData> = {}): void => {
  // Only track in GA4, not Firebase
  trackGA4Event(TrackingEvent.PAGE_VIEW, { page: window.location.pathname, page_title: document.title, ...additionalData });
};

/**
 * Track a view of the entire menu/store page (not individual items)
 * @param storeId ID of the entire menu/store
 * @param storeName Name of the store/restaurant
 * @param additionalData Optional additional tracking data (e.g., sessionId)
 */
export const trackMenuView = (storeId?: string, storeName?: string, additionalData: Partial<TrackingData> = {}): Promise<void> => {
  return trackEvent(TrackingEvent.MENU_VIEW, { storeId, storeName, ...additionalData });
};

export const trackMenuLanguageAdoption = (
  menuLanguage: string,
  previousMenuLanguage?: string,
  additionalData: Partial<TrackingData> = {},
): Promise<void> => {
  return trackEvent(TrackingEvent.MENU_LANGUAGE_ADOPTION, {
    menuLanguage,
    previousMenuLanguage,
    languageAdoptionReason: 'dwell',
    ...additionalData,
  });
};

/**
 * Store active menu filter context without writing to Firebase.
 * The selected filter is attached to later accepted analytics writes only.
 */
export const setMenuAttributeFilterContext = (
  filter: string | null,
  additionalData: Partial<TrackingData> = {},
  label?: string,
): void => {
  const sessionId = additionalData.sessionId || getSessionId();
  const localDate = getBusinessAnalyticsDateKey(new Date(), additionalData.storeTimeZone, additionalData.businessDayEndTime);
  const sessionFilterKey = getSessionFilterKey(additionalData, localDate, sessionId);
  writeActiveAttributeFilter(sessionFilterKey, filter, label);
};

/**
 * Track a view/click of a specific menu item/dish (not the entire menu)
 * @param itemId ID of the specific dish (e.g., "pizza-margherita")
 * @param itemName Name of the specific dish (e.g., "Margherita Pizza")
 * @param itemCategory Category of the item (e.g., "Pizza", "Drinks")
 * @param price Price of the item
 * @param currency Currency code (e.g., "USD")
 * @param additionalData Optional additional tracking data (e.g., sessionId)
 */
export const trackItemView = (itemId: string, itemName: string, itemCategory?: string, price?: number, currency?: string, additionalData: Partial<TrackingData> = {}): Promise<void> => {
  return trackEvent(TrackingEvent.ITEM_VIEW, { itemId, itemName, itemCategory, price, currency, ...additionalData });
};

/**
 * Track a click on a specific menu item (not a view)
 * @param itemId ID of the specific item
 * @param itemName Name of the item
 * @param itemCategory Category of the item
 * @param price Price of the item
 * @param currency Currency code (e.g., "USD")
 * @param additionalData Optional additional tracking data (e.g., sessionId)
 */
export const trackItemClick = (itemId: string, itemName: string, itemCategory?: string, price?: number, currency?: string, additionalData: Partial<TrackingData> = {}): Promise<void> => {
  return trackEvent(TrackingEvent.ITEM_CLICK, { itemId, itemName, itemCategory, price, currency, ...additionalData });
};

/**
 * Track item-level public sharing without adding Firestore write volume.
 * The generic SHARE event is GA4-only unless a future owner-facing read model
 * explicitly needs item-share counters.
 */
export const trackItemShare = (
  itemId: string,
  itemName: string,
  itemCategory?: string,
  shareMethod: 'native_share' | 'copy_link' = 'native_share',
  additionalData: Partial<TrackingData> = {}
): Promise<void> => {
  return trackEvent(TrackingEvent.SHARE, {
    itemId,
    itemName,
    itemCategory,
    shareMethod,
    shareContentType: 'menu_item',
    ...additionalData,
  });
};

/**
 * Track an add to cart event
 * @param itemId ID of the specific item
 * @param itemName Name of the item
 * @param price Price of the item
 * @param quantity Quantity of the item
 * @param currency Currency code (e.g., "USD")
 * @param additionalData Optional additional tracking data (e.g., sessionId)
 */
export const trackAddToCart = (itemId: string, itemName: string, price: number, quantity: number = 1, currency: string = 'USD', additionalData: Partial<TrackingData> = {}): Promise<void> => {
  return trackEvent(TrackingEvent.ADD_TO_CART, { itemId, itemName, price, quantity, currency, ...additionalData });
};

/**
 * Track a purchase/order completion
 * @param transactionId Order/transaction ID
 * @param revenue Total revenue from transaction
 * @param items Array of items purchased
 * @param currency Currency code (e.g., "USD")
 * @param tax Tax amount
 * @param shipping Shipping cost
 * @param coupon Coupon code used
 * @param additionalData Optional additional tracking data (e.g., sessionId)
 */
export const trackPurchase = (transactionId: string, revenue: number, items: any[], currency: string = 'USD', tax?: number, shipping?: number, coupon?: string, additionalData: Partial<TrackingData> = {}): Promise<void> => {
  return trackEvent(TrackingEvent.PURCHASE, { transactionId, revenue, items, currency, tax, shipping, coupon, ...additionalData });
};

/**
 * Track a search event
 * @param searchTerm What the user searched for
 * @param searchResults Number of search results
 * @param additionalData Optional additional tracking data (e.g., sessionId)
 */
export const trackSearch = (searchTerm: string, searchResults: number, additionalData: Partial<TrackingData> = {}): Promise<void> => {
  return trackEvent(TrackingEvent.SEARCH, { searchTerm, searchResults, ...additionalData });
};

/**
 * Track when a customer taps an unavailable item.
 * Sparse, high-intent signal for missed demand.
 */
export const trackUnavailableItemAttempt = (
  itemId: string,
  itemName: string,
  itemCategory?: string,
  additionalData: Partial<TrackingData> = {}
): Promise<void> => {
  return trackEvent(TrackingEvent.UNAVAILABLE_ITEM_ATTEMPT, {
    itemId,
    itemName,
    itemCategory,
    ...additionalData,
  });
};

/**
 * Track a final customer action click from the public menu.
 * Stored against the active project analytics document.
 */
export const trackMenuAction = (
  menuAction: 'call' | 'whatsapp' | 'directions' | 'reserve' | 'order',
  additionalData: Partial<TrackingData> = {}
): Promise<void> => {
  return trackEvent(TrackingEvent.MENU_ACTION_CLICK, {
    menuAction,
    ...additionalData,
  });
};

/**
 * Track a user login event
 * @param userId User identifier
 * @param userType Type of user (e.g., "guest", "member")
 * @param additionalData Optional additional tracking data (e.g., sessionId)
 */
export const trackLogin = (userId: string, userType: string = 'customer', additionalData: Partial<TrackingData> = {}): Promise<void> => {
  return trackEvent(TrackingEvent.LOGIN, { userId, userType, ...additionalData });
};

// ============================================
// Decision Intelligence Tracking
// ============================================

/**
 * Track when a user clicks on a recommendation
 * @param blockType Which block was clicked (popular, quickPick, bestValue)
 * @param itemId ID of the recommended item
 * @param itemName Name of the recommended item
 * @param itemCategory Category of the item
 * @param price Price of the item
 * @param additionalData Optional additional tracking data
 */
export const trackDecisionBlockClick = (
  blockType: 'popular' | 'quickPick' | 'bestValue',
  itemId: string,
  itemName: string,
  itemCategory?: string,
  price?: number,
  additionalData: Partial<TrackingData> = {}
): Promise<void> => {
  return trackEvent(TrackingEvent.DECISION_BLOCK_CLICK, {
    blockType,
    itemId,
    itemName,
    itemCategory,
    price,
    ...additionalData
  });
};

/**
 * Track when Decision Blocks are rendered to the user
 * Fired ONCE per session when at least one block is shown
 * 
 * Why not use menu_view as proxy?
 * - menu_view fires even when blocks DON'T render (feature off, no items, TTL expired)
 * - This pollutes CTR denominator
 * - Accurate CTR = clicks / renders (not clicks / menu_views)
 * 
 * @param blocksShown Array of block types that were rendered
 * @param additionalData Optional additional tracking data
 */
export const trackDecisionBlocksRendered = (
  blocksShown: Array<'popular' | 'quickPick' | 'bestValue'>,
  additionalData: Partial<TrackingData> = {}
): Promise<void> => {
  return trackEvent(TrackingEvent.DECISION_BLOCKS_RENDERED, {
    blocksShown,
    blockCount: blocksShown.length,
    ...additionalData
  });
};

// ============================================
// Official Business Page (OBP) Tracking
// ============================================

/**
 * Track an OBP page view (customer opened the official business link)
 * Uses projectId='obp' as virtual project for analytics storage.
 * @param storeId Store ID
 * @param additionalData Optional additional tracking data (e.g., sessionId, tenantId, UTM)
 */
export const trackOBPView = (
  storeId: string | number,
  additionalData: Partial<TrackingData> = {}
): Promise<void> => {
  return trackEvent(TrackingEvent.OBP_VIEW, {
    storeId: String(storeId),
    projectId: 'obp',
    ...additionalData
  });
};

export const trackOBPLanguageAdoption = (
  storeId: string | number,
  obpLanguage: string,
  previousOBPLanguage?: string,
  additionalData: Partial<TrackingData> = {},
): Promise<void> => {
  return trackEvent(TrackingEvent.OBP_LANGUAGE_ADOPTION, {
    storeId: String(storeId),
    projectId: 'obp',
    obpLanguage,
    previousOBPLanguage,
    languageAdoptionReason: 'dwell',
    ...additionalData,
  });
};

/**
 * Track an OBP action button click (Call, WhatsApp, Directions, Reserve, Order, Feedback)
 * @param storeId Store ID
 * @param obpAction The action type
 * @param additionalData Optional additional tracking data
 */
export const trackOBPAction = (
  storeId: string | number,
  obpAction: 'call' | 'whatsapp' | 'directions' | 'reserve' | 'order' | 'feedback',
  additionalData: Partial<TrackingData> = {}
): Promise<void> => {
  return trackEvent(TrackingEvent.OBP_ACTION_CLICK, {
    storeId: String(storeId),
    projectId: 'obp',
    obpAction,
    ...additionalData
  });
};

/**
 * Track when a customer clicks "View Menu" from an OBP surface.
 *
 * T2-N-02 / A-07 PUBLIC-ROUTING-DOCTRINE: `obpSurface` distinguishes the
 * brand-level OBP (tenant root `/`) from an outlet OBP (`/{outletSlug}`).
 * Without this split, analytics cannot tell whether customers drop off at
 * the location-selection step or after — which is the core measurement
 * multi-outlet tenants need.
 *
 * @param storeId Store ID (the specific store rendering the CTA — for
 *                outlet OBPs this is the outlet's storeId, NOT the master).
 * @param obpSurface 'brand' when rendering the tenant root OBP, 'outlet'
 *                   when rendering `/{outletSlug}`.
 * @param additionalData Optional additional tracking data.
 */
export const trackOBPMenuClick = (
  storeId: string | number,
  obpSurface: 'brand' | 'outlet' = 'brand',
  additionalData: Partial<TrackingData> = {}
): Promise<void> => {
  return trackEvent(TrackingEvent.OBP_MENU_CLICK, {
    storeId: String(storeId),
    projectId: 'obp',
    obpSurface,
    ...additionalData
  });
};

export const trackOBPLinkClick = (
  storeId: string | number,
  obpLink: 'google_review' | 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'youtube' | 'whatsapp' | 'website',
  additionalData: Partial<TrackingData> = {}
): Promise<void> => {
  return trackEvent(TrackingEvent.OBP_LINK_CLICK, {
    storeId: String(storeId),
    projectId: 'obp',
    obpLink,
    ...additionalData
  });
};

/**
 * Track when an owner shares OBP link (via WhatsApp, copy link, or copy message).
 * Measures distribution behavior — the key adoption metric.
 * @param storeId Store ID
 * @param shareMethod How the owner shared the link
 * @param additionalData Optional additional tracking data
 */
export const trackOBPShare = (
  storeId: string | number,
  shareMethod: 'whatsapp' | 'copy_link' | 'copy_message',
  additionalData: Partial<TrackingData> = {}
): Promise<void> => {
  return trackEvent(TrackingEvent.OBP_SHARE, {
    storeId: String(storeId),
    projectId: 'obp',
    obpAction: shareMethod,
    ...additionalData
  });
};

// ============================================
// Project Switch Tracking (G-10, customer-side)
// ============================================

/**
 * Track when a customer switches between a store's projects.
 *
 * G-10 (§11 + D-04 PUBLIC-ROUTING-DOCTRINE): measures cross-project
 * exploration. Fires from two surfaces:
 *   - `in_menu`: the customer tapped the in-menu project switcher (D-04).
 *   - `obp_secondary_card`: the customer tapped a secondary project card on
 *     OBP (G-06, when the store has ≥2 projects).
 *
 * @param storeId Store whose projects the customer is navigating.
 * @param toProjectId The project being switched TO.
 * @param fromProjectId Optional — the project being switched FROM.
 * @param source Which surface triggered the switch.
 */
/**
 * T5-N-04: Extended source type includes 'menu_alias_layer2' — captures the
 * "latent switch" when customers hit `/menu` and are served the default project
 * via R5 Layer 2 universal alias (no project claims slug `menu`).
 */
export const trackProjectSwitch = (
  storeId: string | number,
  toProjectId: string,
  fromProjectId: string | null,
  source: 'in_menu' | 'obp_secondary_card' | 'menu_alias_layer2',
  additionalData: Partial<TrackingData> = {}
): Promise<void> => {
  return trackEvent(TrackingEvent.PROJECT_SWITCH, {
    storeId: String(storeId),
    projectId: toProjectId,
    fromProjectId: fromProjectId || undefined,
    switchSource: source,
    ...additionalData
  });
};

// ============================================
// Menu Kit Tracking (Owner-side, GA4-only)
// ============================================

/**
 * Track when an owner downloads or shares a Menu Kit asset.
 * GA4-only — no Firestore writes (owner-side event, not customer-side).
 *
 * @param action 'zip_download' | 'share_instagram' | 'share_whatsapp' | 'share_google_maps'
 * @param additionalData Optional additional tracking data
 */
export const trackMenuKitDownload = (
  action: 'zip_download' | 'share_instagram' | 'share_whatsapp' | 'share_google_maps',
  additionalData: Partial<TrackingData> = {}
): Promise<void> => {
  return trackEvent(TrackingEvent.MENU_KIT_DOWNLOAD, {
    menuKitAction: action,
    ...additionalData
  });
};
