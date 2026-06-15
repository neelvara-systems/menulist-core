/**
 * Feature Flags Configuration
 * Toggle features on/off for testing, gradual rollout, or A/B testing
 */

export const FEATURE_FLAGS = {
    /**
     * Enable the MyCodex documentation reader.
     *
     * This is a private developer surface mounted through /__mycodex locally
     * and the dedicated menulist.digital host on Vercel. It must not claim
     * MenuList or Answerlattice production domains.
     */
    ENABLE_MYCODEX_READER: true,

    /**
     * Enable browser-local read-aloud controls in MyCodex.
     *
     * This uses the user's device/browser SpeechSynthesis engine only. It
     * must not call OpenAI, Google Cloud, Firebase, or any provider route.
     */
    ENABLE_MYCODEX_AUDIO_READER: true,

    /**
     * Enable the internal Website Asset Operating System package.
     *
     * This is a separate-product-style internal architecture used only by
     * repo scripts under packages/asset-factory. It must not expose a public
     * route, owner-facing MenuList UI, or Answerlattice runtime behavior.
     */
    ENABLE_WEBSITE_ASSET_OPERATING_SYSTEM: true,

    /**
     * Enable the CampaignCue public product shell.
     *
     * CampaignCue is a separate product in the shared app. This flag only
     * activates the static public surface mounted locally at /__campaigncue
     * and on the CampaignCue product domain. It must not enable provider
     * calls, Firebase writes, publishing, billing, or MenuList write-back.
     */
    ENABLE_CAMPAIGNCUE_PUBLIC_SITE: true,

    /**
     * CampaignCue runtime module gates.
     *
     * App shell, source context, deterministic generation, and analytics are
     * enabled for the manual/export-first runtime. Direct provider publishing
     * and billing remain disabled until credentials, opt-in, spend approval,
     * webhook, and checkout controls are configured.
     */
    ENABLE_CAMPAIGNCUE_APP_SHELL: true,
    ENABLE_CAMPAIGNCUE_SOURCE_INTEGRATIONS: true,
    ENABLE_CAMPAIGNCUE_GENERATION: true,
    ENABLE_CAMPAIGNCUE_PUBLISHING: false,
    ENABLE_CAMPAIGNCUE_BILLING: false,
    ENABLE_CAMPAIGNCUE_ANALYTICS: true,

    /**
     * Shared Creative Editor runtime.
     *
     * The base editor is product-neutral shared infrastructure. Product
     * adapters provide source data, trust metadata, persistence, and export
     * behavior. The default implementation uses a Fabric.js canvas runtime
     * mapped into the neutral CreativeEditorDocument contract, plus qrcode for
     * QR layers.
     */
    ENABLE_SHARED_CREATIVE_EDITOR: true,
    ENABLE_SHARED_CREATIVE_EDITOR_INTERACTIVE_CANVAS: true,
    ENABLE_SHARED_CREATIVE_EDITOR_FABRIC_ADAPTER: true,
    ENABLE_CREATIVE_EDITOR_TEMPLATE_REGISTRY: true,
    ENABLE_CREATIVE_EDITOR_USER_TEMPLATES: true,

    /**
     * CampaignCue Creative Editor adapter.
     *
     * CampaignCue can seed the shared editor from campaign outputs or a blank
     * Asset Library flow. Exports remain manual/download-first and register
     * metadata through CampaignCue Asset Library; this does not enable direct
     * posting, social account connection, ad spend mutation, or billing.
     */
    ENABLE_CAMPAIGNCUE_CREATIVE_EDITOR: true,
    ENABLE_CAMPAIGNCUE_EDITOR_TEST_ROUTE: true,
    ENABLE_CAMPAIGNCUE_EDITOR_AI_TOOLS: true,
    ENABLE_CAMPAIGNCUE_DESIGN_CUE: true,
    ENABLE_CAMPAIGNCUE_DESIGN_CUE_MODEL_ASSIST: false,
    ENABLE_CAMPAIGNCUE_RENDERED_ASSET_EXPORTS: true,
    ENABLE_CAMPAIGNCUE_CUE_LAYERS: true,
    ENABLE_CAMPAIGNCUE_CUE_LAYERS_UPLOAD: true,
    ENABLE_CAMPAIGNCUE_CUE_LAYERS_GENERATED_SOURCE: false,
    ENABLE_CAMPAIGNCUE_CUE_LAYERS_TEXT_EDITABLE: false,
    ENABLE_CAMPAIGNCUE_CUE_LAYERS_VECTOR_EDITABLE: false,
    ENABLE_CAMPAIGNCUE_CUE_LAYERS_BACKGROUND_REPAIR: false,
    ENABLE_CAMPAIGNCUE_CUE_LAYERS_SVG_EXPORT: false,
    ENABLE_CAMPAIGNCUE_CUE_LAYERS_REPAIR_WORKER: false,
    ENABLE_CAMPAIGNCUE_CUE_LAYERS_LARGE_CANVAS_EXPORT: false,

    /**
     * Enable Upstash rate limiting
     *
     * true: Use Upstash for rate limiting (production)
     * false: Skip rate limiting (development/testing)
     *
     * Why disable in development?
     * - No need to set up Upstash locally
     * - Unlimited testing without hitting limits
     * - No 60-second wait after 30 requests
     * - Faster development workflow
     *
     * Production: Always keep this true
     * Development: Set to false for easier testing
     *
     * Note: Rate limiting still works with feature flag off,
     * it just always returns { allowed: true }
     */
    ENABLE_RATE_LIMITING: true, // Toggle this for dev/prod

    /**
     * Enable Firebase App Check with reCAPTCHA v3
     *
     * ✅ 100% FREE - No cost concerns!
     *
     * true: Enable App Check bot protection (production)
     * false: Skip App Check initialization (development)
     *
     * What is App Check?
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * Firebase App Check protects your backend resources from:
     * - 🤖 Bot attacks and automated scraping
     * - 🚫 DDoS attacks
     * - 🔓 Unauthorized API access
     * - 💰 Abuse of paid services (Gemini AI, Cloud Functions)
     *
     * How reCAPTCHA v3 Works:
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     *
     * 🔍 When It Runs:
     *    - On every page load (invisible)
     *    - On Firebase API calls (Firestore, Storage, Functions)
     *    - Auto-refresh every 5-10 minutes
     *
     * 📊 How Assessments Work:
     *    - reCAPTCHA analyzes user behavior (mouse movements, timing, etc.)
     *    - Generates risk score: 0.0 (bot) to 1.0 (human)
     *    - Firebase validates token before allowing request
     *    - All happens invisibly - no user interaction needed
     *
     * 💰 Cost Breakdown:
     *    - reCAPTCHA v3: COMPLETELY FREE (unlimited assessments)
     *    - Firebase App Check: FREE service
     *    - No monthly limits
     *    - No credit card required
     *    - Total cost: $0.00 ✅
     *
     * ⚠️ Don't Confuse With:
     *    - reCAPTCHA Enterprise ($1 per 1k assessments) ← NOT using this
     *    - reCAPTCHA v2 checkbox ← NOT using this
     *    - We use FREE reCAPTCHA v3 ✅
     *
     * When Assessments Count:
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * 1. User loads page → 1 assessment (FREE)
     * 2. User queries Firestore → Token validated (FREE)
     * 3. Token expires (5-10 min) → Auto-refresh (FREE)
     * 4. User uploads to Storage → Token validated (FREE)
     *
     * Average: 6-12 assessments per user session (all FREE!)
     *
     * Why Disable in Development?
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * - ✅ Skip reCAPTCHA site key setup
     * - ✅ Skip Firebase Console configuration
     * - ✅ Faster local development
     * - ✅ No App Check token errors during testing
     * - ✅ Simpler onboarding for new developers
     *
     * Note: Dev mode uses debug tokens automatically (bypasses reCAPTCHA)
     *
     * Production: ALWAYS keep this true (protect your APIs!)
     * Development: Set to false to skip setup (or true to test App Check)
     *
     * Setup Requirements (Production):
     * 1. Get reCAPTCHA v3 site key (https://www.google.com/recaptcha/admin)
     * 2. Add NEXT_PUBLIC_RECAPTCHA_SITE_KEY to .env
     * 3. Register app in Firebase Console → App Check
     * 4. Set APIs to "Monitoring" mode (24-48 hours)
     * 5. Switch to "Enforced" mode
     *
     * Documentation: FIREBASE_APP_CHECK_SETUP_GUIDE.md
     */
    ENABLE_APP_CHECK: true, // Toggle this for dev/prod

    /**
     * Enable Sentry error tracking and monitoring
     *
     * ✅ PRODUCTION-READY - Dual dev/prod projects configured!
     *
     * true: Enable Sentry tracking
     * false: Disable Sentry completely (no events sent, no overhead)
     *
     * How It Works (Dual Projects):
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     *
     * 🔧 DEVELOPMENT:
     *    - Errors → Dev Sentry project
     *    - Clean separation from production
     *    - Full context: tenant, store, subscription
     *
     * 🚀 PRODUCTION:
     *    - Errors → Production Sentry project
     *    - Release tracking with git commit SHA
     *    - User context with email-friendly username
     *    - Session replay for visual debugging
     *    - Performance monitoring (10% sample rate)
     *
     * What Gets Tracked:
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * - ✅ Errors with full stack traces
     * - ✅ User context (tenant/store/subscription)
     * - ✅ API call breadcrumbs
     * - ✅ User action breadcrumbs
     * - ✅ Business events
     * - ✅ Performance metrics
     * - ✅ Session replays (on errors)
     *
     * Production: ALWAYS keep this true
     * Development: Keep true to test error tracking, false for pure local dev
     */
    ENABLE_SENTRY: true,

    /**
     * Enable Keyboard Shortcuts in Editor
     *
     * ✅ Power User Feature - Boost productivity!
     *
     * true: Enable all keyboard shortcuts (default)
     * false: Disable keyboard shortcuts completely
     *
     * Available Shortcuts:
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     *
     * 📝 ITEM OPERATIONS:
     *    Ctrl+N         → Add new item
     *    Ctrl+Shift+N   → Add new category
     *    E              → Edit selected item
     *    Delete         → Delete selected item
     *    Ctrl+I         → Toggle item active/inactive
     *
     * 🔀 NAVIGATION:
     *    ↑ (Arrow Up)   → Select previous item
     *    ↓ (Arrow Down) → Select next item
     *    Escape         → Clear selection
     *
     * 💾 ACTIONS:
     *    Ctrl+S         → Save changes
     *    Ctrl+F         → Focus search
     *    ?              → Show shortcuts help
     *
     * 🎯 BATCH MODALS:
     *    Ctrl+L         → Language settings
     *    Ctrl+D         → AI description generator
     *    Ctrl+M         → Image upload modal
     *    Ctrl+B         → Bulk status change
     *    Ctrl+R         → Reorder menu
     *
     * Why Disable?
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * - Conflicts with browser/OS shortcuts
     * - A/B testing the feature
     * - User preference (some prefer mouse-only)
     * - Debugging issues related to shortcuts
     * - Gradual rollout to users
     *
     * Note: When disabled, all keyboard event listeners
     * are removed - zero performance overhead.
     */
    ENABLE_EDITOR_KEYBOARD_SHORTCUTS: true, // Toggle to enable/disable

    /**
     * Enable Decision Blocks (Recommendation Engine)
     *
     * ✅ DECISION INTELLIGENCE - Help customers decide faster!
     *
     * true: Show recommendation blocks at top of menu
     * false: Hide recommendation blocks (gradual rollout)
     *
     * What It Shows:
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     *
     * ⭐ POPULAR RIGHT NOW:
     *    - Most viewed/ordered items
     *    - Based on views, clicks, and owner boost
     *    - "Customer favorite right now"
     *
     * ⚡ QUICK PICK:
     *    - Fastest to prepare/deliver
     *    - Based on duration field
     *    - "Ready in 10 min"
     *
     * 💰 BEST VALUE:
     *    - High popularity relative to price
     *    - "Worth the price"
     *
     * How It Works:
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * - Scheduler-owned scoring writes a project-embedded public projection
     * - Client runtime only applies TTL, availability, time-slot, and owner-pin filters
     * - Tracks recommendation views and clicks
     * - Owner can toggle blocks and pin explicit choices
     *
     * Business Category Aware:
     * - Food: "Popular Right Now", "Quick Pick", "Best Value"
     * - Service: "Most Booked", "Quick Service", "Best Value"
     * - Retail: "Trending Now", "Best Value" (no Quick Pick)
     *
     * Why Disable?
     * - Gradual rollout to businesses
     * - A/B testing impact on ordering
     * - New feature validation
     *
     * Production: Enable for menus with sufficient data
     * Development: Enable to test the feature
     */
    ENABLE_DECISION_BLOCKS: true, // Toggle to enable/disable recommendation blocks

    /**
     * Enable category icons across owner and client menu surfaces
     *
     * true: Owners can assign a Lucide icon or emoji to a category
     * false: Category icons are hidden and category titles stay text-only
     *
     * Scope:
     * - Category create/edit flows
     * - Owner menu category listings
     * - Client-facing category tabs and headers
     *
     * Notes:
     * - Lucide is the primary recommended path
     * - Emoji is supported as an optional secondary choice
     * - Stored on category data as a simple string value
     */
    ENABLE_CATEGORY_ICONS: true,

    /**
     * Enable AI-assisted SEO & AEO generation in Business Settings.
     *
     * true: Show a single generate button that drafts title, description,
     * tagline, and keywords from business + menu data.
     * false: Manual SEO fields only.
     */
    ENABLE_SEO_AEO_GENERATION: true,

    /**
     * Enable one-click business copy setup in Business Presence.
     *
     * true: Show a dedicated setup surface that generates Official Page,
     * SEO/AEO, and Customer App copy from current business + menu data.
     * false: Owners configure each surface manually.
     */
    ENABLE_BUSINESS_COPY_GENERATION: true,

    /**
     * Social Content / Today Feature
     *
     * ✅ 3-YEAR ARCHITECTURE FREEZE - Ship everything at launch!
     *
     * Master toggle for the Social Content feature
     * When enabled, adds "Today" to sidebar navigation
     *
     * What It Does:
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     *
     * 📱 TODAY SCREEN:
     *    - One primary action per day
     *    - Passive campaigns as operational signals
     *    - Silence is a valid state
     *    - Skip removes immediately (no confirmation)
     *
     * 🎯 CAMPAIGN TYPES:
     *    - 5 Active: Meal Push, Bestseller, Slow Item, Festival, New Item
     *    - 4 Passive: Today's Special, Weekend Pick, Now Available, Menu Highlight
     *
     * 📤 EXECUTION SURFACES:
     *    - WhatsApp Status (primary India)
     *    - WhatsApp Message (copy-ready)
     *    - Printable Poster (A4/A5 with QR)
     *    - QR Tent, Digital Screen
     *
     * Philosophy (LOCKED):
     * - "What should I do today?" not "What campaigns can I run?"
     * - Authority through consistency, not proof
     * - Silence > relevance theater
     * - No metrics on Today screen
     * - No "campaign" word in UI copy
     *
     * Production: Enable when ready to launch
     * Development: Enable to test the feature
     */
    SOCIAL_CONTENT_ENABLED: true, // Master toggle - set to true when ready

    /**
     * Enable Past Activity history flow
     *
     * true: Show historical today actions in desktop and mobile
     * false: Hide all Past Activity entry points and block direct history routes
     */
    ENABLE_PAST_ACTIVITY_HISTORY: false,

    /**
     * Smart Distribution Mode
     *
     * Controls how platform/surface recommendations are made
     *
     * "heuristic": Rule-based (launch mode)
     *    - Item has image + short name → Instagram Feed
     *    - Festival content → WhatsApp Status
     *    - High-price item → Printed poster
     *
     * "learned": Data-driven (future upgrade)
     *    - Learn from export patterns
     *    - Time-of-day patterns
     *    - Per-store preferences
     *
     * Note: Architecture for "learned" exists from Day 1
     * Just flip this flag when data accumulates
     */
    SOCIAL_CONTENT_DISTRIBUTION_MODE: "heuristic" as "heuristic" | "learned",

    /**
     * Outcome Framing Mode
     *
     * Controls how campaign outcomes are presented
     *
     * "minimal": Conservative, trust-building (launch mode)
     *    - Simple signals: positive, neutral, insufficient_data
     *    - Non-comparative language only
     *    - "Customers noticed this item." NOT "more than usual"
     *
     * "standard": Richer observations (future upgrade)
     *    - Still non-comparative
     *    - More contextual closure messages
     *    - Pattern recognition across campaigns
     */
    SOCIAL_CONTENT_OUTCOME_MODE: "minimal" as "minimal" | "standard",

    /**
     * Image Generation Mode
     *
     * Controls AI image generation for campaigns
     *
     * "off": No AI image generation
     * "on_demand": Generate images when item has no photo
     *
     * Uses existing Imagen 3 / Gemini 2.0 infrastructure
     */
    SOCIAL_CONTENT_IMAGE_GENERATION: "on_demand" as "off" | "on_demand",

    /**
     * Direct Posting Mode
     *
     * Controls whether we can post directly to platforms
     *
     * "disabled": Export-only (launch mode)
     * "whatsapp_only": WhatsApp Business API integration
     * "full": All platform integrations
     *
     * Note: Architecture exists from Day 1, disabled until 100+ stores validated
     */
    SOCIAL_CONTENT_DIRECT_POSTING: "disabled" as
        | "disabled"
        | "whatsapp_only"
        | "full",

    /**
     * Today Weekly Growth Pack
     *
     * Adds a gated "Ready this week" pack inside the existing Today module.
     * Product status: paused after May 31, 2026 owner-value review.
     * Do not enable for rollout/freeze until a small owner pilot proves
     * that owners copy/share the pack without extra explanation.
     *
     * When enabled:
     * - Desktop Today shows copy-ready WhatsApp, Google post, Instagram caption, and staff line drafts
     * - Mobile Today shows the same pack from the real owner Today tab
     * - Copy is deterministic and built only from current MenuList truth
     * - No direct publishing, no scheduler, no new Firestore write path
     *
     * When disabled:
     * - Existing Today behavior is unchanged
     *
     * Firebase cost: $0.00 (client-side only)
     */
    ENABLE_TODAY_WEEKLY_GROWTH_PACK: false,

    /**
     * GrowthOS Add-on / Growth Kits
     *
     * Pro/Premium MenuList module that prepares copy/share-ready local growth
     * kits from current MenuList truth. This is intentionally separate from the
     * paused Today Weekly Growth Pack and is visible only when the owner has
     * an active Pro or Premium subscription.
     *
     * Launch boundaries:
     * - Manual copy/share/download/print only
     * - Deterministic Staff Brief in V1
     * - No direct posting, scheduler, offer invention, image generation, ROI,
     *   chatbot, or inbox behavior
     */
    ENABLE_GROWTHOS_ADDON: true,
    GROWTHOS_ADDON_ACCESS: "paid" as "disabled" | "pilot" | "paid",
    GROWTHOS_PILOT_STORE_IDS: [] as Array<string | number>,
    GROWTHOS_PAID_PLAN_IDS: ["pro", "premium"] as string[],
    GROWTHOS_DIRECT_POSTING: "disabled" as "disabled",
    GROWTHOS_STAFF_BRIEF_MODE: "deterministic" as "disabled" | "deterministic",
    GROWTHOS_IMAGE_MODE: "disabled" as "disabled" | "existing_only",
    GROWTHOS_REVIEW_REPLY_MODE: "manual_paste_guarded" as "disabled" | "manual_paste_guarded",
    GROWTHOS_OFFER_BUILDER_MODE: "disabled" as "disabled" | "pilot",
    GROWTHOS_QUICK_REPLIES_MODE: "disabled" as "disabled" | "pilot",
    GROWTHOS_PHOTO_PROMPTS_MODE: "disabled" as "disabled" | "pilot",
    GROWTHOS_MULTI_OUTLET_MODE: "disabled" as "disabled" | "pilot",
    GROWTHOS_USED_HISTORY_UI: "disabled" as "disabled" | "pilot",
    GROWTHOS_LOW_DATA_CACHE: "latest_only" as "disabled" | "latest_only" | "pilot",

    // ═══════════════════════════════════════════════════════════════
    // DIGITAL SCREENS
    // Per spec: 3-YEAR ARCHITECTURE FREEZE - Ship everything at launch!
    // ═══════════════════════════════════════════════════════════════

    /**
     * Digital Screens Master Toggle
     *
     * true: Digital Screen feature is enabled (screen URL works, settings visible)
     * false: Feature is disabled
     *
     * Per spec: Screen = trust surface, not marketing surface
     * Per spec: Decision system, not signage software
     */
    DIGITAL_SCREENS_ENABLED: true,

    /**
     * Screen Confidence Threshold
     *
     * Screens are public-facing; embarrassment cost is higher
     * Per spec: FR-12 - Screen confidence threshold = 0.7 (higher bar)
     */
    DIGITAL_SCREENS_CONFIDENCE_THRESHOLD: 0.7,

    /**
     * Digital Screens Default Mode
     *
     * "menu_board": Default URL shows full menu with categories, items, prices
     * "highlights": Default URL shows rotating promotional slides
     * "auto": System decides based on menu size (RESERVED — not implemented)
     *
     * Per spec v2.0: Menu Board is default. Highlights via ?mode=highlights URL param.
     * URL parameter always overrides this flag.
     *
     * @see __docs__/digital-screens/digital-screens_spec.md
     */
    DIGITAL_SCREENS_MODE: "menu_board" as "menu_board" | "highlights" | "auto",

    // ═══════════════════════════════════════════════════════════════
    // CONTINUOUS MENU INTELLIGENCE
    // Per spec: 3-YEAR ARCHITECTURE FREEZE - Ship everything at launch!
    // ═══════════════════════════════════════════════════════════════

    /**
     * Owner Control Usage Analytics (Authority Maturation Doctrine)
     *
     * true: Track owner control usage for maturation analysis
     * false: Disable tracking (zero Firebase writes for analytics)
     *
     * Per spec: Analytics should be NON-BLOCKING and cost-optimized
     * Affects: ownerBoost, decision block settings, screen override
     *
     * Production: Enable after validating cost impact
     * Development: Enable for testing, disable if costs spike
     */
    ENABLE_OWNER_ANALYTICS: false, // OFF by default for cost safety

    // ═══════════════════════════════════════════════════════════════
    // HOURS STATUS DISPLAY (Feature #2A)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Hours Status Display (Feature #2A)
     *
     * true: Show "Open now" / "Closed" badge on client menu
     * false: Hide hours status badge
     *
     * Uses existing workingHours and timeZone fields from store.
     * @see __docs__/hours-holiday-accuracy/hours-holiday-accuracy_impl.md
     */
    ENABLE_HOURS_STATUS_DISPLAY: true,

    /**
     * Menu Observation Layer (MOL v0)
     *
     * SILENT INFRASTRUCTURE - No UI, no owner visibility!
     *
     * true: Track menu changes to menuChangeLog collection
     * false: Disable tracking (zero Firebase writes)
     *
     * What It Tracks:
     *
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * - Price changes (old → new value)
     * - Availability toggles (sold out/available)
     * - Item additions/removals
     * - Category changes
     * - All changes are immutable (append-only log)
     *
     * Cost Optimizations:
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * - Feature-flag gated (instant disable if needed)
     * - Debounced writes (5 seconds per item per change type)
     * - Fire-and-forget (non-blocking, silent failures)
     * - No read-before-write (append-only)
     *
     * Estimated Cost:
     * - 100 restaurants × 10 changes/day = ~$0.15/month
     * - Negligible - but flag allows instant disable
     *
     * Per spec: Implements Category D (Owner Intervention Tracking)
     * @see __docs__/MOL-V0-IMPLEMENTATION-PLAN.md
     *
     * Production: Enable after testing
     * Development: Enable for testing, disable if costs spike
     */
    ENABLE_MENU_OBSERVATION: true, // Enabled — append-only event ledger for data gravity

    /**
     * Menu Observation storage mode.
     *
     * summary: one compact revision event per save/publish path.
     * detailed: per-item change events for focused debugging/learning windows.
     *
     * Default stays summary to avoid unbounded item-level ledgers for normal
     * SMB owner edits.
     */
    MENU_OBSERVATION_MODE: "summary" as "summary" | "detailed",

    /**
     * Menu Snapshots on Publish
     *
     * When enabled, every publishProject() call creates an immutable snapshot
     * of the full menu state in menuSnapshots/{tId}/{sId}/{snapshotId}.
     *
     * Cost:
     * - 1 write per publish (fire-and-forget)
     * - ~100KB per snapshot for 200-item menu
     * - 1000 stores × 5 publishes/month = 5000 writes = ~$0.01/month
     *
     * @see __docs__/canonical-truth-infrastructure/
     */
    ENABLE_MENU_SNAPSHOTS: true,

    /**
     * Full menu snapshot retention window.
     *
     * Snapshots are short-term proof/debug artifacts, not permanent history.
     * The publish path writes expiresAt using this window so cleanup/TTL policy
     * has a deterministic boundary.
     */
    MENU_SNAPSHOT_RETENTION_DAYS: 90,

    /**
     * AI operation storage mode.
     *
     * accounting_only keeps scope, action, model, token, charge, and status
     * fields but drops raw provider text. detailed may be used during bounded
     * provider debugging and gets a detailExpiresAt marker.
     */
    AI_OPERATION_LOG_MODE: "accounting_only" as "accounting_only" | "detailed",
    AI_OPERATION_DETAIL_RETENTION_DAYS: 14,
    MENU_EXTRACTION_DETAIL_RETENTION_HOURS: 2,
    IMAGE_BATCH_STATUS_HISTORY_LIMIT: 20,
    OWNER_NOTIFICATION_RETENTION_DAYS: 30,
    FEEDBACK_EVENT_RETENTION_DAYS: 180,
    SCHEDULER_RUN_LOG_RETENTION_DAYS: 90,

    // ═══════════════════════════════════════════════════════════════
    // AI IMAGE GENERATION (Feature)
    // Per spec: 3-YEAR ARCHITECTURE FREEZE - Ship everything at launch!
    // ═══════════════════════════════════════════════════════════════

    /**
     * AI Image Generation Master Toggle
     *
     * true: AI image generation enabled (single, batch, editing)
     * false: Feature disabled (generation buttons hidden)
     *
     * What It Does:
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * - Single image generation with style customization
     * - Batch image generation for multiple items
     * - Image editing (enhance, background change, etc.)
     * - Real-time progress tracking for batch jobs
     *
     * AI Models Used:
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * - Gemini 2.0 Flash (image generation with reference)
     * - Imagen 3 (text-to-image generation)
     *
     * @see __docs__/projects/ai-image-generation/ai-image-generation_impl.md
     *
     * Production: Enable when ready for AI image features
     * Development: Enable for testing
     */
    ENABLE_AI_IMAGE_GENERATION: true, // Implementation complete - enabled

    /**
     * Menu Observation Debounce Duration (milliseconds)
     *
     * How long to wait before writing a change log entry.
     * Multiple rapid changes to same item/field are batched.
     *
     * Default: 5000ms (5 seconds)
     * - Prevents write spam during rapid editing
     * - Still captures the final state
     */
    MENU_OBSERVATION_DEBOUNCE_MS: 5000,

    /**
     * Continuous Menu Intelligence Master Toggle
     *
     * true: CMI is enabled (nightly computation runs, state is used)
     * false: Feature is disabled (nightly job still runs but state is ignored)
     *
     * Per spec: CMI runs silently - no UI, no owner visibility
     * Affects: Campaign engine, slide generator, decision blocks
     */
    MENU_INTELLIGENCE_ENABLED: true,

    /**
     * CMI Confidence Thresholds
     *
     * CONFIDENT: Items above this can be auto-promoted
     * CAUTIOUS: Items below this may be auto-demoted
     */
    MENU_INTELLIGENCE_CONFIDENT_THRESHOLD: 0.65,
    MENU_INTELLIGENCE_CAUTIOUS_THRESHOLD: 0.35,

    /**
     * CMI Calibration Lock Day
     *
     * After this many days, project baseline is locked
     * No more recalibration - stability is prioritized
     */
    MENU_INTELLIGENCE_CALIBRATION_LOCK_DAY: 21,

    /**
     * CMI Minimum Stable Days for Auto-Promote
     *
     * Item must be stable for this many days before auto-promotion
     * Prevents volatility from triggering actions
     */
    MENU_INTELLIGENCE_MIN_STABLE_DAYS: 3,

    /**
     * Owner Upload Expiry (days)
     *
     * Per spec: Auto-expire after 14 days (silent fallback)
     * Prevents stale festival posters
     */
    DIGITAL_SCREENS_UPLOAD_EXPIRY_DAYS: 14,

    /**
     * Max Owner Uploads
     *
     * Per spec: Owner can upload custom images (max 3)
     */
    DIGITAL_SCREENS_MAX_UPLOADS: 3,

    // ═══════════════════════════════════════════════════════════════
    // GOOGLE BUSINESS PROFILE SYNC (Feature #3)
    // Per spec: 3-YEAR ARCHITECTURE FREEZE - Ship everything at launch!
    // ═══════════════════════════════════════════════════════════════

    /**
     * Google Business Profile Sync (Feature #3)
     *
     * true: GBP integration enabled (OAuth, nightly sync, hours apply)
     * false: GBP features hidden, no sync jobs run
     *
     * Prerequisites:
     * - GBP API access approved by Google
     * - OAuth client configured
     * - GOOGLE_GBP_CLIENT_ID and GOOGLE_GBP_CLIENT_SECRET set
     *
     * What It Does:
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * - Auto-syncs menu link (websiteUri) to GBP nightly
     * - Detects hours drift (weekly hours only, read-only)
     * - Manual hours apply button (owner-approved)
     * - MOL logging for all actions
     *
     * What It Does NOT Do (Phase 1):
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * - Reviews, posts, photos, Q&A
     * - Auto-hours write without approval
     * - Performance analytics/dashboard
     * - Holiday/special hours sync
     *
     * @see __docs__/gbp-sync/GBP_SYNC_impl.md
     *
     * Production: Enable after GBP API access approved
     * Development: Keep false until prerequisites met
     */
    ENABLE_GBP_SYNC: false, // Default OFF until prerequisites met

    // ═══════════════════════════════════════════════════════════════
    // MULTI-STORE BRAND CONSISTENCY (Feature #4)
    // Per spec: 3-YEAR ARCHITECTURE FREEZE - Ship everything at launch!
    // ═══════════════════════════════════════════════════════════════

    /**
     * Multi-Store Brand Consistency (Feature #4)
     *
     * true: Multi-store features enabled (master menus, linking, overrides)
     * false: Feature disabled (single-store behavior unchanged)
     *
     * What It Does:
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * - Enable master menu designation per tenant
     * - Link store projects to master
     * - Allow controlled overrides (price, availability)
     * - Add local-only items/categories
     * - Instant propagation on master update
     *
     * What It Does NOT Do:
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * - Franchise billing logic
     * - Approval workflows
     * - Store analytics comparisons
     *
     * @see __docs__/multi-outlet-consistency/multi-outlet-consistency_impl.md
     *
     * Production: Enable when ready for multi-store tenants
     * Development: Enable to test the feature
     */
    ENABLE_MULTI_OUTLET: true, // Implementation complete - enabled for testing

    /**
     * Allow changing which store is master
     *
     * true: Admin can change master store designation
     * false: First store is always master (default)
     *
     * Per spec: By default, first store is master. Enable this only
     * if client specifically requests ability to change master store.
     */
    ENABLE_CHANGE_MASTER_STORE: false, // Disabled by default

    /**
     * Allow unlinking store from master
     *
     * true: Store can unlink and become standalone
     * false: Once linked, store cannot unlink (chain invariant)
     *
     * Per spec FR-11: Chain consistency constraint - stores cannot
     * unlink from master. Enable only if standalone stores needed.
     */
    ENABLE_UNLINK_FROM_MASTER: false, // Disabled by default (chain invariant)

    // Multi-Outlet Store Onboarding (Feature #4C)
    // @see __docs__/multi-outlet-consistency/store-onboarding-flow_impl.md
    ENABLE_OUTLET_CREATION: true,           // Allow creating outlet stores from master
    ENABLE_PROJECT_PROPAGATION: true,       // Auto-create outlet projects when master creates new project
    ENABLE_OUTLET_BILLING: true,            // Quantity-based billing for outlets
    ENABLE_OUTLET_PRORATION_DISPLAY: true,  // Show proration estimate in add-outlet modal
    ENABLE_OUTLET_DEACTIVATE: true,         // Allow outlet deactivation from Chain Control Panel
    ENABLE_BILLING_REMOVAL_SCHEDULE: true,  // Schedule quantity reduction for next billing cycle
    ENABLE_CHAIN_CONTROL_PANEL: true,       // Show "Locations" sidebar item for master stores

    /**
     * Self-service subscription pause/resume.
     *
     * false: Owners cannot pause or resume subscriptions from billing UI and
     * direct pause/resume API calls return unavailable before provider mutation.
     * true: Re-enables the existing Razorpay pause/resume flow.
     *
     * Keep false unless MenuList deliberately decides to offer pause as a
     * billing policy. This preserves clear continuity: owners can change,
     * cancel, retry, or contact support, but cannot pause access themselves.
     */
    ENABLE_SUBSCRIPTION_PAUSE: false,

    /**
     * Maximum outlets per tenant (excluding master store).
     * Prevents runaway outlet creation. 30 covers large SMB chains.
     * Set to 0 for unlimited (not recommended).
     */
    MAX_OUTLETS_PER_TENANT: 30 as number,

    /**
     * Billing removal strategy on outlet deactivation.
     *
     * true: Reduce Razorpay quantity immediately on deactivation
     * false: Schedule quantity reduction for next billing cycle (deferred)
     *
     * Decision: Immediate removal is simpler and avoids stale billing state.
     * Razorpay prorates refunds automatically for mid-cycle quantity changes.
     */
    ENABLE_BILLING_REMOVAL_IMMEDIATE: true,

    /**
     * Master Updates Awareness Layer (Feature #4.1)
     *
     * true: Show awareness banner on outlet dashboards when master changes
     * false: No awareness banner (outlet still gets master changes via resolver)
     *
     * What It Does:
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * - Persistent banner on outlet dashboard when master menu changes
     * - Structured diff of operational changes (items, prices, categories)
     * - Outlet-context-aware (shows impact on local overrides)
     * - Banner persists until explicitly acknowledged by outlet owner
     *
     * What It Does NOT Do:
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * - Push notifications or emails
     * - Block outlet from working
     * - Approval workflows
     *
     * Depends on: ENABLE_MULTI_OUTLET must be true
     *
     * @see __docs__/multi-outlet-consistency/master-updates-awareness_impl.md
     *
     * Production: Enable when ready for outlet awareness
     * Development: Enable to test the feature
     */
    ENABLE_MASTER_UPDATE_AWARENESS: true, // Default OFF until implementation complete

    // ─────────────────────────────────────────────────────────────
    // GUEST FEEDBACK (Internal Feedback System)
    // @see __docs__/projects/internal-feedback-system/
    // ─────────────────────────────────────────────────────────────

    /**
     * Enable guest feedback collection from menus
     *
     * true: Show "Share Feedback" link on menus, enable feedback inbox
     * false: Hide all feedback UI, disable public endpoint
     *
     * Feature: Internal Feedback System
     * Purpose: Private reputation firewall - collect feedback before public reviews
     */
    ENABLE_GUEST_FEEDBACK: true,

    // ─────────────────────────────────────────────────────────────
    // EDITOR ONBOARDING & UX IMPROVEMENTS
    // @see __docs__/editor-ux-improvements/
    // ─────────────────────────────────────────────────────────────

    /**
     * Enable Editor onboarding and UX improvements
     *
     * true: Show welcome banners, enhanced save status, progressive disclosure
     * false: Original editor experience (no onboarding features)
     *
     * What It Does:
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * - Welcome banner for first-time Editor visitors
     * - Outlet onboarding banner (explains master/outlet relationship)
     * - Enhanced save status visibility (badge instead of subtle text)
     * - View switcher with descriptive tooltips
     * - Progressive disclosure in modals (advanced options collapsed)
     * - User-friendly terminology in UI labels
     *
     * @see __docs__/editor-ux-improvements/editor-ux-improvements_impl.md
     *
     * Production: Enable for improved onboarding
     * Development: Enable to test the feature
     */
    ENABLE_EDITOR_ONBOARDING: true,

    // ═════════════════════════════════════════════════════════════════
    // AI ENHANCEMENT PACKS (Cost Control)
    // ═════════════════════════════════════════════════════════════════

    /**
     * Master kill switch for ALL paid AI enhancement operations.
     *
     * When OFF:
     * - Free operations (extraction, base descriptions) continue working
     * - Paid operations (image gen, rewrites, translations) are disabled
     * - Calm message shown: "AI enhancements temporarily unavailable"
     * - No crash, no error — graceful degradation
     *
     * Use cases:
     * - Emergency: Gemini pricing spike or runaway API costs
     * - Abuse: Scripted API attack consuming credits
     * - Maintenance: Capacity system migration or recalibration
     *
     * @see __docs__/ai-enhancement-packs/ai-enhancement-packs_impl.md
     *
     * Production: Enable when capacity enforcement is ready
     * Emergency: Set to false to disable all paid AI operations instantly
     */
    ENABLE_AI_ENHANCEMENTS: true,

    /**
     * Owner Analytics AI Summaries — paid Gemini wording for analytics.
     *
     * This mirrors the Cloud Functions env flag:
     * `ENABLE_OWNER_ANALYTICS_AI_SUMMARIES=true`.
     *
     * Cost-impacting server paths:
     * - daily / weekly / monthly owner dashboard AI summaries
     * - Today Action List wording polish
     *
     * When disabled:
     * - deterministic analytics read models still write
     * - rules-based Today Action List still appears
     * - no Gemini call is made for analytics wording
     *
     * Production cost-safe default: false.
     */
    ENABLE_OWNER_ANALYTICS_AI_SUMMARIES: false,

    /**
     * Owner Business Assistant / Business Health
     *
     * Cost-first owner operating surface backed by scheduler-built summaries.
     * Owner-testable paths are enabled; provider spend and direct public-truth
     * mutation remain separately gated for cost and safety.
     *
     * Core read models:
     * - platformSummary/ownerBusinessHealthCurrent_{tId}_{sId}
     * - platformSummary/ownerBusinessAnalyticsIndex_{tId}_{sId}
     *
     * Action Support is separately gated so read-only Business Health can stay
     * enabled if action preparation or confirmed writes need to be disabled.
     *
     * @see __docs__/owner-business-assistant/
     */
    ENABLE_OWNER_BUSINESS_HEALTH: true,
    ENABLE_OWNER_BUSINESS_HEALTH_ANALYTICS_INDEX: true,
    ENABLE_OWNER_BUSINESS_HEALTH_TODAY_OVERLAY: true,
    ENABLE_OWNER_BUSINESS_HEALTH_DASHBOARD_CARD: true,
    ENABLE_OWNER_BUSINESS_HEALTH_PAGE: true,
    ENABLE_OWNER_BUSINESS_HEALTH_SUGGESTED_QUESTIONS: true,
    ENABLE_OWNER_BUSINESS_HEALTH_FREE_TEXT: true,
    ENABLE_OWNER_BUSINESS_HEALTH_AI_ANSWERS: false,
    ENABLE_OWNER_BUSINESS_HEALTH_CONTEXT_PACKET_CACHE: true,
    ENABLE_OWNER_BUSINESS_HEALTH_UPSTASH_CONTEXT_CACHE: true,
    ENABLE_OWNER_BUSINESS_HEALTH_THREADS: true,
    ENABLE_OWNER_BUSINESS_HEALTH_USAGE_LOGGING: true,
    ENABLE_OWNER_BUSINESS_HEALTH_MULTI_LOCATION: true,
    ENABLE_OWNER_BUSINESS_HEALTH_POS_AWARE_ANSWERS: false,
    ENABLE_OWNER_BUSINESS_ACTION_SUPPORT: true,
    ENABLE_OWNER_BUSINESS_ACTION_NAVIGATION: true,
    ENABLE_OWNER_BUSINESS_ACTION_DRAFTS: true,
    ENABLE_OWNER_BUSINESS_ACTION_CONFIRMED_WRITES: false,
    ENABLE_OWNER_BUSINESS_ACTION_PUBLIC_TRUTH: false,
    ENABLE_OWNER_BUSINESS_ACTION_MEDIA: false,
    ENABLE_OWNER_BUSINESS_ACTION_PROVIDER_TEXT: false,
    ENABLE_OWNER_BUSINESS_ACTION_PROVIDER_IMAGE: false,
    ENABLE_OWNER_BUSINESS_ACTION_CHECK_WORKFLOW: true,

    // ═══════════════════════════════════════════════════════════════
    // POS WEBHOOK SYNC (Menu Snapshot Broadcast)
    // ═══════════════════════════════════════════════════════════════

    /**
     * POS Webhook Sync — Automatic menu snapshot delivery to POS systems
     *
     * When enabled:
     * - "POS Sync" tab appears in Business Settings
     * - Menu changes trigger debounced webhook delivery
     * - Full menu snapshot sent to configured POS endpoint
     * - HMAC-SHA256 signed payloads with retry logic
     *
     * Architecture: Store-level only (each outlet configures its own POS)
     * Delivery: Queue-based via API route, never blocks UI
     * Payload: Full snapshot (no delta), all item/category fields
     *
     * @see __docs__/pos-webhook-sync/pos-webhook-sync_impl.md
     *
     * Production: Enable when ready for POS sync
     * Development: Enable to test the feature
     */
    ENABLE_POS_SYNC: true,

    // ═══════════════════════════════════════════════════════════════
    // MENU COMMAND CENTER (Bulk Operations)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Menu Command Center — Bulk menu operations modal
     *
     * Multi-action command center for bulk pricing, availability,
     * and category moves. Three-panel layout with live preview,
     * safety guardrails, and undo support.
     *
     * - Adjust Pricing: %, flat, fixed with guardrails
     * - Change Availability: available/unavailable in bulk
     * - Move to Category: reassign items across categories
     *
     * All changes computed client-side, saved via single updateProject().
     *
     * @see __docs__/menu-command-center/menu-command-center_impl.md
     *
     * Production: Enable when ready
     * Development: Enable to test the feature
     */
    ENABLE_MENU_COMMAND_CENTER: true,

    // ═══════════════════════════════════════════════════════════════
    // MENU CORRECTNESS ENGINE (MCE)
    // Validation layer — validates menu data on every save
    // ═══════════════════════════════════════════════════════════════

    /**
     * Menu Correctness Engine (MCE)
     *
     * Validation layer that checks menu data correctness on every save.
     * Stamps _mce verification metadata on project document.
     *
     * When enabled:
     * - All saves go through CSR validation (client-side, < 100ms)
     * - _mce field added to project document (same setDoc call)
     * - Publish-Gate blocks "Continue to UI Editor" if critical validation fails
     *
     * When disabled:
     * - Existing save flow unchanged
     * - No _mce field written
     * - No validation overhead
     *
     * Architecture:
     * - Zero new Firestore collections
     * - Zero additional Firebase cost
     * - CSR runs entirely client-side
     * - _mce metadata is part of existing setDoc merge call
     *
     * @see __docs__/menu-correctness-engine/menu-correctness-engine_impl.md
     *
     * Production: Enable after internal testing
     * Development: Enable to test MCE validation
     */
    ENABLE_MCE: true,

    // ═══════════════════════════════════════════════════════════════
    // SILENT CORRECTION SYSTEMS
    // @see __docs__/silent-correction-systems/
    // @see __docs__/constitution/18-silent-correction-doctrine.md
    // ═══════════════════════════════════════════════════════════════

    /**
     * Output Control Layer — Confidence-gated rendering
     *
     * When enabled:
     * - Hours display uses confidence-based degradation
     * - TRUSTED hours → full "Open Now" / "Closed" badges
     * - RISKY hours (stale >30 days) → "Hours may vary" (no badge)
     * - BROKEN hours (invalid/very stale) → "Check with store"
     *
     * When disabled:
     * - Hours display works as before (always shows Open/Closed)
     * - No confidence checks applied
     *
     * Cost: $0.00 — pure client-side computation, no extra reads
     *
     * @see src/lib/outputControl/hoursConfidence.ts
     *
     * Production: Enable after verifying hours data has modifiedOn timestamps
     * Development: Enable to test confidence-gated hours rendering
     */
    ENABLE_OUTPUT_CONTROL: false,

    /**
     * Naming Standardization — Silent name normalization
     *
     * When enabled:
     * - Item/category names are title-cased and trimmed on save
     * - Brand-safe detection skips mixed-case patterns (McChicken, iPod)
     * - Runs as part of MCE pipeline (same setDoc call, zero extra cost)
     *
     * When disabled:
     * - Names saved as-is (current behavior)
     *
     * Cost: $0.00 — pure client-side string operations
     *
     * @see src/lib/outputControl/namingStandardization.ts
     *
     * Production: Enable after testing with real menu data
     * Development: Enable to test naming normalization
     */
    ENABLE_NAMING_STANDARDIZATION: true,

    // ═══════════════════════════════════════════════════════════════
    // MENU QUALITY SIGNALS
    // @see __docs__/menu-quality-signals/
    // ═══════════════════════════════════════════════════════════════

    /**
     * Menu Quality Signals — Dashboard nudge panel
     *
     * When enabled:
     * - Dashboard shows a compact card with actionable quality signals
     * - Signals: missing descriptions, missing images, missing prices, large categories
     * - Each signal has an action button linking to the AI feature that fixes it
     * - "All clear" state when menu is complete
     *
     * When disabled:
     * - Quality signals panel hidden on dashboard and mobile
     *
     * Cost: $0.00 — pure client-side computation on already-fetched project data
     *
     * Production: Enable after internal testing
     * Development: Enable to test quality signals
     */
    ENABLE_MENU_QUALITY_SIGNALS: true,

    // ═══════════════════════════════════════════════════════════════
    // URL ROUTING ARCHITECTURE — Stored Slugs + Reserved Namespace
    // @see __docs__/url-routing-architecture/
    // ═══════════════════════════════════════════════════════════════

    /**
     * Stored Project Slugs — URL permanence infrastructure
     *
     * When enabled:
     * - New projects get auto-generated slug stored in projectsSummary
     * - Project rename pushes old slug to previousSlugs[] for 301 redirect
     * - Reserved slug namespace blocks platform-conflicting names
     * - Client resolver checks stored slug first, falls back to slugify(name)
     *
     * When disabled:
     * - Slugs derived from name at runtime (current behavior)
     * - No redirect support, no reserved namespace enforcement
     *
     * @see __docs__/url-routing-architecture/README.md ADR-3
     */
    ENABLE_STORED_SLUGS: true,

    // ═══════════════════════════════════════════════════════════════
    // OFFICIAL BUSINESS PAGE (OBP)
    // @see __docs__/official-business-page/
    // ═══════════════════════════════════════════════════════════════

    /**
     * Official Business Page (OBP) — Canonical public identity endpoint
     *
     * When enabled:
     * - Subdomain root (joespizza.menulist.ai/) shows OBP identity page
     * - Digital menu accessible at /menu (reserved slug) and project slugs
     * - Custom domains also show OBP at root
     *
     * When disabled:
     * - Subdomain root shows digital menu (current behavior)
     * - No routing changes
     *
     * @see __docs__/official-business-page/official-business-page_impl.md
     */
    ENABLE_OBP: true,

    // ═══════════════════════════════════════════════════════════════
    // MOBILE UI (Operational Mobile Support)
    // @see __docs__/mobile-operational-support/
    // ═══════════════════════════════════════════════════════════════

    /**
     * Mobile UI Master Toggle
     *
     * true: Show mobile shell (bottom nav + mobile screens) on mobile devices
     * false: Show desktop layout on all devices (current behavior)
     *
     * What It Does:
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * - Detects mobile device (<768px width)
     * - Renders MobileShell instead of desktop layout
     * - Bottom TabBar navigation (Menu, Hours, Feedback, More)
     * - Purpose-built mobile screens using Ant Design
     * - Same DAL, same hooks, same auth — different UI
     *
     * What It Does NOT Do:
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * - Does NOT modify desktop layout or components
     * - Does NOT create new API endpoints
     * - Does NOT create new DAL functions
     * - Does NOT affect tablet users (tablet = desktop)
     *
     * @see __docs__/mobile-operational-support/02-mobile-ui-doctrine.md
     * @see __docs__/mobile-operational-support/04-mobile-architecture.md
     *
     * Production: Enable when mobile screens are ready
     * Development: Enable to test mobile UI
     */
    ENABLE_MOBILE_UI: true,

    // ─────────────────────────────────────────────────────────────
    // MESSAGING ONBOARDING (Zero-Friction SMB Acquisition Engine)
    // @see __docs__/messaging-onboarding/
    // ─────────────────────────────────────────────────────────────

    /**
     * Master kill switch for messaging onboarding.
     * Disables entire messaging onboarding system.
     * Webhooks return 200 (no processing).
     *
     * true: Enable messaging onboarding pipeline
     * false: All webhooks silently ignored, no new sessions
     *
     * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md
     */
    ENABLE_MESSAGING_ONBOARDING: true,

    /**
     * List of enabled messaging providers.
     * Only enabled providers accept and process webhooks.
     * Unknown/disabled providers return 200 + ignore.
     *
     * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §2
     */
    MESSAGING_ONBOARDING_PROVIDERS: ['whatsapp'] as string[],

    /**
     * Enable onboarding observation layer (event tracking).
     * ON by default when onboarding is enabled — lightweight, non-blocking.
     *
     * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §16
     */
    ENABLE_MESSAGING_ONBOARDING_TRACKING: true,

    /**
     * Platform-only monitoring surface for messaging onboarding.
     * Reads existing health snapshots, webhook events, inbound queue state,
     * and alerts through a protected admin API route.
     *
     * @see __docs__/messaging-onboarding-dashboard/
     */
    ENABLE_MESSAGING_ONBOARDING_DASHBOARD: true,

    // ─────────────────────────────────────────────────────────────
    // MENU INTAKE IDENTITY (Shared upload preflight)
    // @see __docs__/menu-intake-identity/
    // ─────────────────────────────────────────────────────────────

    /**
     * Runs a lightweight identity and safety check before full menu extraction.
     * Used to detect non-menu files, partial uploads, and strong existing-project
     * mismatches before creating the normal extraction job.
     */
    ENABLE_MENU_INTAKE_IDENTITY: true,

    /**
     * Menu Link Import — owner-provided public menu links.
     *
     * Creates a private source artifact and forces existing extraction review.
     * Enabled after production-readiness validation; keep guarded here for fast rollback.
     *
     * @see __docs__/menu-link-import/
     */
    ENABLE_MENU_LINK_IMPORT: true,

    /**
     * Menu Link Import rendered-page fallback.
     *
     * Some owner-provided menu links are browser-routed apps, for example
     * `/#/menu`, where the server response is only an app shell and the visible
     * menu appears after client rendering. This fallback is bounded, server-only,
     * and only runs after URL safety validation plus static acquisition failure.
     *
     * Runtime requirement:
     * - Set MENU_LINK_IMPORT_CHROME_PATH when the host does not expose Chrome in
     *   a standard path.
     * - If no executable is available, the importer keeps the safe upload/manual
     *   fallback instead of failing the request.
     */
    ENABLE_MENU_LINK_IMPORT_RENDER_FALLBACK: true,

    // ─────────────────────────────────────────────────────────────
    // AGENT DISCOVERY (Machine-Readable Business Truth)
    // @see __docs__/agent-readiness-strategy/
    // ─────────────────────────────────────────────────────────────

    // ─────────────────────────────────────────────────────────────
    // BUSINESS HEALTH SIGNALS (Customer-Facing Infrastructure Pillars 4-6)
    // @see __docs__/customer-facing-infrastructure/
    // ─────────────────────────────────────────────────────────────

    /**
     * Trust Health Signal (Pillar 4)
     *
     * Single calm indicator: "Customer Trust: Strong / Stable / Weak"
     * Derived from aggregate visitor behavior patterns (weekly computation).
     *
     * When enabled:
     * - Weekly trust state computed from existing analytics data
     * - TrustHealthCard shown on Owner Dashboard (when sufficient data exists)
     * - Stored as healthSignals.trust on store document
     *
     * When disabled:
     * - No computation runs
     * - No card shown
     * - Zero cost
     *
     * Prerequisites: 50+ unique visitors/week for 4+ consecutive weeks
     *
     * @see __docs__/trust-health-signal/trust-health-signal_impl.md
     *
     * Production: Enable when stores have real traffic
     * Development: Keep false — no data to test against
     */
    ENABLE_TRUST_HEALTH_SIGNAL: true,

    /**
     * Loyalty Health Signal (Pillar 5)
     *
     * Single calm indicator: "Customer Loyalty: Strong / Stable / Weak"
     * Derived from aggregate return visit patterns (weekly computation).
     *
     * Shares infrastructure with Trust Health Signal.
     *
     * @see __docs__/loyalty-health-signal/loyalty-health-signal_impl.md
     *
     * Production: Enable when stores have real traffic
     * Development: Keep false — no data to test against
     */
    ENABLE_LOYALTY_HEALTH_SIGNAL: true,

    /**
     * Risk / Decline Detection (Pillar 6)
     *
     * Meta-signal combining trust + loyalty + engagement trends.
     * "Business Health: Stable / Watch / At Risk"
     *
     * REQUIRES: ENABLE_TRUST_HEALTH_SIGNAL and ENABLE_LOYALTY_HEALTH_SIGNAL
     * both active with sufficient data before this signal computes.
     *
     * @see __docs__/risk-decline-detection/risk-decline-detection_impl.md
     *
     * Production: Enable after Pillars 4+5 have been active for 4+ weeks
     * Development: Keep false
     */
    ENABLE_RISK_DECLINE_DETECTION: true,

    // ─────────────────────────────────────────────────────────────
    // REVIEWS & REPUTATION (Pillar 3 — Reputation Protection)
    // @see __docs__/reviews-reputation/
    // @see __docs__/reputation-protection/
    // ─────────────────────────────────────────────────────────────

    /**
     * Reviews & Reputation — Master kill switch
     *
     * When enabled:
     * - ReputationGuard component shown on dashboard (passive notice)
     * - GET /api/reviews/states returns block/escalation booleans
     * - Cloud Function ingests reviews nightly (requires GBP API access)
     *
     * When disabled:
     * - No review infrastructure active
     * - Zero cost
     *
     * BLOCKED: Requires GBP API access to ingest reviews.
     * Infrastructure is built and ready — flip flag when API access granted.
     *
     * @see __docs__/reviews-reputation/reviews-reputation_impl.md
     *
     * Production: Enable when GBP API access is granted
     * Development: Keep false — no data without GBP API
     */
    ENABLE_REVIEWS_REPUTATION: false,

    /**
     * AI Reply Assist — Gemini-powered reply suggestions
     *
     * Requires ENABLE_REVIEWS_REPUTATION to be true.
     * Owner MUST review and explicitly approve before posting.
     *
     * @see __docs__/reputation-protection/reputation-protection_impl.md
     */
    ENABLE_AI_REPLY_ASSIST: false,

    // ─────────────────────────────────────────────────────────────
    // COMPLIANCE PAGES (Domain Activation Infrastructure)
    // @see __docs__/compliance-pages/
    // ─────────────────────────────────────────────────────────────

    /**
     * Compliance Pages — Privacy Policy + Terms on custom domains
     *
     * When enabled:
     * - /privacy and /terms routes serve auto-generated compliance pages
     * - OBP footer shows Privacy · Terms links
     * - Owner can override with custom text via dashboard
     *
     * When disabled:
     * - /privacy and /terms return 404
     * - No footer links on OBP
     * - Zero cost
     *
     * @see __docs__/compliance-pages/compliance-pages_impl.md
     *
     * Production: Enable when custom domain feature is actively used
     * Development: Enable for testing compliance page rendering
     */
    ENABLE_COMPLIANCE_PAGES: true,

    // ─────────────────────────────────────────────────────────────
    // TEMPORARY STATUS LAYER (Real-Time Status Banners)
    // @see __docs__/temp-status-layer/
    // ─────────────────────────────────────────────────────────────

    /**
     * Temporary Status Layer — "Closed today" / "Special menu" banners
     *
     * When enabled:
     * - Owner can set temporary status banners with auto-expiry
     * - Banner visible on OBP and digital menu
     * - Quick toggles on dashboard and mobile
     *
     * When disabled:
     * - No temp status UI shown
     * - Hours status badge still works independently
     *
     * @see __docs__/temp-status-layer/temp-status-layer_spec.md
     *
     * Production: Enable when ready
     * Development: Enable to test the feature
     */
    ENABLE_TEMP_STATUS: true,

    // ─────────────────────────────────────────────────────────────
    // MENU TRUST SIGNALS (Customer-Facing Trust Cues)
    // @see __docs__/menu-trust-signals/
    // ─────────────────────────────────────────────────────────────

    /**
     * Menu Trust Signals — Subtle visual indicators on customer-facing menu
     *
     * When enabled:
     * - Location and open/closed status when reliable store data exists
     * - Business-type-aware offering label: Menu, Services, Catalog, etc.
     * - Exact freshness text: "Updated today" or "Updated Mar 12" when current
     *
     * When disabled:
     * - No trust signals shown on customer menus
     * - Zero UI impact
     *
     * Pure UI enhancement — reads existing data already loaded for the menu.
     * Zero new Firebase reads. Zero cost.
     *
     * @see __docs__/menu-trust-signals/menu-trust-signals_impl.md
     *
     * Production: Enable when ready
     * Development: Enable to test trust signal display
     */
    ENABLE_MENU_TRUST_SIGNALS: true,

    // ─────────────────────────────────────────────────────────────
    // SPECIAL MENU SWITCHING (Temporary Menu Override)
    // @see __docs__/special-menu-switching/
    // ─────────────────────────────────────────────────────────────

    /**
     * Special Menu Switching — Festival/seasonal/event menu override
     *
     * When enabled:
     * - Owner can create special menus from existing base menus
     * - Schedule activation/deactivation (date + time)
     * - Two modes: Replace (full swap) or Overlay (add section)
     * - Auto-activate at startsAt, auto-revert at endsAt
     * - All surfaces (menu, OBP, screens, PDF, POS) auto-update
     * - Integrates with Temp Status Layer (auto-shows banner)
     *
     * When disabled:
     * - No special menu UI shown on dashboard
     * - Resolver skips special menu check (zero overhead)
     * - Existing menus unaffected
     *
     * Architecture: Special menu = regular project + _specialMenu metadata.
     * Reuses 100% of existing editor, AI extraction, MCE, publish.
     * Zero new collections. Near-zero incremental Firebase cost.
     *
     * @see __docs__/special-menu-switching/special-menu-switching_impl.md
     *
     * Production: Enable when ready
     * Development: Enable to test the feature
     */
    ENABLE_SPECIAL_MENU_SWITCHING: true,

    // ─────────────────────────────────────────────────────────────
    // BEHAVIOR ENGINEERING (Presence Dominance Activation)
    // @see __docs__/behavior-engineering/
    // ─────────────────────────────────────────────────────────────

    /**
     * Behavior Engineering — Micro-copy nudges for behavioral adoption
     *
     * When enabled:
     * - Nudge text appears on OBPLinkCard ("Use this link whenever customers ask...")
     * - ShareModal shows behavior-guiding copy instead of generic text
     * - MobileShareScreen shows behavior-guiding copy
     * - BehaviorNudgeCard appears on dashboard home (dismissible)
     * - WhatsApp share pre-fills "Here is our latest menu" instead of "Check out our menu"
     * - Post-publish success screen includes adoption tips
     *
     * When disabled:
     * - All share/link screens show original generic copy
     * - No nudge cards on dashboard
     * - Zero UI impact
     *
     * Zero Firebase cost — UI-only changes.
     *
     * @see __docs__/behavior-engineering/behavior-engineering_impl.md
     *
     * Production: Enable for behavioral adoption
     * Development: Enable to test nudge copy
     */
    ENABLE_BEHAVIOR_NUDGES: true,

    // ─────────────────────────────────────────────────────────────
    // AGENT DISCOVERY (Machine-Readable Business Truth)
    // @see __docs__/agent-readiness-strategy/
    // ─────────────────────────────────────────────────────────────

    /**
     * Agent Discovery — Future agent-facing structured data endpoints
     *
     * PLACEHOLDER ONLY — No code connected to this flag yet.
     *
     * When activated (future):
     * - Read-only structured data API for verified agent partners
     * - Trust/reliability metadata in responses
     * - Agent-specific response format optimization
     *
     * Current state:
     * - llms.txt and llms-full.txt serve as static discovery layer
     * - Schema.org JSON-LD on OBP + menu pages provides structured data
     * - No dynamic agent endpoints exist
     *
     * @see __docs__/agent-readiness-strategy/agent-readiness-strategy_impl.md
     *
     * Production: Keep false until agent API demand is proven
     * Development: Keep false — no code to test
     */
    ENABLE_AGENT_DISCOVERY: true,

    // ═══════════════════════════════════════════════════════════════
    // AUTH & USER FLOW (Auth Audit — Feb 19, 2026)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Claim Account Flow for Messaging-Onboarded Users
     *
     * true: Login page detects ?claim=TOKEN and shows claim UI
     * false: Claim token parameter is ignored on login page
     *
     * What It Does:
     * - Validates claim token via /api/auth/validate-claim
     * - Shows welcome message with business name
     * - Offers Google OAuth OR email/password setup
     * - Links business to real user account
     *
     * @see __docs__/auth/auth_audit-decisions.md — Decision A4
     */
    ENABLE_CLAIM_ACCOUNT: true,

    /**
     * Phone OTP Auth — WhatsApp-first owner login.
     *
     * true: /create-menu and dashboard login can request/verify a WhatsApp OTP.
     * false: Phone OTP UI hides and /api/auth/phone-otp/* returns 404.
     *
     * Server contract:
     * - OTP challenge docs are server-only and expire quickly.
     * - Verified OTP returns a short-lived login token consumed by NextAuth.
     * - Dashboard Firebase custom-claims sync continues through /api/auth/set-claims.
     *
     * Cost: one WhatsApp outbound message per accepted send request.
     * Rate limit: AUTH_PHONE_OTP_SEND + AUTH_PHONE_OTP_VERIFY.
     *
     * @see __docs__/phone-otp-auth/phone-otp-auth_impl.md
     */
    ENABLE_PHONE_OTP_AUTH: true,

    /**
     * User Profile Management
     *
     * true: "My Profile" in header opens profile modal (edit name, phone, change password)
     * false: "My Profile" click does nothing
     *
     * APIs: /api/auth/update-profile, /api/auth/change-password
     *
     * @see __docs__/auth/auth_audit-decisions.md — Decision B2
     */
    ENABLE_USER_PROFILE: true,

    /**
     * Server-Side Staff Creation
     *
     * true: Staff users created via /api/auth/create-staff (Admin SDK)
     * false: Falls back to client-side creation (BROKEN — do not disable)
     *
     * @see __docs__/auth/auth_audit-decisions.md — Decision B1
     */
    ENABLE_SERVER_STAFF_CREATION: true,

    // ═══════════════════════════════════════════════════════════════
    // OPERATIONAL INFRASTRUCTURE (System Strengthening)
    // @see __docs__/cost-self-protection/
    // @see __docs__/ops-alerting-delivery/
    // @see __docs__/menu-health-monitor/
    // @see __docs__/ops-control-room/
    // ═══════════════════════════════════════════════════════════════

    /**
     * SAFE_MODE — Global circuit breaker for expensive operations.
     *
     * When SAFE_MODE is active (ops_config/system.SAFE_MODE = true):
     * - AI generation routes return 503 "System maintenance"
     * - Bulk operations blocked
     * - Public menu viewing UNAFFECTED (cached pages)
     * - Menu publishing UNAFFECTED (core product)
     * - Dashboard login/navigation UNAFFECTED
     *
     * This flag controls whether API routes CHECK the ops_config/system doc.
     * When false: routes skip the check entirely (zero Firestore reads).
     * When true: each AI route reads 1 doc (cached 60s per instance).
     *
     * Firebase cost: ~₹0.05/month at 50 stores (negligible).
     *
     * @see __docs__/cost-self-protection/cost-self-protection_impl.md
     */
    ENABLE_COST_PROTECTION: true,

    /**
     * Ops Alert Delivery — Telegram notifications for system alerts.
     *
     * When enabled:
     * - createAlert() sends Telegram message after writing to systemAlerts
     * - Deploy mute window suppresses alerts during deployments
     *
     * When disabled:
     * - Alerts still written to systemAlerts collection
     * - No Telegram delivery (TODO comments remain as-is)
     *
     * Prerequisites:
     * - TELEGRAM_BOT_TOKEN secret in Firebase Functions
     * - TELEGRAM_CHAT_ID secret in Firebase Functions
     *
     * Firebase cost: ~₹0.00/month (Telegram API is free, 1 read for mute check).
     *
     * @see __docs__/ops-alerting-delivery/ops-alerting-delivery_impl.md
     */
    ENABLE_OPS_ALERTS: true,

    /**
     * Platform Notification Dashboard — internal founder/operator alert monitor.
     *
     * Uses existing systemAlerts with bounded manual refresh. This is separate
     * from owner notifications and has no owner/customer-facing surface.
     */
    ENABLE_PLATFORM_NOTIFICATION_DASHBOARD: true,
    ENABLE_PLATFORM_ALERT_EMAIL: true,
    ENABLE_PLATFORM_ALERT_WHATSAPP: true,

    /**
     * Menu Health Monitor — Post-publish verification.
     *
     * When enabled:
     * - Cloud Function verifies public menu URL after publish
     * - Updates store.health field on store document
     * - Triggers alert on failure (via ops-alerting-delivery)
     *
     * When disabled:
     * - No publish verification runs
     * - No store.health field updated
     *
     * Firebase cost: ~₹8/month at 50 stores (1 read + 1 write per publish).
     *
     * @see __docs__/menu-health-monitor/menu-health-monitor_impl.md
     */
    ENABLE_MENU_HEALTH_MONITOR: true,

    /**
     * Lifecycle Messaging — Event-driven operational emails to store owners.
     *
     * When enabled:
     * - System sends email via Resend on billing events, welcome, health checks
     * - Messages logged to messageLogs collection
     * - Idempotent: same event never sends duplicate message
     * - Rate limited: max 10 messages per store per day
     *
     * When disabled:
     * - No emails sent
     * - No messageLogs writes
     * - Zero Firebase cost
     *
     * Prerequisites:
     * - RESEND_API_KEY in Firebase Functions secrets
     * - Sender domain verified in Resend dashboard
     * - ops_config/system.ENABLE_LIFECYCLE_MESSAGING = true
     *
     * Firebase cost: ~₹0.05/month at 50 stores (negligible).
     *
     * @see __docs__/lifecycle-messaging/lifecycle-messaging_impl.md
     */
    ENABLE_LIFECYCLE_MESSAGING: true,

    // ═══════════════════════════════════════════════════════════════
    // PDF SURFACE (Enhanced Menu PDF Generation)
    // @see __docs__/pdf-surface/pdf-surface_spec.md
    // ═══════════════════════════════════════════════════════════════

    /**
     * PDF Surface — Enhanced menu PDF generation (v2.0)
     *
     * When enabled:
     * - Density auto-detection (standard / compact / high-density)
     * - Snapshot version hash in footer for pricing integrity tracking
     * - Address and contact line in header (if provided)
     * - Three-zone footer: version ID | page number | updated-on date
     * - Menu URL on first page footer
     * - Block-based pagination (category integrity, item integrity)
     *
     * When disabled:
     * - Legacy PDF layout (v1.0) — original header/footer, no density detection
     * - Core generation (jsPDF, categories, items, prices) unchanged
     * - Backward-compatible: no breaking change
     *
     * Firebase cost: $0.00 (client-side only)
     *
     * @see __docs__/pdf-surface/pdf-surface_spec.md
     * @see __docs__/pricing-integrity-system/pricing-integrity-system_spec.md FR-7.3
     *
     * Production: Keep true — safe, backward-compatible improvement
     * Development: Enable to test enhanced PDF layout
     */
    ENABLE_PDF_SURFACE: true,

    /**
     * Menu Card Export — Routed print menu workflow
     *
     * When enabled:
     * - /use-menulist/menu-card-export route is available
     * - Share Modal, Use MenuList, and Mobile Share can link to the route
     * - Preview, preflight, PDF creation, print-shop packet, and local history run client-side
     * - Optional Pro/Premium layout suggestion calls one AI route only after owner click
     *
     * Firebase cost: $0.00 for export. AI advisor adds one subscription read,
     * one AI operation write, and one subscription credit write after a valid
     * Pro/Premium recommendation. Starter users are blocked before provider call.
     *
     * @see __docs__/menu-card-export/
     */
    ENABLE_MENU_CARD_EXPORT: true,
    ENABLE_MENU_CARD_EXPORT_HISTORY: true,
    ENABLE_MENU_CARD_EXPORT_PRINT_SHOP: true,
    ENABLE_MENU_CARD_EXPORT_BATCH: false,
    ENABLE_MENU_CARD_EXPORT_AI_ADVISOR: true,
    MENU_CARD_EXPORT_AI_ADVISOR_PLAN_IDS: ["pro", "premium"] as string[],
    ENABLE_PREMIUM_MENULIST_BRANDING_REMOVAL: true,

    /**
     * Print Menu Surfaces — tabletop and in-store scan-first print assets
     *
     * When enabled:
     * - Physical menu placements such as the table tent are treated as a
     *   separate scan-first feature from the social/menu-kit bundle.
     * - Menu Kit can bundle these assets, but the physical layout is owned by
     *   src/lib/print-menu-surfaces.
     *
     * Firebase cost: $0.00 (client-side Canvas + jsPDF only)
     *
     * @see __docs__/print-menu-surfaces/
     */
    ENABLE_PRINT_MENU_SURFACES: true,
    ENABLE_PRINT_ASSETS_ROUTE: true,
    ENABLE_PRINTABLE_ASSET_TEMPLATES: true,
    ENABLE_PRINTABLE_ASSET_EDITOR_RENDERER: true,
    ENABLE_PRINTABLE_ASSET_EDITOR_CUSTOMIZE: true,
    ENABLE_PRINTABLE_ASSET_USER_TEMPLATES: true,
    PRINTABLE_ASSET_TEMPLATE_PLAN_IDS: ['starter', 'pro', 'premium'] as string[],
    PRINTABLE_ASSET_TEMPLATE_FULL_CATALOG_PLAN_IDS: ['pro', 'premium'] as string[],

    // ═══════════════════════════════════════════════════════════════
    // MENU KIT (Launch Pack)
    // @see __docs__/menu-kit/
    // ═══════════════════════════════════════════════════════════════

    /**
     * Menu Kit — Auto-generated print + social asset pack
     *
     * When enabled:
     * - "Menu Kit" section appears in Share Modal
     * - Owner can download ZIP with 6 assets (tent card, sticker, IG story, WA status, Google Maps image, placement guide)
     * - All generation is 100% client-side (Canvas + jsPDF + qrcode)
     *
     * When disabled:
     * - Share Modal unchanged
     * - No Menu Kit section visible
     *
     * Firebase cost: $0.00 (client-side only)
     *
     * @see __docs__/menu-kit/menu-kit_impl.md
     */
    ENABLE_MENU_KIT: true,

    /**
     * Menu Kit UTM Tracking — Per-surface scan attribution
     *
     * When enabled:
     * - Each Menu Kit asset encodes a UTM-tagged URL in its QR code
     * - utm_source=menu_kit, utm_medium={surface} (e.g., table_tent, counter_sticker)
     * - Analytics can distinguish which physical placement drives the most scans
     *
     * When disabled:
     * - All assets encode the plain menu URL (no UTM params)
     * - Scans from different placements are indistinguishable
     *
     * Firebase cost: $0.00 (UTM params are already tracked by existing analytics)
     *
     * @see __docs__/menu-kit/menu-kit_impl.md
     */
    ENABLE_MENU_KIT_UTM: true,

    // ═══════════════════════════════════════════════════════════════
    // USE MENULIST — Output Center
    // @see __docs__/use-menulist/README.md
    // ═══════════════════════════════════════════════════════════════

    /**
     * Use MenuList — Unified Output Center
     *
     * When enabled:
     * - "Use MenuList" page visible in sidebar navigation
     * - Aggregates all owner outputs: links, screen URLs, print assets, Menu Kit
     * - Quick Actions for daily link copying
     *
     * When disabled:
     * - Navigation entry hidden
     * - Owners continue using Share Modal and Settings for individual outputs
     *
     * Firebase cost: $0.00 (pure UI aggregation layer, reads already-loaded data)
     *
     * @see __docs__/use-menulist/README.md
     */
    ENABLE_USE_MENULIST: true,

    /**
     * Menu Presence Monitor — Surface deployment checklist
     *
     * When enabled:
     * - "Menu Visibility" card appears on Use MenuList page
     * - Shows 6 surface statuses (Google, Instagram, WhatsApp, QR, Screens, Feedback)
     * - Auto-detects QR/Screens/Feedback from existing data
     * - Manual confirmation for Google/Instagram/WhatsApp (persisted on store doc)
     *
     * When disabled:
     * - Presence card hidden on Use MenuList page
     *
     * Firebase cost: ~$0.00 (1 write per manual confirmation, 0 additional reads)
     *
     * @see __docs__/menu-presence-monitor/README.md
     */
    ENABLE_MENU_PRESENCE_MONITOR: true,

    /**
     * Customer Communication Kit — Pre-generated message templates
     *
     * When enabled:
     * - "Customer Messages" section visible on Use MenuList page
     * - Mobile communication kit section in MobileShareScreen
     * - 5 ready-to-send templates: Send Menu, Menu+Location, Quick Reply, Business Info, Share with Staff
     *
     * When disabled:
     * - Communication kit sections hidden on both desktop and mobile
     *
     * Firebase cost: $0.00 (pure client-side string generation from already-loaded store data)
     *
     * @see __docs__/customer-communication-kit/README.md
     */
    ENABLE_CUSTOMER_COMMUNICATION_KIT: true,

    // ═══════════════════════════════════════════════════════════════
    // CUSTOMER APP — Installable PWA Surface
    // @see __docs__/customer-app/
    // ═══════════════════════════════════════════════════════════════

    /**
     * Customer App (Installable PWA) — master toggle.
     *
     * When enabled:
     * - Dynamic manifest served at `{tenant-origin}/manifest.webmanifest`
     * - PWA icons served at `/api/app-icons/{storeId}/{size}`
     * - Customer menu layout advertises manifest + apple-touch-icon
     * - Install prompt eligible (customer-side visit threshold + dismissal rules still apply)
     * - 8 CUSTOMER_APP_* analytics events write to `analytics` collection
     *   under `projectId='customerApp'`
     *
     * When disabled:
     * - Manifest route returns 404 (prevents install prompt from appearing)
     * - Icon endpoint still works (idempotent, no harm)
     * - Analytics events still fire (they are additive in the collection)
     *
     * Firebase cost: ~$0.05/month per 1000 installs — analytics writes dominate
     * and share the existing `analytics` collection cost envelope. Icon egress
     * is CDN-cached (Firebase Storage for owner overrides; edge-cached otherwise).
     *
     * Privacy: session-level IDs only. No user identity, no device fingerprinting.
     * Respects existing `storeDetails.analytics.trackMenuViews` flag.
     *
     * @see __docs__/customer-app/customer-app_spec.md
     * @see __docs__/customer-app/customer-app_impl.md
     */
    ENABLE_CUSTOMER_APP_PWA: true,

    /**
     * Public Menu Retrieval Foundation — customer-side search, freshness schema,
     * and low-network resilience hardening.
     *
     * When enabled:
     * - Public menu search uses deterministic fuzzy/transliteration matching
     * - Public payload includes compact search terms for multilingual fields
     * - JSON-LD freshness uses project menuVersion/lastPublishedAt where present
     * - Customer service worker keeps a bounded network-first offline fallback
     *
     * When disabled:
     * - Public menu can fall back to the previous substring search behavior
     * - No search index terms are attached to the public payload
     *
     * Firebase cost: ₹0. Search is client-side against already-loaded menu data.
     *
     * @see __docs__/client-menu-retrieval-foundation/README.md
     */
    ENABLE_PUBLIC_MENU_RETRIEVAL_FOUNDATION: true,

    /**
     * Customer App — Install prompt eligibility threshold.
     *
     * Number of menu visits before the install prompt may appear.
     * Default: 3. Lowering this increases conversion but risks annoyance.
     *
     * Per-store override: NOT available day-one. Tenant-level only.
     * See `src/lib/pwa/visitCounter.ts` for the client-side implementation.
     */
    CUSTOMER_APP_PROMPT_VISIT_THRESHOLD: 3 as number,

    // ═══════════════════════════════════════════════════════════════
    // BUSINESS TRUTH GRAPH — Accepted Improvements
    // @see __docs__/business-truth-graph/_archive/chatgpt-review-session13.md
    // ═══════════════════════════════════════════════════════════════

    /**
     * Business Attributes — Structured discovery attributes on store
     *
     * When enabled:
     * - Business Attributes tab visible in Business Settings (17 toggle switches)
     * - businessAttributes field exposed in Public API
     * - schema.org: amenityFeature (LocationFeatureSpecification) + paymentAccepted
     * - OBP: business attribute badge tags displayed on customer-facing page
     *
     * When disabled:
     * - Business Attributes tab hidden in Business Settings
     * - businessAttributes field ignored in API, schema, and OBP
     * - No impact on existing store data (field can still be stored)
     *
     * Firebase cost: $0.00 (reads from already-loaded store doc)
     *
     * @see __docs__/business-truth-graph/_archive/chatgpt-review-session13.md §Layer 12
     */
    ENABLE_BUSINESS_ATTRIBUTES: true,

    /**
     * Platform Pull API — Public read-only APIs for external systems
     *
     * When enabled, external systems can pull business details and menu data
     * from MenuList using an API key. This is the pull counterpart to
     * POS Webhook Sync's push model.
     *
     * Endpoints:
     * - GET /api/public/v1/business — Business details (name, hours, address)
     * - GET /api/public/v1/menu — Full menu data (same format as POS sync)
     *
     * Auth: X-API-Key header with store-generated API key
     * Rate limit: 60 req/min per key
     * Firebase cost: 1-2 reads per request (store lookup + project lookup)
     *
     * @see __docs__/platform-pull-api/
     */
    ENABLE_PUBLIC_API: true,

    // ═══════════════════════════════════════════════════════════════
    // INFRASTRUCTURE COMPOUNDING (MenuList Truth Engine)
    // @see __docs__/infrastructure-compounding/
    // ═══════════════════════════════════════════════════════════════

    /**
     * Extraction Learning Loop — Client-side correction capture
     *
     * When enabled, detectAndLogChanges() in the projects DAL checks
     * if an edited item was recently AI-extracted (_extractedAt within 24h)
     * and logs EXTRACTION_CORRECTION events to MOL instead of regular changes.
     *
     * true: Capture extraction corrections in MOL
     * false: Normal change logging (no extraction tracking)
     *
     * Zero additional Firebase cost when disabled.
     * When enabled: ~1 write per corrected field after extraction.
     *
     * @see __docs__/infrastructure-compounding/extraction-learning-loop_spec.md
     */
    ENABLE_EXTRACTION_LEARNING: true,

    // ═══════════════════════════════════════════════════════════════
    // RESELLER DASHBOARD (Assisted Onboarding Portal)
    // @see __docs__/reseller-dashboard/
    // ═══════════════════════════════════════════════════════════════

    /**
     * Enable Reseller Dashboard for assisted onboarding
     *
     * Allows authorized resellers (platformRole: RESELLER) to
     * manually onboard SMB clients with predefined pricing tiers,
     * online (Razorpay recurring) or offline (cash) payment modes.
     *
     * true: Reseller routes and UI accessible
     * false: Reseller routes return 404, UI hidden
     *
     * @see __docs__/reseller-dashboard/reseller-dashboard_impl.md
     */
    ENABLE_RESELLER_DASHBOARD: true,

    // ═══════════════════════════════════════════════════════════════
    // AI EXTRACTION MONITORING (Internal Ops Dashboard)
    // @see __docs__/ai-extraction-monitoring/
    // ═══════════════════════════════════════════════════════════════

    /**
     * Enable Extraction Monitoring Dashboard at /ops/extraction
     *
     * Internal-only dashboard for monitoring extraction pipeline health.
     * Shows job feed, quality metrics, cost monitor, anomaly flags.
     * Access: platformRole === 'PLATFORM' only.
     *
     * true: Dashboard route accessible
     * false: Route returns 404
     *
     * Zero Firebase cost when disabled.
     * When enabled: ~100-200 reads per dashboard visit (read-only).
     */
    ENABLE_EXTRACTION_MONITORING_DASHBOARD: true,

    /**
     * Enable internal platform-owner Answerlattice intake monitor.
     *
     * Route: /platform/answerlattice-intake
     * API: /api/platform/answerlattice-intake
     * Access: platformRole === 'PLATFORM' only.
     *
     * This is a read-only observability surface for recent intake jobs,
     * support-credit ledger rows, and Answerlattice scheduler intake summaries.
     * It does not create realtime listeners or tenant-facing controls.
     *
     * Cost when enabled: one manual refresh reads up to 40 intake jobs,
     * 40 ledger rows, and 10 scheduler logs by default.
     */
    ENABLE_ANSWERLATTICE_INTAKE_PLATFORM_MONITOR: true,

    // ═══════════════════════════════════════════════════════════════
    // PLATFORM ENTITY BLOCKS (Internal Admin Control)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Enable platform administrators to block tenants, stores, or users
     * without reusing lifecycle fields such as active/deleted.
     *
     * Access: platformRole === 'PLATFORM' only.
     *
     * true: Entity Blocks tab appears in platform settings
     * false: Block management UI hidden
     */
    ENABLE_PLATFORM_ENTITY_BLOCKS: true,

    // ═══════════════════════════════════════════════════════════════
    // ANSWERLATTICE — Governed Answer Infrastructure
    // Per doctrine: 3-YEAR ARCHITECTURE FREEZE
    // @see __docs__/answerlattice/doctrine/05-architecture-evolution.md
    // ═══════════════════════════════════════════════════════════════

    /**
     * Answerlattice Product Ontology Layer
     *
     * true: Entity collections active (entities, entityRelations, entitySearchIndex)
     * false: Ontology layer disabled, existing KB behavior unchanged
     *
     * Pillar 1 of 5 — Foundation layer. Everything else depends on this.
     * @see __docs__/answerlattice/doctrine/01-core-doctrine.md
     */
    ENABLE_ANSWERLATTICE_ONTOLOGY: true,

    /**
     * Answerlattice Canonical Answer Engine
     *
     * true: Canonical answer retrieval active (canonical-first, RAG fallback)
     * false: Existing RAG-only behavior unchanged
     *
     * Pillar 2 of 5 — Governed, versioned, scoped answer assets.
     * Requires: ENABLE_ANSWERLATTICE_ONTOLOGY = true
     */
    ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS: true,

    /**
     * Answerlattice Drift Detection Engine
     *
     * true: 4 drift classes active (version, signal, scope conflict, orphan)
     * false: No drift detection, no governance flags
     *
     * Pillar 3 of 5 — Deterministic, rule-driven governance.
     * Requires: ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS = true
     */
    ENABLE_ANSWERLATTICE_DRIFT_DETECTION: true,

    /**
     * Answerlattice Signal Mutation Engine
     *
     * true: Signal → mutation proposal pipeline active
     * false: Signals generate analytics only (current behavior)
     *
     * Pillar 4 of 5 — Self-improving knowledge layer.
     * Requires: ENABLE_ANSWERLATTICE_DRIFT_DETECTION = true
     */
    ENABLE_ANSWERLATTICE_SIGNAL_MUTATION: true,

    /**
     * Answerlattice Public API
     *
     * true: Public canonical answer retrieval API, drift webhooks, signal ingestion
     * false: Internal-only access
     *
     * Pillar 5 of 5 — Infrastructure legitimacy.
     * Requires: All other Answerlattice pillars enabled
     */
    ENABLE_ANSWERLATTICE_PUBLIC_API: false,

    /**
     * Answerlattice Embeddable Help Widget
     *
     * true: Widget embed script + public widget API active
     * false: Widget endpoints return 404
     *
     * Allows SaaS founders to embed a help search widget in their product.
     * Widget authenticates via the Answerlattice-scoped answerlatticeWidgetApi credential.
     * Searches KB articles, returns AI answers, supports canonical-first retrieval.
     *
     * @see __docs__/answerlattice/help-widget/
     */
    ENABLE_ANSWERLATTICE_WIDGET: true,

    /**
     * Answerlattice Agent Install Layer
     *
     * true: Public install contract pages, Markdown mirrors, downloadable
     *       agent files, and dashboard-generated AI install packets are active.
     * false: Existing widget runtime remains active, but agent install surfaces
     *        can be hidden during rollout.
     *
     * This is an API & Integration layer feature. It does not enable Public API
     * v1 access and does not change widget tenant authority.
     */
    ENABLE_ANSWERLATTICE_AGENT_INSTALL: true,

    /**
     * Answerlattice Hosted Help Center
     *
     * true: Customer-owned help/docs domains such as help.example.com render
     *       published Answerlattice KB, FAQ, and changelog content without a user session.
     * false: Hosted help domains return not found while the authenticated Help
     *        Center and widget continue to work.
     *
     * Cost model: one cached domain-registry doc read plus the existing
     * tenant/store-tagged public content cache. No anonymous ticket, feedback,
     * chat-history, or AI-provider work is performed on page load.
     */
    ENABLE_ANSWERLATTICE_HOSTED_HELP_CENTER: true,

    /**
     * Answerlattice Client Activation Command Center
     *
     * true: Answerlattice clients get a launch/readiness home that shows workspace,
     *       license, knowledge, product surfaces, widget install, context, and
     *       support signal setup from compact summary docs.
     * false: Answerlattice clients use the standard governance dashboard directly.
     *
     * Cost model: reads existing store + platformSummary docs; no broad KB,
     * changelog, ticket, or signal scans on page load. Runtime widget telemetry
     * is throttled onto the existing store doc.
     *
     * @see __docs__/answerlattice/client-activation-command-center/
     */
    ENABLE_ANSWERLATTICE_ACTIVATION_COMMAND_CENTER: true,

    /**
     * Answerlattice Staff Access Control
     *
     * true: Answerlattice owners can manage workspace members, roles, and
     *       Answerlattice-specific permissions from /answerlattice/team.
     * false: Team Access route/nav and staff APIs return unavailable.
     *
     * Uses Answerlattice Firestore workspace/user documents plus the existing
     * productAccounts.AL login bridge. It does not reuse MenuList owner
     * dashboard staff screens or MenuList store permission fields.
     */
    ENABLE_ANSWERLATTICE_STAFF_ACCESS: true,

    /**
     * Answerlattice Weekly Digest Surface
     *
     * true: Answerlattice clients can review a weekly readiness/action digest built
     *       from existing compact activation, context, coverage, and trust
     *       summaries. No new scheduler or AI generation is required.
     * false: Weekly Digest route/nav item hidden.
     *
     * Cost model: reuses /api/answerlattice/activation/summary instead of scanning
     * tickets, chats, KB, changelog, or signal collections.
     *
     * @see __docs__/answerlattice/self-sellable-product-strategy.md
     */
    ENABLE_ANSWERLATTICE_WEEKLY_DIGEST: true,

    /**
     * Answerlattice Feedback Review
     *
     * true: Answerlattice support-control users can review Help Center feedback,
     *       ratings, feature requests, and suggestions inside the Answerlattice
     *       dashboard.
     * false: Feedback review route/nav item is hidden.
     *
     * Cost model: one bounded tenant/store feedback query on load. Feedback
     * submission writes one feedback doc and, when signal mutation is enabled,
     * one non-blocking feedback signal event.
     *
     * @see __docs__/answerlattice/feedback-system/
     */
    ENABLE_ANSWERLATTICE_FEEDBACK_REVIEW: true,

    /**
     * Answerlattice Support Board
     *
     * true: Answerlattice owners and support staff get a private support workboard
     *       for missed questions, ticket follow-up, notes, and answer-review work.
     * false: Support Board route/nav and board DAL are hidden.
     *
     * Scope: support-control work only. This is not a generic project-management
     * board; cards stay linked to tickets, conversations, support signals,
     * canonical-answer proposals, releases, product surfaces, or manual support notes.
     *
     * Cost model: one bounded board query on load. Internal notes and status
     * history are embedded with caps to avoid extra listeners or subcollection scans.
     *
     * @see __docs__/answerlattice/support-board/
     */
    ENABLE_ANSWERLATTICE_SUPPORT_BOARD: true,

    /**
     * Answerlattice Support Board Source Sync
     *
     * true: support-control users can explicitly import bounded unresolved
     *       tickets and actionable support signals into Support Board cards.
     * false: ticket/signal sync CTAs are hidden and sync functions no-op.
     *
     * Default stays false because tickets and signals already have their own
     * owner surfaces. Enable only for tenants that want the board to become a
     * consolidated review queue.
     *
     * Cost model when enabled: each manual sync reads up to 50 source docs and
     * writes at most 20 deduped board cards.
     *
     * @see __docs__/answerlattice/support-board/
     */
    ENABLE_ANSWERLATTICE_SUPPORT_BOARD_SOURCE_SYNC: false,

    /**
     * Answerlattice Support Board Nightly Summary Read
     *
     * true: Support Board reads the compact nightly summary document written by
     *       the scheduler (`platformSummary/supportBoardSummary_{tId}_{sId}`).
     * false: Support Board skips that read entirely.
     *
     * Keep false unless `ENABLE_ANSWERLATTICE_SUPPORT_BOARD_SYNC` is enabled in
     * functions-answerlattice. This avoids one extra Firestore read on every board
     * refresh when the nightly preparation path is not live.
     *
     * @see __docs__/answerlattice/support-board/
     */
    ENABLE_ANSWERLATTICE_SUPPORT_BOARD_NIGHTLY_SUMMARY: false,

    /**
     * Answerlattice Knowledge Intake Command Center
     *
     * true: Answerlattice owners can collect product URLs, docs, FAQs, release notes,
     *       pasted notes, and extracted file text into a private review workspace.
     *       Accepted drafts publish into the existing KB, FAQ, canonical-answer,
     *       product-surface, and changelog pipelines.
     * false: Legacy KB generation/import route remains hidden from new nav.
     *
     * Cost model: owner-triggered only. Jobs/sources/review items are bounded,
     * summary-backed, and never use realtime listeners. Runtime widget/help
     * search continues to read existing published collections.
     *
     * @see __docs__/answerlattice/knowledge-intake-command-center/
     */
    ENABLE_ANSWERLATTICE_KNOWLEDGE_INTAKE: true,

    /**
     * Answerlattice Repeated Reply Import
     *
     * true: Owners can paste one repeated user question and the reply they
     *       already send. Knowledge Intake stores it as a repeated-reply source
     *       and prepares focused FAQ/canonical proposal drafts for review.
     * false: Repeated-reply source creation is rejected; generic pasted notes
     *        and ticket macros remain available through Knowledge Intake.
     *
     * Cost model: no native inbox/helpdesk connector, no AI call, no Storage,
     * no scheduler, and no new collection. Uses existing Knowledge Intake source
     * and review-item writes.
     *
     * Requires: ENABLE_ANSWERLATTICE_KNOWLEDGE_INTAKE = true
     *
     * @see __docs__/answerlattice/repeated-reply-import/
     */
    ENABLE_ANSWERLATTICE_REPEATED_REPLY_IMPORT: true,

    /**
     * Answerlattice Intake URL Discovery
     *
     * true: Owners can provide public website/help URLs and Answerlattice will fetch
     *       a capped, SSRF-guarded page/link sample for review.
     * false: Owners can still add pasted text and extracted files manually.
     */
    ENABLE_ANSWERLATTICE_INTAKE_URL_DISCOVERY: true,

    /**
     * Answerlattice Intake Native Connectors
     *
     * true: Future controlled rollout for Notion/GitHub/Drive native connectors.
     * false: Day-one intake stays file/text/URL based to avoid broad scopes and
     *        high-volume remote sync costs.
     */
    ENABLE_ANSWERLATTICE_INTAKE_NATIVE_CONNECTORS: false,

    /**
     * Answerlattice Intake Screenshot OCR + Media Transcription
     *
     * true: Owners can upload screenshots/images and short audio/video clips.
     *       Answerlattice extracts support-relevant text through Gemini, records the
     *       AI operation, and reserves/settles Answerlattice support credits through
     *       the intake usage ledger.
     * false: Intake remains browser-extracted text files, pasted text, and URL
     *        sources only.
     *
     * Raw media is not retained as a source artifact; only the extracted,
     * sanitized support text is stored for review.
     */
    ENABLE_ANSWERLATTICE_INTAKE_MEDIA_EXTRACTION: true,

    /**
     * Answerlattice Email Notifications
     *
     * true: Email notifications sent for ticket replies, status changes, etc.
     * false: No notification emails sent (silent operation)
     *
     * Uses existing SMTP infrastructure (nodemailer, same as lifecycle messaging).
     * Generic and reusable — supports any notification event type via template registry.
     * Fire-and-forget: never blocks the triggering operation.
     *
     * @see __docs__/answerlattice/email-notifications/
     */
    ENABLE_ANSWERLATTICE_NOTIFICATIONS: true,

    /**
     * Owner Notifications
     *
     * Shared owner/account notification core for MenuList and Answerlattice.
     * Trigger points enqueue product-scoped events; the central processor handles
     * recipient resolution, settings-aware formatting, email/WhatsApp channels,
     * idempotency, rate limits, and delivery logs.
     *
     * @see __docs__/owner-notifications/
     */
    ENABLE_OWNER_NOTIFICATIONS: true,
    ENABLE_OWNER_NOTIFICATION_EMAIL: true,
    ENABLE_OWNER_NOTIFICATION_WHATSAPP: false,
    ENABLE_OWNER_NOTIFICATION_MENULIST_MIGRATION: true,
    ENABLE_OWNER_NOTIFICATION_ANSWERLATTICE_MIGRATION: true,
    ENABLE_OWNER_NOTIFICATION_OPS_DASHBOARD: true,

    /**
     * Answerlattice Governance UI
     *
     * true: Admin governance dashboards active (answer editor, entity dashboard,
     *       drift dashboard, answer analytics, entity health scores)
     * false: Governance dashboards hidden, backend continues running silently
     *
     * Phase 3 of Answerlattice build roadmap — makes backend usable for daily governance.
     * All governance UI reads from existing Answerlattice collections (no new collections).
     *
     * Requires: ENABLE_ANSWERLATTICE_ONTOLOGY + ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS = true
     * @see __docs__/answerlattice/answerlattice-build-priority-roadmap.md Phase 3
     */
    ENABLE_ANSWERLATTICE_GOVERNANCE_UI: true,

    /**
     * Answerlattice Signal Quality Improvements
     *
     * true: Enhanced signal processing active (severity weighting, time decay,
     *       batched queries, signal TTL cleanup, answer version history)
     * false: Basic signal processing (equal weight, no decay, per-entity queries)
     *
     * Phase 4 of Answerlattice build roadmap — sharpens signal quality after core loop proven.
     * No new collections. Enhances existing signal mutation + drift engines.
     *
     * Requires: ENABLE_ANSWERLATTICE_SIGNAL_MUTATION = true
     * @see __docs__/answerlattice/answerlattice-build-priority-roadmap.md Phase 4
     */
    ENABLE_ANSWERLATTICE_SIGNAL_QUALITY: false,

    /**
     * Answerlattice White-Label / Custom Branding
     *
     * true: Per-tenant branding config active (custom colors, logo, favicon,
     *       company name on help widget, KB pages, and email notifications)
     * false: Default Answerlattice branding used everywhere
     *
     * Phase 4 of Answerlattice build roadmap — competitive differentiator for B2B SaaS.
     * Stores branding config on existing tenant/store document (no new collection).
     *
     * @see __docs__/answerlattice/answerlattice-build-priority-roadmap.md Phase 4
     */
    ENABLE_ANSWERLATTICE_WHITE_LABEL: false,

    /**
     * Answerlattice Multi-Language KB Articles
     *
     * true: Articles can have locale field + translated content stored per locale
     * false: English-only articles (current behavior)
     *
     * Phase 4 of Answerlattice build roadmap — 75% of internet users non-English.
     * Additive field on existing kb_articles collection (no new collection).
     * Leverages existing next-intl infrastructure.
     *
     * @see __docs__/answerlattice/answerlattice-build-priority-roadmap.md Phase 4
     */
    ENABLE_ANSWERLATTICE_MULTI_LANGUAGE: false,

    /**
     * Answerlattice Context-Aware Support
     * true: Widget/search accepts product context payload (page, feature, workflow, entityHints, plan, role)
     *       Context boosts entity matching scores for more accurate retrieval
     * false: Retrieval uses query text only (existing behavior)
     *
     * Expansion Item #1 — Foundation for 6 other expansion items.
     * Zero additional Firestore reads/writes. Context processing is in-memory only.
     *
     * @see __docs__/answerlattice/context-aware-support/
     */
    ENABLE_ANSWERLATTICE_CONTEXT_AWARE: true,

    /**
     * Answerlattice Product Surface Contexts
     *
     * true: Answerlattice owners can map product routes/pages/workflows to semantic
     *       support context. KB articles, changelogs, tickets, and runtime
     *       widget/search responses can use the same surface key.
     * false: Context-aware support continues to use only transient page payloads.
     *
     * Uses one owner-managed collection plus one compact platformSummary read
     * model per tenant/store. Runtime reads are cached and bounded.
     *
     * @see __docs__/answerlattice/product-surface-contexts/
     */
    ENABLE_ANSWERLATTICE_PRODUCT_SURFACES: true,

    /**
     * Answerlattice FAQ Management
     *
     * true: Owners can review, create, publish, and archive short FAQ answers
     *       linked to KB articles, product surfaces, entities, and tags.
     *       The public Help Center "Read FAQ" tab reads only published FAQs.
     * false: FAQ tab falls back to static legacy copy and owner FAQ management is hidden.
     *
     * Cost model: one bounded FAQ query for the public tab, paginated owner
     * queries, summary-backed contextual FAQ discovery, and atomic feedback writes.
     *
     * @see __docs__/answerlattice/faq-management/
     */
    ENABLE_ANSWERLATTICE_FAQ_MANAGEMENT: true,

    /**
     * Answerlattice Guided Workflows (Structured Procedure Answers)
     *
     * true: Canonical answers support answerType (explanation/navigation/procedure)
     *       with structured steps, warnings, and prerequisites.
     *       Widget/API returns procedure structure when available.
     *       Editor UI shows step editor for procedure answers.
     * false: All answers treated as explanation type (existing behavior)
     *
     * Expansion Item #2 — converts text answers to executable procedures.
     * Additive field on existing canonical answer type (freeze-compliant).
     * Zero new Firestore collections. Zero additional reads per query.
     *
     * Requires: ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS = true
     * @see __docs__/answerlattice/guided-workflows/
     */
    ENABLE_ANSWERLATTICE_GUIDED_WORKFLOWS: false,

    /**
     * Answerlattice Instant Response Cache (Upstash Redis)
     *
     * true: Canonical answer hits cached in Upstash Redis for sub-10ms responses.
     *       Only deterministic canonical answers are cached (not RAG responses).
     *       Cache keys include entity ID + answer version + plan + role.
     *       TTL: 24 hours. Invalidation: automatic via version in key.
     * false: All queries go through full pipeline (existing behavior).
     *
     * Expansion Item #3 — Performance optimization layer.
     * Zero new Firestore collections. Uses existing Upstash Redis (same as rate limiting).
     *
     * Requires: ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS = true
     * @see __docs__/answerlattice/instant-response-infrastructure/
     */
    ENABLE_ANSWERLATTICE_INSTANT_CACHE: true,

    /**
     * Answerlattice Compiled Context Bundles
     *
     * true: Approved Answerlattice context is compiled into immutable Firebase
     *       Storage JSON bundles and served through manifest/cache-first
     *       runtime paths for widget, public API, and MCP.
     * false: Runtime paths keep existing Firestore-backed behavior.
     *
     * Cost model: source-change-driven rebuilds only. Runtime reads use
     * platformSummary manifest + Storage/server cache instead of collection
     * fanout. Storage downloads are versioned and cacheable.
     *
     * @see __docs__/answerlattice/compiled-context-distribution/
     */
    ENABLE_ANSWERLATTICE_CONTEXT_BUNDLES: true,

    /**
     * Answerlattice Context Bundle Builder
     *
     * true: Authenticated owners/admins can rebuild compiled context from the
     *       Activation Command Center; nightly can repair stale manifests.
     * false: Source-version and manifest read paths stay visible, but rebuild
     *        actions are disabled.
     *
     * Requires: ENABLE_ANSWERLATTICE_CONTEXT_BUNDLES = true
     */
    ENABLE_ANSWERLATTICE_BUNDLE_BUILDER: true,

    /**
     * Answerlattice Widget Bundle Bootstrap
     *
     * true: Widget config response includes active public bundle version and
     *       proxy paths when a ready manifest exists.
     * false: Widget config returns only the legacy remote config payload.
     *
     * Requires: ENABLE_ANSWERLATTICE_WIDGET + ENABLE_ANSWERLATTICE_CONTEXT_BUNDLES = true
     */
    ENABLE_ANSWERLATTICE_WIDGET_BUNDLE_BOOTSTRAP: true,

    /**
     * Answerlattice Public API Bundle Reads
     *
     * true: Public read endpoints prefer compiled approved bundles and fall
     *       back to bounded Firestore reads if the bundle is missing.
     * false: Public API reads use the existing Firestore read path.
     *
     * Requires: ENABLE_ANSWERLATTICE_PUBLIC_API + ENABLE_ANSWERLATTICE_CONTEXT_BUNDLES = true
     */
    ENABLE_ANSWERLATTICE_PUBLIC_API_BUNDLE_READS: true,

    /**
     * Answerlattice MCP
     *
     * true: Enables session-token auth and read-only JSON-RPC MCP tools backed
     *       by private compiled context bundles.
     * false: MCP endpoints return disabled responses.
     *
     * Keep disabled by default until selected design-partner rollout. MCP can
     * multiply context reads quickly, so this must never query raw Firestore
     * collections per tool call.
     *
     * Requires: ENABLE_ANSWERLATTICE_CONTEXT_BUNDLES = true
     */
    ENABLE_ANSWERLATTICE_MCP: false,

    /**
     * Answerlattice Automatic Knowledge Creation (AI Draft Generation)
     *
     * true: When new_answer_required mutation proposals are created (nightly batch
     *       or recurring fallback detection), Gemini generates a structured draft
     *       canonical answer stored on proposal.suggestedChange.
     *       Founder reviews draft → edits → approves → canonical answer created.
     * false: Proposals created without drafts (current behavior). Founder writes from scratch.
     *
     * Expansion Item #4 — Last-mile enhancement to Signal Mutation Engine.
     * Zero new Firestore collections. Draft stored on existing proposal document.
     * Max 10 drafts per nightly run. Cost: <$0.01/run.
     *
     * Doctrine: "LLM assists the control plane. It never becomes the control plane."
     * AI drafts are PROPOSALS — never auto-published.
     *
     * Requires: ENABLE_ANSWERLATTICE_SIGNAL_MUTATION = true
     * @see __docs__/answerlattice/automatic-knowledge-creation/
     */
    ENABLE_ANSWERLATTICE_AUTO_KNOWLEDGE: true,

    /**
     * Answerlattice Product Friction Intelligence
     *
     * true: Nightly friction aggregation + weekly AI insight generation active
     * false: No friction stats computed, GovernanceHub friction tab hidden
     *
     * Expansion Item #5 — Converts support signals into product friction insights.
     * Extends existing nightly scheduler (Step 9: daily aggregation, Step 10: weekly insight).
     * 1 new collection: answerlattice_frictionDailyStats.
     * Insights stored in platformSummary/frictionSnapshot_{tId}_{sId} + platformSummary/friction_{tId}_{sId}.
     *
     * Requires: ENABLE_ANSWERLATTICE_SIGNAL_MUTATION = true
     * @see __docs__/answerlattice/product-friction-intelligence/
     */
    ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE: true,

    /**
     * Answerlattice Founder Onboarding (Knowledge Bootstrap Engine)
     *
     * true: After KB articles are published, nightly batch auto-extracts entities,
     *       auto-promotes high-confidence candidates, and generates canonical answer
     *       drafts. Founders review drafts gradually. RAG works immediately.
     * false: Standard manual onboarding flow (upload → extract → review → create answers manually)
     *
     * Expansion Item #6 — Reduces time-to-value from ~30min to <5min.
     * Zero new Firestore collections. Uses existing entity candidates, mutation proposals, audit logs.
     * Cost: ~$0.08/tenant one-time bootstrap.
     *
     * Requires: ENABLE_ANSWERLATTICE_ONTOLOGY = true + ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS = true
     * @see __docs__/answerlattice/founder-onboarding/
     */
    ENABLE_ANSWERLATTICE_FOUNDER_ONBOARDING: true,

    /**
     * Answerlattice External Workflow Integrations
     *
     * true: Governance events (drift, mutations, coverage, gaps) pushed to
     *       configured external tools (Slack, Email, Linear, GitHub).
     *       Nightly batch Step 13 emits events. onCreate CF dispatches.
     * false: No integration events emitted (current behavior)
     *
     * Expansion Item #7 — Outbound event delivery for governance awareness.
     * 2 new collections: answerlattice_integrationEvents, answerlattice_integrationDeliveryLogs.
     * Config in: platformSummary/integrationConfig_{tId}_{sId}.
     * Cost: ~$0.02/month at 10 tenants, ~$1.45 at 1,000 tenants.
     *
     * Requires: ENABLE_ANSWERLATTICE_DRIFT_DETECTION = true (events need drift data)
     * @see __docs__/answerlattice/workflow-integrations/
     */
    ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS: true,

    /**
     * Answerlattice AI Failure Escalation
     *
     * true: Escalation detection in coreSearch() pipeline. Low-confidence answers
     *       trigger "Still need help?" UI. Tickets created with retrieval debug,
     *       entity debug, and product context. ESCALATION signals emitted.
     * false: No escalation detection. AI answers shown as-is (current behavior).
     *
     * Expansion Item #8 — AI failure capture pipeline.
     * Zero new Firestore collections. Enriches existing ticket + signal docs.
     * Cost: ~$0.01/month at 10 tenants.
     *
     * Requires: ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS = true (for canonical confidence)
     * @see __docs__/answerlattice/ai-failure-escalation/
     */
    ENABLE_ANSWERLATTICE_AI_ESCALATION: false,

    /**
     * Answerlattice Ticket → Knowledge Loop (Expansion Item #9)
     *
     * true: Ticket resolution signals enriched with conversation data.
     *       Nightly batch extracts knowledge candidates from resolved ticket clusters.
     *       Proposals created with draftSource: 'ticket_resolution'.
     * false: Standard ticket signals only (no resolution extraction)
     *
     * Accumulation architecture: requires 3+ resolved tickets per entity before extraction.
     * Max 5 drafts per nightly run. Working estimate: ~INR 10/tenant/month.
     *
     * Requires: ENABLE_ANSWERLATTICE_SIGNAL_MUTATION = true
     * Requires: ENABLE_ANSWERLATTICE_AUTO_KNOWLEDGE = true (for draft generation)
     * @see __docs__/answerlattice/ticket-knowledge-loop/
     */
    ENABLE_ANSWERLATTICE_TICKET_KNOWLEDGE: true,

    /**
     * Answerlattice Founder Trust Layer (Trust Metrics Dashboard)
     *
     * true: Nightly batch aggregates 4 trust metrics (coverage, resolution, drift, entity health)
     *       into platformSummary/trustMetrics_{tId}_{sId}. GovernanceHub shows "System Trust" tab
     *       with metric cards, top failing entities, and escalation breakdown.
     * false: Trust metrics not computed, trust tab hidden in GovernanceHub.
     *
     * Expansion Item #10 — Founder confidence in AI answer quality.
     * Zero new Firestore collections. 1 platformSummary doc per tenant.
     * Cost: ~$0.001/month at 10 tenants.
     *
     * Requires: ENABLE_ANSWERLATTICE_ONTOLOGY + ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS + ENABLE_ANSWERLATTICE_DRIFT_DETECTION = true
     * @see __docs__/answerlattice/founder-trust-layer/
     */
    ENABLE_ANSWERLATTICE_TRUST_METRICS: true,

    /**
     * Answerlattice Knowledge Graph Exploitation (Multi-Entity Retrieval)
     *
     * true: Retrieval expands matched entities via 1-hop graph traversal,
     *       detects cross-feature interactions, and suggests related entities.
     *       Precomputed graph index rebuilt nightly from answerlattice_entityRelations.
     * false: Single-entity retrieval only (existing behavior unchanged).
     *
     * Expansion Item #11 — Makes entity relationships work during retrieval.
     * Zero new Firestore collections. Uses platformSummary/entityGraphIndex_{tId}_{sId}.
     * Cost: 1 summary read per tenant/server cache window when graph cache misses.
     *
     * Requires: ENABLE_ANSWERLATTICE_ONTOLOGY + ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS = true
     * @see __docs__/answerlattice/knowledge-graph-exploitation/
     */
    ENABLE_ANSWERLATTICE_KNOWLEDGE_GRAPH: true,

    /**
     * Answerlattice Predictive Support (Proactive Help Triggers)
     *
     * true: Widget runtime can call predictive-help API on page entry.
     *       Rule-based triggers evaluate context and return proactive suggestions.
     *       Nightly batch auto-generates suggested triggers from friction patterns.
     * false: No proactive help. Widget only shows reactive search results.
     *
     * Expansion Item #12 — Prevents support tickets before they happen.
     * 1 new collection: answerlattice_predictiveTriggers.
     * 1 platformSummary doc: predictiveTriggers_{tId}_{sId} (read-optimized cache).
     * Cooldowns via existing Upstash Redis.
     * Cost: ~$0.16/month at 10 tenants, ~$22.69 at 1,000 tenants.
     *
     * Requires: ENABLE_ANSWERLATTICE_CONTEXT_AWARE + ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS = true
     * @see __docs__/answerlattice/predictive-support/
     */
    ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT: true,

    // ═══════════════════════════════════════════════════════════════
    // INFRASTRUCTURE LAYER (AI Discovery & Machine Readability)
    // Isolated from core MenuList logic. All additive, non-destructive.
    // Code: src/lib/infrastructure/
    // Docs: __docs__/discovery-infrastructure/
    // @see __docs__/discovery-infrastructure/README.md
    // ═══════════════════════════════════════════════════════════════

    /**
     * Offering Taxonomy System — Phase 1A
     *
     * Standard category and classification vocabulary for cross-business discovery.
     * Maps free-text category names to canonical taxonomy IDs using alias matching.
     * Static data only (no Firestore reads/writes). Zero cost.
     *
     * true: Taxonomy matching active (used by discovery index builder)
     * false: Taxonomy matching disabled (existing behavior unchanged)
     *
     * @see __docs__/discovery-infrastructure/taxonomy-system.md
     */
    ENABLE_INFRASTRUCTURE_TAXONOMY: false,

    /**
     * Field-Level Provenance Metadata — Phase 1B
     *
     * Tracks source (AI/owner/system) and confidence per field on menu items.
     * Stamps _provenance metadata on project saves (same write, zero extra cost).
     * Internal only — stripped before customer exposure.
     *
     * true: Provenance stamping active on item saves
     * false: No provenance tracking (existing behavior unchanged)
     *
     * @see __docs__/discovery-infrastructure/provenance-metadata.md
     */
    ENABLE_INFRASTRUCTURE_PROVENANCE: false,

    /**
     * Semantic Attribute Registry — Phase 1C
     *
     * Controlled vocabulary for dietary tags and business attributes.
     * Maps free-text tags to formal enum IDs with schema.org mappings.
     * Static data only (no Firestore reads/writes). Zero cost.
     *
     * true: Semantic attribute matching active
     * false: Disabled (existing free-text tags unchanged)
     *
     * @see __docs__/discovery-infrastructure/semantic-attributes.md
     */
    ENABLE_INFRASTRUCTURE_SEMANTIC_ATTRIBUTES: false,

    /**
     * Business Entity Discovery Index — Phase 2
     *
     * Cross-business queryable index containing PUBLIC business data only.
     * Populated by nightly scheduler. Enables geo + category + attribute search.
     *
     * COMPLIANCE: Contains ONLY public business information (name, type, geo, hours,
     * categories, attributes). NO user data, NO billing, NO internal operational data.
     *
     * true: Discovery index populated nightly, query API active
     * false: No cross-business index (existing tenant-scoped behavior unchanged)
     *
     * @see __docs__/discovery-infrastructure/business-entity-index.md
     */
    ENABLE_INFRASTRUCTURE_DISCOVERY_INDEX: false,

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC MENU ENTRY (Controlled Free Preview Pipeline)
    // @see __docs__/public-menu-entry/
    // ═══════════════════════════════════════════════════════════════

    /**
     * Public Menu Entry — Controlled free preview pipeline
     *
     * Allows public users to open /create-menu, then requires sign-in before
     * source upload, link import, preview polling, and extraction.
     * Creates draft in publicMenuDrafts collection with 24h TTL.
     *
     * true: /create-menu page active, API accepts authenticated owner uploads
     * false: /create-menu returns 404, API returns 404
     *
     * Cost: ~₹0.50-1.00 per extraction (Gemini 2.5 Flash)
     * Rate limit: 5 per user per 24 hours, with active draft reuse and source dedupe
     *
     * @see __docs__/public-menu-entry/public-menu-entry_impl.md
     */
    ENABLE_PUBLIC_MENU_ENTRY: true,

    /**
     * Main Website Resources — public education and discovery layer
     *
     * Adds the evergreen /resources hub and resource article routes for menu
     * source audits, QR menu setup, Google menu source cleanup, restaurant menu
     * SEO, AI search discovery, checklists, worksheets, and multi-location menu
     * control.
     *
     * true: Resource routes, navigation links, homepage section, sitemap, and
     * discovery files stay active.
     * false: Resource routes return 404 and navigation should hide links.
     *
     * Cost: Static website content only. No Firestore reads/writes, Storage
     * objects, Cloud Functions, provider calls, schedulers, or indexes.
     *
     * @see __docs__/main-website/main-website_resources-plan.md
     */
    ENABLE_WEBSITE_RESOURCES: true,

    /**
     * Media Image System
     *
     * Centralizes image purpose, ratio, upload limit, compression, and output
     * preparation for menu item images, project images, menu backgrounds, and
     * business logos.
     *
     * true: Current image upload surfaces use the shared media profiles.
     * false: Upload surfaces keep their shell, but manual adjust is hidden and
     * prepareMediaImage returns validated raw image data without profile
     * crop/resize/compression.
     *
     * @see __docs__/media-image-system/
     */
    ENABLE_MEDIA_IMAGE_SYSTEM: true,

    /**
     * Sharable Item Card Generation
     *
     * Owner-side item card PNG generation from already-loaded editor data.
     * No API route, Firestore read, Firestore write, or dynamic OG pipeline is
     * used for card generation.
     */
    ENABLE_SHARABLE_ITEM_CARD_GENERATION: true,

    /**
     * Deployment build visibility for internal debugging.
     *
     * true: Allow on-demand build badge via ?v=1 query param
     * false: Disable badge rendering everywhere
     */
    ENABLE_DEPLOYMENT_BUILD_BADGE: true,
} as const;

/**
 * Helper to check if a boolean feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
    const value = FEATURE_FLAGS[feature];
    return typeof value === "boolean" ? value : false;
}

/**
 * Helper to get feature flag value (for string-based flags)
 */
export function getFeatureValue<K extends keyof typeof FEATURE_FLAGS>(
    feature: K,
): (typeof FEATURE_FLAGS)[K] {
    return FEATURE_FLAGS[feature];
}
