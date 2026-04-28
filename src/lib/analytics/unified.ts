/**
 * Unified Analytics Tracking System
 * Handles both Firebase Analytics and Google Analytics 4 tracking
 * 
 * COST OPTIMIZATION:
 * - Client-side debouncing prevents duplicate events
 * - Rate limiting prevents abuse (max 30 events/minute)
 * - Session-based deduplication for menu views
 */
import { trackAnalyticsEvent } from '@database/analytics';
import { logger } from '@lib/monitoring/logger';
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
  MAX_EVENTS_PER_MINUTE: 30,      // Max events per minute per session
  DEBOUNCE_MS: 1000,               // Debounce window for same event type
  MENU_VIEW_COOLDOWN_MS: 30000,    // 30 second cooldown for menu views (same project)
};

// Track recent events for rate limiting
const recentEvents: Map<string, number[]> = new Map();
const lastEventTime: Map<string, number> = new Map();
const menuViewTracker: Map<string, number> = new Map();

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
    logger.warn('Analytics rate limit exceeded', { eventKey, count: timestamps.length });
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
    logger.debug('Analytics event debounced', { eventType, projectId });
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
    logger.debug('Menu view cooldown active', { projectId });
    return true;
  }

  menuViewTracker.set(projectId, now);
  return false;
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
  LOGIN = 'login',                   // User login
  SIGN_UP = 'sign_up',               // User registration
  SHARE = 'share',                   // Sharing content
  USER_LOCATION = 'user_location',   // User location tracking

  // Official Business Page (OBP) events
  OBP_VIEW = 'obp_view',                    // Customer opened the OBP page
  OBP_ACTION_CLICK = 'obp_action_click',    // Customer clicked Call/WhatsApp/Directions on OBP
  OBP_MENU_CLICK = 'obp_menu_click',        // Customer clicked "View Menu" from OBP → measures OBP→menu conversion
  OBP_SHARE = 'obp_share',                  // Owner shared OBP link via WhatsApp/copy — measures distribution behavior

  // G-10 (§11 + D-04 PUBLIC-ROUTING-DOCTRINE): customer-side project switch.
  // Fires when the customer switches between projects via the in-menu
  // project switcher (D-04) or the OBP secondary-project card (G-06).
  // Measures how often customers explore beyond the default project — key
  // signal for deciding when to promote a "Browse all menus" affordance.
  PROJECT_SWITCH = 'project_switch',

  // T5-N-02 / §11 PUBLIC-ROUTING-DOCTRINE: G-08 subdomain immutability guard.
  // Fires server-side when an owner attempts to mutate subdomain after first
  // publish and the guard blocks it. Key security/support signal — repeated
  // attempts may indicate confusion or attempted circumvention.
  SUBDOMAIN_MUTATION_BLOCKED = 'subdomain_mutation_blocked',

  // T5-N-03 / §11 PUBLIC-ROUTING-DOCTRINE: G-11 manifest degradation via A-12
  // fallback ladder. Fires when the original install target (project URL,
  // outlet-scoped menu, etc.) is gone and the manifest degrades start_url to
  // a working fallback. Measures how often the A-12 ladder actually saves
  // customer installs from becoming 404s.
  MANIFEST_START_URL_DEGRADED = 'manifest_start_url_degraded',

  // Owner-side events (lightweight, GA4-only — no Firestore writes)
  MENU_KIT_DOWNLOAD = 'menu_kit_download',  // Owner downloaded Menu Kit ZIP or shared individual asset

  // Customer App (installable PWA surface) events — stored with projectId='customerApp'
  CUSTOMER_APP_PROMPT_SHOWN = 'customer_app_prompt_shown',          // Install prompt rendered to customer
  CUSTOMER_APP_PROMPT_DISMISSED = 'customer_app_prompt_dismissed',  // Customer dismissed install prompt
  CUSTOMER_APP_INSTALL_STARTED = 'customer_app_install_started',    // Customer tapped "Install" (before native prompt)
  CUSTOMER_APP_INSTALLED = 'customer_app_installed',                // appinstalled event fired — deduped per-device via localStorage
  CUSTOMER_APP_OPENED = 'customer_app_opened',                      // App launched in display-mode: standalone
  CUSTOMER_APP_SHORTCUT_MENU = 'customer_app_shortcut_menu',        // Menu shortcut launched (?source=shortcut-menu)
  CUSTOMER_APP_SHORTCUT_CALL = 'customer_app_shortcut_call',        // Call shortcut launched (?source=shortcut-call)
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
  includeLocation?: boolean;  // Whether approximate location data may be collected

  // Search properties
  searchTerm?: string;        // What the user searched for
  searchResults?: number;     // Number of search results
  menuAction?: 'call' | 'whatsapp' | 'directions' | 'reserve' | 'order';

  // Recommendation properties (Decision Intelligence)
  blockType?: 'popular' | 'quickPick' | 'bestValue';  // Which recommendation block
  recommendationPosition?: number;                     // Position in the block (1, 2, 3)

  // UTM parameters
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;

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
   * T2-N-03 / §6 rule 4 PUBLIC-ROUTING-DOCTRINE: which surface the customer
   * was on when the install fired (or launched into, for OPENED events).
   * 'obp' = tenant root, 'menu-alias' = Layer 2 `/menu`, 'project' =
   * canonical `/{slug}` or `/{outletSlug}/{slug}`, 'unknown' = unclassifiable.
   * Paired with G-03's per-surface manifest to verify install_context ==
   * launch_context (D-10).
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

  // T5-N-03: G-11 manifest degradation via A-12 fallback ladder.
  originalPath?: string;      // Original start_url before degradation
  degradedTo?: string;        // Final resolved start_url after degradation
  degradationSteps?: number;  // How many rungs down the ladder we went

  // T5-N-04: G-10 project switch source extension.
  // 'menu_alias_layer2' = customer typed /menu and got served default project.
  // This is distinct from 'obp_secondary_card' and 'in_menu' — it captures
  // the "latent switch" from URL typed to project rendered.
  switchSource?: 'obp_secondary_card' | 'in_menu' | 'menu_alias_layer2' | string;

  // Additional properties
  [key: string]: any;         // Any other custom properties
}

/**
 * Unified tracking function that handles both Firebase and GA4
 * 
 * COST OPTIMIZATION:
 * - Debounces rapid-fire events (1 second window)
 * - Rate limits to 30 events/minute per session
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
      logger.warn('Analytics event blocked by rate limit', { eventName });
      return;
    }

    // COST OPTIMIZATION: Debounce rapid-fire same events
    if (shouldDebounce(eventName, data.projectId)) {
      return; // Silently skip (already logged in shouldDebounce)
    }

    // COST OPTIMIZATION: Special handling for menu views
    if (eventName === TrackingEvent.MENU_VIEW && shouldBlockMenuView(data.projectId)) {
      return; // Silently skip (already logged in shouldBlockMenuView)
    }

    // Track in Firebase Analytics
    await trackFirebaseEvent(eventName, data);

    // Track in Google Analytics 4
    trackGA4Event(eventName, data);

    logger.debug('Analytics event tracked', { eventName, hasData: !!data });
  } catch (error) {
    logger.error('Analytics tracking failed', error, { eventName });
  }
};

/**
 * Track event in Firebase Analytics
 */
const trackFirebaseEvent = async (eventName: TrackingEvent, data: TrackingData): Promise<void> => {
  try {
    // Get device info
    const deviceInfo = getDeviceInfo();

    // Get current hour (UTC)
    const now = new Date();
    const hour = now.getUTCHours().toString().padStart(2, '0');

    // Create device key
    const deviceKey = deviceInfo.type || 'unknown';

    const includeLocation = data.includeLocation !== false;
    const locationAwareEvents = new Set<TrackingEvent>([
      TrackingEvent.PAGE_VIEW,
      TrackingEvent.MENU_VIEW,
      TrackingEvent.ITEM_CLICK,
      TrackingEvent.PURCHASE,
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
        console.warn('Could not get location info:', error);
      }
    }

    // Ensure we have a session ID
    const sessionId = data.sessionId || getSessionId();

    // Prepare update data
    const updateData: any = {
      // Add session ID to all events for unique visitor tracking
      sessionId: sessionId
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
          if (data.utm_source) {
            updateData[`viewsBySource.${data.utm_source}`] = 1;
          } else {
            updateData[`viewsBySource.direct`] = 1;
          }
          if (data.utm_medium) updateData[`viewsByMedium.${data.utm_medium}`] = 1;
          if (data.utm_campaign) updateData[`viewsByCampaign.${data.utm_campaign}`] = 1;
          // T5-N-01: R5 Layer resolution split — lets us measure how often /menu
          // resolves via Layer 1 (owner-claimed slug) vs Layer 2 (universal alias).
          if (data.menuResolutionLayer) {
            updateData[`menuResolutionLayer.${data.menuResolutionLayer}`] = 1;
          }
        }
        break;

      case TrackingEvent.ITEM_VIEW:
        // ITEM_VIEW = item modal opened (impression)
        // Separate from ITEM_CLICK for proper CTR calculation
        if (!data.itemId) {
          console.error('Item ID is required for item view tracking');
          return;
        }

        updateData.totalItemViews = 1;
        updateData[`viewsByItem.${data.itemId}`] = 1;  // Per-item impressions
        updateData[`hourlyItemViews.${hour}`] = 1;

        // Store item name if provided
        if (data.itemName) {
          updateData[`itemNames.${data.itemId}`] = data.itemName;
        }
        break;

      case TrackingEvent.ITEM_CLICK:
        // ITEM_CLICK = explicit user action (add to cart, order, etc.)
        if (!data.itemId) {
          console.error('Item ID is required for item click tracking');
          return;
        }

        updateData.totalClicks = 1;
        updateData[`clicksByDevice.${deviceKey}`] = 1;
        if (locationKey) updateData[`clicksByLocation.${locationKey}`] = 1;
        updateData[`clicksByItem.${data.itemId}`] = 1;
        updateData[`hourlyClicks.${hour}`] = 1;
        // NEW: Track which items are clicked at which hours (for time eligibility)
        updateData[`hourlyClicksByItem.${data.itemId}.${hour}`] = 1;

        // Store item name if provided
        if (data.itemName) {
          updateData[`itemNames.${data.itemId}`] = data.itemName;
        }
        break;

      case TrackingEvent.PURCHASE:
        updateData.totalOrders = 1;
        updateData.totalRevenue = data.revenue || 0;
        updateData[`ordersByDevice.${deviceKey}`] = 1;
        if (locationKey) updateData[`ordersByLocation.${locationKey}`] = 1;
        updateData[`hourlyOrders.${hour}`] = 1;
        break;

      case TrackingEvent.SEARCH:
        updateData.totalSearches = 1;
        updateData[`hourlySearches.${hour}`] = 1;
        if (data.searchTerm) {
          updateData[`searchTerms.${data.searchTerm.toLowerCase()}`] = 1;
          if ((data.searchResults || 0) === 0) {
            updateData.zeroResultSearches = 1;
            updateData[`zeroResultSearchTerms.${data.searchTerm.toLowerCase()}`] = 1;
          }
        }
        break;

      case TrackingEvent.UNAVAILABLE_ITEM_ATTEMPT:
        if (!data.itemId) {
          console.error('Item ID is required for unavailable item tracking');
          return;
        }
        updateData.totalUnavailableItemTaps = 1;
        updateData[`unavailableItemTapsByItem.${data.itemId}`] = 1;
        updateData[`hourlyUnavailableItemTaps.${hour}`] = 1;
        if (data.itemName) {
          updateData[`itemNames.${data.itemId}`] = data.itemName;
        }
        break;

      case TrackingEvent.MENU_ACTION_CLICK:
        if (!data.menuAction) {
          console.error('menuAction is required for menu action click tracking');
          return;
        }
        updateData.totalMenuActionClicks = 1;
        updateData[`menuActionClicks.${data.menuAction}`] = 1;
        updateData[`hourlyMenuActionClicks.${hour}`] = 1;
        break;

      case TrackingEvent.DECISION_BLOCK_CLICK:
        if (!data.itemId || !data.blockType) {
          console.error('Item ID and block type are required for recommendation click tracking');
          return;
        }
        updateData.totalRecommendationClicks = 1;
        updateData[`recommendationClicks.${data.blockType}`] = 1;
        updateData[`recommendationClicksByItem.${data.itemId}`] = 1;
        updateData[`hourlyRecommendationClicks.${hour}`] = 1;
        break;

      case TrackingEvent.OBP_VIEW:
        // Official Business Page view — stored with projectId='obp'
        updateData.totalOBPViews = 1;
        updateData[`viewsByDevice.${deviceKey}`] = 1;
        if (locationKey) updateData[`viewsByLocation.${locationKey}`] = 1;
        updateData[`hourlyViews.${hour}`] = 1;
        updateData.totalSessions = 1;
        if (data.utm_source) {
          updateData[`viewsBySource.${data.utm_source}`] = 1;
        } else {
          updateData[`viewsBySource.direct`] = 1;
        }
        if (data.utm_medium) updateData[`viewsByMedium.${data.utm_medium}`] = 1;
        if (data.utm_campaign) updateData[`viewsByCampaign.${data.utm_campaign}`] = 1;
        break;

      case TrackingEvent.OBP_ACTION_CLICK:
        // OBP action button click (Call, WhatsApp, Directions)
        if (!data.obpAction) {
          console.error('obpAction is required for OBP action click tracking');
          return;
        }
        updateData.totalOBPActionClicks = 1;
        updateData[`obpActionClicks.${data.obpAction}`] = 1;
        updateData[`hourlyOBPActionClicks.${hour}`] = 1;
        break;

      case TrackingEvent.OBP_MENU_CLICK: {
        // OBP → Menu conversion click (customer clicked "View Menu" from OBP)
        // T2-N-02 / A-07: per-surface split so brand-OBP vs outlet-OBP
        // conversion can be measured independently.
        updateData.totalOBPMenuClicks = 1;
        updateData[`hourlyOBPMenuClicks.${hour}`] = 1;
        const obpSurface = data.obpSurface === 'outlet' ? 'outlet' : 'brand';
        updateData[`obpMenuClicksBySurface.${obpSurface}`] = 1;
        break;
      }

      case TrackingEvent.OBP_SHARE:
        // Owner shared OBP link via WhatsApp/copy — measures distribution behavior
        if (!data.obpAction) {
          console.error('obpAction (shareMethod) is required for OBP share tracking');
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
          console.error('blocksShown array is required for render tracking');
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
        // T2-N-03 / §6 rule 4: per-surface install breakdown so multi-outlet
        // tenants can measure OBP vs outlet vs project install mix.
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
        // T2-N-03 / §6 rule 4: per-surface app-open breakdown. Comparing
        // installsBySurface vs appOpensBySurface over time tells us whether
        // install_surface matches launch_surface (D-10 invariant).
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
        // For other events, just track the occurrence
        updateData[`events.${eventName}`] = 1;
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
    await trackAnalyticsEvent(updateData, data.tenantId, data.storeId, effectiveProjectId);
  } catch (error) {
    console.error('Error tracking Firebase event:', error);
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
    console.error('Error tracking GA4 event:', error);
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

/**
 * Track an OBP action button click (Call, WhatsApp, Directions, Reserve, Order)
 * @param storeId Store ID
 * @param obpAction The action type
 * @param additionalData Optional additional tracking data
 */
export const trackOBPAction = (
  storeId: string | number,
  obpAction: 'call' | 'whatsapp' | 'directions' | 'reserve' | 'order',
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
