/**
 * AnswerLattice Help Widget — Public Contract v1
 *
 * Usage:
 *   <script src="https://answerlattice.com/widget/v1/answerlattice-widget.js"
 *           data-answerlattice-key="YOUR_API_KEY"
 *           data-position="bottom-right"
 *           data-accent-color="#6366f1"
 *           data-shape="rounded"
 *           data-display="icon"
 *           data-label="?"
 *           data-size="medium"
 *           data-history="session">
 *   </script>
 *
 * JavaScript API (optional):
 *   window.AnswerlatticeWidget.setContext({ path: '/billing', title: 'Billing', feature: 'billing', workflow: 'manage_subscription' })
 *   window.AnswerlatticeWidget.page({ path: '/billing', title: 'Billing', feature: 'billing', workflow: 'manage_subscription' })
 *   window.AnswerlatticeWidget.identify({ id: 'customer_123', name: 'Jane Customer', email: 'jane@example.com' })
 *   window.AnswerlatticeWidget.identifySigned(shortLivedToken)
 *   window.AnswerlatticeWidget.setEvidenceLinks([{ url: 'https://errors.example.com/event/123', label: 'Error event' }])
 *   window.AnswerlatticeWidget.emitWorkflowEvent('slack.oauth.started')
 *   window.AnswerlatticeWidget.open()
 *   window.AnswerlatticeWidget.close()
 *   window.AnswerlatticeWidget.hide()
 *   window.AnswerlatticeWidget.show()
 *   window.AnswerlatticeWidget.clearHistory()
 *   window.AnswerlatticeWidget.on('open', function () {})
 *
 * Options:
 *   data-answerlattice-key  (required) Your AnswerLattice widget key
 *   data-api-key       (legacy alias) Your AnswerLattice widget key
 *   data-position      (optional) "bottom-right" | "bottom-left" | "top-right" | "top-left"
 *   data-accent-color  (optional) Hex color (default: #6366f1)
 *   data-shape         (optional) "rounded" (circle) | "pill" (rectangle)
 *   data-display       (optional) "icon" | "text" | "icon-text"
 *   data-label         (optional) Text for launcher (default: "?")
 *   data-header-title  (optional) Header title inside the widget (default: "Help")
 *   data-greeting      (optional) Empty-state greeting shown inside the widget
 *   data-size          (optional) "small" | "medium" | "large"
 *   data-offset-x      (optional) Horizontal offset in px (default: 20)
 *   data-offset-y      (optional) Vertical offset in px (default: 20)
 *   data-z-index       (optional) Launcher z-index (default: 2147483646)
 *   data-history       (optional) "session" | "forget" (default: session, no persistent storage)
 *   data-launcher-visibility (optional) "visible" | "manual" (default: visible)
 *   data-mobile-visibility   (optional) "show" | "hide" (default: show)
 *   data-powered-by          (optional) "true" | "false" (default: true)
 *   data-blocked-routes      (optional) comma-separated route patterns such as "/help-center,/help-center/*"
 *   data-context-key         (optional) stable product surface key such as "billing_invoices"
 *   data-use-remote-config   (optional) "false" disables dashboard config fetch
 */
(function () {
    'use strict';

    if (window.__answerlatticeWidget) return;
    window.__answerlatticeWidget = true;

    var script = document.currentScript || (function () {
        var scripts = document.getElementsByTagName('script');
        for (var i = scripts.length - 1; i >= 0; i--) {
            if (scripts[i].src && scripts[i].src.indexOf('answerlattice-widget') !== -1) {
                return scripts[i];
            }
        }
        return null;
    })();

    if (!script) { console.warn('[AnswerLattice] Widget script tag not found.'); return; }

    var apiKey = script.getAttribute('data-answerlattice-key') || script.getAttribute('data-api-key') || '';
    if (apiKey !== apiKey.trim() || !/^al_[A-Za-z0-9_-]{20,128}$/.test(apiKey)) {
        console.warn('[AnswerLattice] Invalid data-answerlattice-key attribute.');
        return;
    }

    // ===== CONFIG =====
    var defaultConfig = {
        position: 'bottom-right',
        accentColor: '#6366f1',
        shape: 'rounded',
        display: 'icon',
        label: '?',
        headerTitle: 'Help',
        greeting: 'How can we help?',
        size: 'medium',
        offsetX: 20,
        offsetY: 20,
        zIndex: 2147483646,
        historyMode: 'session',
        launcherVisibility: 'visible',
        mobileVisibility: 'show',
        poweredByVisible: true,
        blockedRoutes: [],
        predictiveEnabled: false,
        guidedResolutionEnabled: false,
    };
    var explicitConfig = {};
    var position = defaultConfig.position;
    var accentColor = defaultConfig.accentColor;
    var shape = defaultConfig.shape;
    var display = defaultConfig.display;
    var label = defaultConfig.label;
    var headerTitle = defaultConfig.headerTitle;
    var greeting = defaultConfig.greeting;
    var size = defaultConfig.size;
    var offsetX = defaultConfig.offsetX;
    var offsetY = defaultConfig.offsetY;
    var zIndex = defaultConfig.zIndex;
    var historyMode = defaultConfig.historyMode;
    var launcherVisibility = defaultConfig.launcherVisibility;
    var mobileVisibility = defaultConfig.mobileVisibility;
    var poweredByVisible = defaultConfig.poweredByVisible;
    var blockedRoutes = defaultConfig.blockedRoutes;
    var predictiveEnabled = defaultConfig.predictiveEnabled;
    var guidedResolutionEnabled = defaultConfig.guidedResolutionEnabled;
    var useRemoteConfig = script.getAttribute('data-use-remote-config') !== 'false';
    var widgetHost = new URL(script.src).origin;
    var maxContextPayloadBytes = 2048;
    var maxVisitorPayloadBytes = 1024;
    var remoteConfigResponseMaxBytes = 64 * 1024;
    var sensitiveContextPattern = /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+?\d[\d\s().-]{7,}\d)/i;

    // Size presets
    var sizes = {
        small: { circle: 44, pill: 32, font: 16, iconFont: 14 },
        medium: { circle: 56, pill: 40, font: 20, iconFont: 16 },
        large: { circle: 64, pill: 48, font: 24, iconFont: 18 },
    };
    // Mobile detection
    var isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    var s = sizes[size] || sizes.medium;

    // ===== STATE =====
    var isOpen = false;
    var forceHidden = false;
    var runtimeDenied = false;
    var container = null;
    var iframe = null;
    var launcher = null;
    var productContext = null;
    var pendingSuggestion = null;
    var pendingSuggestionContext = null;
    var pendingSuggestionContextKey = null;
    var pendingSuggestionInteractionId = null;
    var pendingSuggestionClicked = false;
    var predictiveRequestTimer = null;
    var predictiveRequestGeneration = 0;
    var predictiveRequestInFlightKey = null;
    var contextBundleConfig = null;
    var eventListeners = {};
    var visitorContext = null;
    var verifiedContextToken = null;
    var evidenceLinks = [];
    var runtimeAuthorizationToken = null;
    var runtimeAuthorizationExpiresAt = 0;
    var runtimeAuthorizationRequired = null;
    var remoteConfigRefreshTimer = null;
    var remoteConfigRequestInFlight = false;
    var remoteConfigRetryCount = 0;
    var activeGuidance = null;
    var activeGuidanceTarget = null;
    var guidanceOverlay = null;
    var guidanceTargetLookupTimer = null;
    var predictiveSessionId = null;

    function isValidChoice(value, allowed) {
        return allowed.indexOf(value) !== -1;
    }

    function readNumberAttribute(name, fallback, min, max) {
        if (!script.hasAttribute(name)) return undefined;
        var value = parseInt(script.getAttribute(name) || '', 10);
        if (!Number.isFinite(value)) return fallback;
        return Math.max(min, Math.min(max, value));
    }

    function normalizeBlockedRoute(value) {
        if (typeof value !== 'string') return null;
        var route = value.trim();
        if (!route) return null;
        try {
            if (/^https?:\/\//i.test(route)) {
                route = new URL(route).pathname || '/';
            }
        } catch (_) {
            return null;
        }
        route = (route.split(/[?#]/)[0] || '').trim();
        if (!route) return null;
        if (route === '*' || route === '/*') return '*';
        if (route.charAt(0) !== '/') route = '/' + route;
        route = route.replace(/\/{2,}/g, '/');
        if (route.length > 1 && route.slice(-1) === '/' && route.slice(-2) !== '/*') {
            route = route.slice(0, -1);
        }
        if (route.length > 180) return null;
        if (route.indexOf('*') !== -1 && route.slice(-2) !== '/*') return null;
        return route;
    }

    function normalizeBlockedRoutes(value) {
        var rawRoutes = typeof value === 'string'
            ? value.split(/[\n,]/)
            : Array.isArray(value) ? value : [];
        var seen = {};
        var routes = [];
        rawRoutes.forEach(function (item) {
            var route = normalizeBlockedRoute(item);
            if (route && !seen[route] && routes.length < 50) {
                seen[route] = true;
                routes.push(route);
            }
        });
        return routes;
    }

    function getCurrentRoutePath() {
        var path = window.location && window.location.pathname ? window.location.pathname : '/';
        return normalizeBlockedRoute(path) || '/';
    }

    function isRoutePatternMatch(pattern, path) {
        if (pattern === '*') return true;
        if (pattern.slice(-2) === '/*') {
            var base = pattern.slice(0, -2) || '/';
            return path === base || path.indexOf(base + '/') === 0;
        }
        return path === pattern;
    }

    function isCurrentRouteBlocked() {
        if (!blockedRoutes || !blockedRoutes.length) return false;
        var path = getCurrentRoutePath();
        return blockedRoutes.some(function (pattern) {
            return isRoutePatternMatch(pattern, path);
        });
    }

    function readScriptConfig() {
        var config = {};
        var value;

        value = script.getAttribute('data-position');
        if (script.hasAttribute('data-position') && isValidChoice(value, ['bottom-right', 'bottom-left', 'top-right', 'top-left'])) config.position = value;

        value = script.getAttribute('data-accent-color');
        if (script.hasAttribute('data-accent-color') && /^#[0-9a-fA-F]{6}$/.test(value || '')) config.accentColor = value;

        value = script.getAttribute('data-shape');
        if (script.hasAttribute('data-shape') && isValidChoice(value, ['rounded', 'pill'])) config.shape = value;

        value = script.getAttribute('data-display');
        if (script.hasAttribute('data-display') && isValidChoice(value, ['icon', 'text', 'icon-text'])) config.display = value;

        value = script.getAttribute('data-label');
        if (script.hasAttribute('data-label') && value && value.trim()) config.label = value.trim().slice(0, 24);

        value = script.getAttribute('data-header-title');
        if (script.hasAttribute('data-header-title') && value && value.trim()) config.headerTitle = value.trim().slice(0, 40);

        value = script.getAttribute('data-greeting');
        if (script.hasAttribute('data-greeting') && value && value.trim()) config.greeting = value.trim().slice(0, 120);

        value = script.getAttribute('data-size');
        if (script.hasAttribute('data-size') && isValidChoice(value, ['small', 'medium', 'large'])) config.size = value;

        var offsetXAttr = readNumberAttribute('data-offset-x', defaultConfig.offsetX, 0, 200);
        if (offsetXAttr !== undefined) config.offsetX = offsetXAttr;

        var offsetYAttr = readNumberAttribute('data-offset-y', defaultConfig.offsetY, 0, 200);
        if (offsetYAttr !== undefined) config.offsetY = offsetYAttr;

        var zIndexAttr = readNumberAttribute('data-z-index', defaultConfig.zIndex, 1000, 2147483646);
        if (zIndexAttr !== undefined) config.zIndex = zIndexAttr;

        value = script.getAttribute('data-history');
        if (script.hasAttribute('data-history') && isValidChoice(value, ['session', 'forget'])) config.historyMode = value;

        value = script.getAttribute('data-launcher-visibility');
        if (script.hasAttribute('data-launcher-visibility') && isValidChoice(value, ['visible', 'manual'])) config.launcherVisibility = value;

        value = script.getAttribute('data-mobile-visibility');
        if (script.hasAttribute('data-mobile-visibility') && isValidChoice(value, ['show', 'hide'])) config.mobileVisibility = value;

        value = script.getAttribute('data-powered-by');
        if (script.hasAttribute('data-powered-by') && isValidChoice(value, ['true', 'false'])) config.poweredByVisible = value !== 'false';

        value = script.getAttribute('data-blocked-routes');
        if (script.hasAttribute('data-blocked-routes')) config.blockedRoutes = normalizeBlockedRoutes(value);

        return config;
    }

    function sanitizeRemoteConfig(value) {
        if (!value || typeof value !== 'object') return {};
        var input = value;
        var config = {};
        if (isValidChoice(input.position, ['bottom-right', 'bottom-left', 'top-right', 'top-left'])) config.position = input.position;
        if (/^#[0-9a-fA-F]{6}$/.test(input.accentColor || '')) config.accentColor = input.accentColor;
        if (isValidChoice(input.shape, ['rounded', 'pill'])) config.shape = input.shape;
        if (isValidChoice(input.display, ['icon', 'text', 'icon-text'])) config.display = input.display;
        if (typeof input.label === 'string' && input.label.trim()) config.label = input.label.trim().slice(0, 24);
        if (typeof input.headerTitle === 'string' && input.headerTitle.trim()) config.headerTitle = input.headerTitle.trim().slice(0, 40);
        if (typeof input.greeting === 'string' && input.greeting.trim()) config.greeting = input.greeting.trim().slice(0, 120);
        if (isValidChoice(input.size, ['small', 'medium', 'large'])) config.size = input.size;
        if (Number.isFinite(input.offsetX)) config.offsetX = Math.max(0, Math.min(200, Math.floor(input.offsetX)));
        if (Number.isFinite(input.offsetY)) config.offsetY = Math.max(0, Math.min(200, Math.floor(input.offsetY)));
        if (Number.isFinite(input.zIndex)) config.zIndex = Math.max(1000, Math.min(2147483646, Math.floor(input.zIndex)));
        if (isValidChoice(input.historyMode, ['session', 'forget'])) config.historyMode = input.historyMode;
        if (isValidChoice(input.launcherVisibility, ['visible', 'manual'])) config.launcherVisibility = input.launcherVisibility;
        if (isValidChoice(input.mobileVisibility, ['show', 'hide'])) config.mobileVisibility = input.mobileVisibility;
        if (typeof input.poweredByVisible === 'boolean') config.poweredByVisible = input.poweredByVisible;
        if (Array.isArray(input.blockedRoutes)) config.blockedRoutes = normalizeBlockedRoutes(input.blockedRoutes);
        if (typeof input.predictiveEnabled === 'boolean') config.predictiveEnabled = input.predictiveEnabled;
        if (typeof input.guidedResolutionEnabled === 'boolean') config.guidedResolutionEnabled = input.guidedResolutionEnabled;
        return config;
    }

    function sanitizeBundleConfig(value) {
        if (!value || typeof value !== 'object') return null;
        if (value.status !== 'ready' || !Number.isSafeInteger(value.bundleVersion) || value.bundleVersion <= 0) return null;
        var files = value.files && typeof value.files === 'object' ? value.files : {};
        var safeFiles = {};
        ['widgetBootstrap', 'contextIndex', 'docsNav', 'canonicalLite'].forEach(function (key) {
            if (typeof files[key] === 'string' && files[key].indexOf('/api/answerlattice/bundles/public/') === 0) {
                safeFiles[key] = files[key];
            }
        });
        return {
            status: 'ready',
            bundleVersion: value.bundleVersion,
            generatedAt: typeof value.generatedAt === 'string' ? value.generatedAt : null,
            basePath: typeof value.basePath === 'string' && value.basePath.indexOf('/api/answerlattice/bundles/public/') === 0 ? value.basePath : null,
            files: safeFiles,
        };
    }

    function applyConfig(config) {
        var wasPredictiveEnabled = predictiveEnabled;
        var merged = {};
        Object.keys(defaultConfig).forEach(function (key) {
            merged[key] = explicitConfig[key] !== undefined
                ? explicitConfig[key]
                : config[key] !== undefined
                    ? config[key]
                    : defaultConfig[key];
        });

        position = isMobile ? 'bottom-right' : merged.position;
        accentColor = merged.accentColor;
        shape = merged.shape;
        display = merged.display;
        label = merged.label;
        headerTitle = merged.headerTitle;
        greeting = merged.greeting;
        size = merged.size;
        offsetX = merged.offsetX;
        offsetY = merged.offsetY;
        zIndex = merged.zIndex;
        historyMode = merged.historyMode;
        launcherVisibility = merged.launcherVisibility;
        mobileVisibility = merged.mobileVisibility;
        poweredByVisible = merged.poweredByVisible;
        blockedRoutes = normalizeBlockedRoutes(merged.blockedRoutes);
        var nextPredictiveEnabled = Boolean(merged.predictiveEnabled);
        if (predictiveEnabled && !nextPredictiveEnabled) {
            cancelPredictiveRequest();
            clearPendingSuggestion(true);
        }
        predictiveEnabled = nextPredictiveEnabled;
        guidedResolutionEnabled = Boolean(merged.guidedResolutionEnabled);
        s = sizes[size] || sizes.medium;

        updateWidgetChrome();
        syncRouteAvailability();
        if (!wasPredictiveEnabled && predictiveEnabled && productContext && !runtimeDenied && !forceHidden) {
            requestPredictiveHelp(productContext);
        }
    }

    function sanitizeContextString(value, maxLength) {
        if (typeof value !== 'string') return null;
        if (sensitiveContextPattern.test(value)) return null;
        var normalized = value.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, '').slice(0, maxLength || 100);
        return normalized || null;
    }

    function sanitizeContextTitle(value, maxLength) {
        if (typeof value !== 'string') return null;
        if (sensitiveContextPattern.test(value)) return null;
        var normalized = value.trim().replace(/[<>{}]/g, '').replace(/\s+/g, ' ').slice(0, maxLength || 120);
        return normalized || null;
    }

    function normalizeContextPath(value) {
        if (typeof value !== 'string') return null;
        if (sensitiveContextPattern.test(value)) return null;
        var route = value.trim();
        if (!route) return null;
        try {
            if (/^https?:\/\//i.test(route)) {
                route = new URL(route).pathname || '/';
            }
        } catch (_) {
            return null;
        }
        route = (route.split(/[?#]/)[0] || '').trim();
        if (!route) return null;
        if (route.charAt(0) !== '/') route = '/' + route;
        route = route.replace(/\/{2,}/g, '/');
        if (route.length > 1 && route.slice(-1) === '/') route = route.slice(0, -1);
        if (route.indexOf('*') !== -1) return null;
        return route.slice(0, 180);
    }

    function sanitizeContextVersion(value) {
        if (typeof value !== 'string') return null;
        var normalized = value.trim().replace(/^v/i, '');
        if (!/^\d{1,6}(?:\.\d{1,3}){0,2}$/.test(normalized)) return null;
        var parts = normalized.split('.');
        if (Number(parts[0]) <= 0 || Number(parts[1] || 0) > 999 || Number(parts[2] || 0) > 999) return null;
        return normalized;
    }

    function getPayloadByteLength(value) {
        var serialized = JSON.stringify(value);
        if (window.TextEncoder) {
            return new TextEncoder().encode(serialized).length;
        }
        return encodeURIComponent(serialized).replace(/%[A-F\d]{2}/gi, 'x').length;
    }

    function sanitizeContextPayload(ctx) {
        if (!ctx || typeof ctx !== 'object' || Array.isArray(ctx)) return null;
        var output = {};
        ['contextKey', 'feature', 'page', 'workflow', 'userRole', 'plan', 'state'].forEach(function (key) {
            var value = sanitizeContextString(ctx[key], 100);
            if (value) output[key] = value;
        });
        var path = normalizeContextPath(ctx.path);
        if (path) {
            output.path = path;
        }
        var title = sanitizeContextTitle(ctx.title, 120);
        if (title) output.title = title;
        var role = sanitizeContextString(ctx.role, 80);
        if (role) {
            output.role = role;
            if (!output.userRole) output.userRole = role;
        }
        var locale = sanitizeContextString(ctx.locale, 24);
        if (locale) output.locale = locale;
        var version = sanitizeContextVersion(ctx.version);
        if (version) output.version = version;
        if (typeof ctx.contextVersion === 'number' && ctx.contextVersion >= 1 && ctx.contextVersion <= 10) {
            output.contextVersion = Math.floor(ctx.contextVersion);
        }
        if (Array.isArray(ctx.entityHints)) {
            output.entityHints = ctx.entityHints
                .slice(0, 5)
                .map(function (hint) { return sanitizeContextString(hint, 64); })
                .filter(Boolean);
        }
        var hasMeaningfulContext = ['contextKey', 'feature', 'page', 'workflow', 'userRole', 'plan', 'state', 'version', 'path', 'title', 'role', 'locale'].some(function (key) {
            return Boolean(output[key]);
        }) || (Array.isArray(output.entityHints) && output.entityHints.length > 0);
        if (!hasMeaningfulContext) return null;
        return getPayloadByteLength(output) <= maxContextPayloadBytes ? output : null;
    }

    function sanitizeVisitorText(value, maxLength) {
        if (typeof value !== 'string') return null;
        var normalized = value.trim().replace(/[<>{}]/g, '').replace(/\s+/g, ' ').slice(0, maxLength || 160);
        return normalized || null;
    }

    function sanitizeVisitorEmail(value) {
        var email = sanitizeVisitorText(value, 180);
        if (!email) return null;
        email = email.toLowerCase();
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
    }

    function sanitizeVisitorId(value) {
        if (typeof value !== 'string' && typeof value !== 'number') return null;
        var normalized = String(value).trim().replace(/[^a-zA-Z0-9_.:-]/g, '').slice(0, 120);
        return normalized || null;
    }

    function sanitizeVisitorPayload(visitor) {
        if (!visitor || typeof visitor !== 'object' || Array.isArray(visitor)) return null;
        var output = {};
        var id = sanitizeVisitorId(visitor.id || visitor.customerId);
        var name = sanitizeVisitorText(visitor.name || visitor.displayName, 160);
        var email = sanitizeVisitorEmail(visitor.email);
        if (id) output.id = id;
        if (name) output.name = name;
        if (email) output.email = email;
        if (!output.id && !output.name && !output.email) return null;
        return getPayloadByteLength(output) <= maxVisitorPayloadBytes ? output : null;
    }

    function createPredictiveRuntimeId(prefix) {
        var bytes = new Uint8Array(12);
        try {
            if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
                window.crypto.getRandomValues(bytes);
            } else {
                for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
            }
        } catch (_) {
            for (var j = 0; j < bytes.length; j++) bytes[j] = Math.floor(Math.random() * 256);
        }
        return prefix + '_' + Array.prototype.map.call(bytes, function (value) {
            return value.toString(16).padStart(2, '0');
        }).join('');
    }

    function getPredictiveSessionId() {
        if (predictiveSessionId) return predictiveSessionId;
        var storageKey = 'answerlattice-predictive-session:' + apiKey;
        try {
            var stored = window.sessionStorage && window.sessionStorage.getItem(storageKey);
            if (typeof stored === 'string' && /^[A-Za-z0-9_.:-]{8,120}$/.test(stored)) {
                predictiveSessionId = stored;
                return predictiveSessionId;
            }
        } catch (_) {}
        predictiveSessionId = createPredictiveRuntimeId('aps');
        try {
            if (window.sessionStorage) window.sessionStorage.setItem(storageKey, predictiveSessionId);
        } catch (_) {}
        return predictiveSessionId;
    }

    function sanitizePredictiveText(value, maxLength, allowEmpty) {
        if (typeof value !== 'string') return allowEmpty ? '' : null;
        var normalized = value.trim().replace(/[<>{}]/g, '').replace(/\s+/g, ' ').slice(0, maxLength);
        return normalized || (allowEmpty ? '' : null);
    }

    function sanitizePredictiveTriggerId(value) {
        if (typeof value !== 'string') return null;
        var normalized = value.trim();
        if (!normalized || normalized.length > 180 || normalized === '.' || normalized === '..' || normalized.indexOf('/') !== -1) return null;
        return normalized;
    }

    function sanitizePredictivePublicHttpsUrl(value) {
        if (typeof value !== 'string' || value.length > 500) return null;
        try {
            var parsed = new URL(value);
            var host = parsed.hostname.toLowerCase();
            if (
                parsed.protocol !== 'https:'
                || parsed.username
                || parsed.password
                || host === 'localhost'
                || host.endsWith('.localhost')
                || host.endsWith('.local')
                || /^(?:0|10|127|169\.254|172\.(?:1[6-9]|2\d|3[01])|192\.168)\./.test(host)
            ) return null;
            return parsed.toString();
        } catch (_) {
            return null;
        }
    }

    function sanitizePredictiveProcedure(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value.steps)) return null;
        if (value.steps.length < 1 || value.steps.length > 12) return null;
        // Instruction labels only; never dispatch these values into host actions.
        var allowedActions = ['open', 'navigate', 'click', 'select', 'enter', 'toggle', 'submit', 'confirm', 'download', 'upload', 'copy', 'paste', 'scroll', 'expand', 'collapse'];
        var steps = value.steps.map(function (step) {
            if (!step || typeof step !== 'object' || Array.isArray(step)) return null;
            var instruction = sanitizePredictiveText(step.instruction, 80, false);
            var target = step.target === undefined ? null : normalizeGuidanceSemanticId(step.target);
            var expectedEvent = step.expectedEvent === undefined ? null : normalizeGuidanceSemanticId(step.expectedEvent);
            if (!Number.isInteger(step.stepOrder) || step.stepOrder < 1 || step.stepOrder > 12 || allowedActions.indexOf(step.action) === -1 || !instruction) return null;
            if (step.target !== undefined && !target) return null;
            if (step.expectedEvent !== undefined && !expectedEvent) return null;
            return {
                stepOrder: step.stepOrder,
                action: step.action,
                instruction: instruction,
                ...(target ? { target: target } : {}),
                ...(expectedEvent ? { expectedEvent: expectedEvent } : {}),
                ...(sanitizePredictiveText(step.expectedResult, 120, false) ? { expectedResult: sanitizePredictiveText(step.expectedResult, 120, false) } : {}),
                ...(sanitizePredictiveText(step.troubleshootingHint, 200, false) ? { troubleshootingHint: sanitizePredictiveText(step.troubleshootingHint, 200, false) } : {}),
            };
        });
        if (steps.some(function (step) { return !step; })) return null;
        steps.sort(function (left, right) { return left.stepOrder - right.stepOrder; });
        if (!steps.every(function (step, index) { return step.stepOrder === index + 1; })) return null;
        var procedureSlug = value.procedureSlug === undefined ? null : normalizeGuidanceSemanticId(value.procedureSlug);
        if (value.procedureSlug !== undefined && (!procedureSlug || procedureSlug.indexOf('.') !== -1 || procedureSlug.indexOf(':') !== -1 || procedureSlug.indexOf('-') !== -1)) return null;
        return {
            ...(procedureSlug ? { procedureSlug: procedureSlug } : {}),
            steps: steps,
        };
    }

    function sanitizePredictiveSuggestion(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
        var triggerId = sanitizePredictiveTriggerId(value.triggerId);
        var title = sanitizePredictiveText(value.title, 160, false);
        var summary = sanitizePredictiveText(value.summary, 600, true);
        var allowedTypes = ['help_card', 'workflow_guide', 'link_article', 'known_issue'];
        if (!triggerId || !title || allowedTypes.indexOf(value.type) === -1) return null;
        var articles = Array.isArray(value.articles) ? value.articles.slice(0, 3).map(function (article) {
            if (!article || typeof article !== 'object' || Array.isArray(article)) return null;
            var id = sanitizePredictiveTriggerId(article.id);
            var articleTitle = sanitizePredictiveText(article.title, 160, false);
            return id && articleTitle ? { id: id, title: articleTitle } : null;
        }).filter(Boolean) : [];
        var procedure = value.type === 'workflow_guide' ? sanitizePredictiveProcedure(value.procedure) : null;
        var knownIssue = null;
        if (value.type === 'known_issue') {
            if (!value.knownIssue || typeof value.knownIssue !== 'object' || Array.isArray(value.knownIssue)) return null;
            var severity = ['info', 'degraded', 'outage'].indexOf(value.knownIssue.severity) !== -1 ? value.knownIssue.severity : null;
            if (!severity) return null;
            var statusPageUrl = sanitizePredictivePublicHttpsUrl(value.knownIssue.statusPageUrl);
            knownIssue = {
                severity: severity,
                ...(statusPageUrl ? { statusPageUrl: statusPageUrl } : {}),
            };
        }
        return {
            triggerId: triggerId,
            type: value.type,
            title: title,
            summary: summary,
            ...(articles.length > 0 ? { articles: articles } : {}),
            ...(procedure ? { procedure: procedure } : {}),
            ...(knownIssue ? { knownIssue: knownIssue } : {}),
        };
    }

    function readPredictiveResponse(response) {
        return readJsonResponseWithLimit(response, 32768);
    }

    function readInitialContextFromAttributes() {
        var ctx = {
            contextVersion: 1,
            contextKey: script.getAttribute('data-context-key'),
            feature: script.getAttribute('data-feature'),
            page: script.getAttribute('data-page'),
            workflow: script.getAttribute('data-workflow'),
            userRole: script.getAttribute('data-user-role'),
            path: script.getAttribute('data-path'),
            title: script.getAttribute('data-title'),
            role: script.getAttribute('data-role'),
            locale: script.getAttribute('data-locale'),
            plan: script.getAttribute('data-plan'),
            state: script.getAttribute('data-state'),
            version: script.getAttribute('data-version'),
        };
        var hints = script.getAttribute('data-entity-hints');
        if (hints) {
            ctx.entityHints = hints.split(',').map(function (hint) { return hint.trim(); }).filter(Boolean);
        }
        return sanitizeContextPayload(ctx);
    }

    function emitEvent(type, payload) {
        var eventPayload = payload || {};
        if (eventListeners[type]) {
            eventListeners[type].slice().forEach(function (callback) {
                try { callback(eventPayload); } catch (_) {}
            });
        }
        try {
            window.dispatchEvent(new CustomEvent('answerlattice:widget', { detail: { type: type, payload: eventPayload } }));
        } catch (_) {}
    }

    function postToIframe(message) {
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage(message, widgetHost);
        }
    }

    function sendBootstrapToIframe() {
        postToIframe({ type: 'answerlattice-widget-bootstrap', apiKey: apiKey });
    }

    function normalizeGuidanceSemanticId(value) {
        if (typeof value !== 'string') return null;
        var normalized = value.trim().toLowerCase();
        if (!normalized || normalized.length > 120) return null;
        return /^[a-z0-9]+(?:[._:-][a-z0-9]+)*$/.test(normalized) ? normalized : null;
    }

    function normalizeGuidanceSessionId(value) {
        if (typeof value !== 'string') return null;
        var normalized = value.trim();
        if (normalized.length < 8 || normalized.length > 120) return null;
        return /^[A-Za-z0-9_-]+$/.test(normalized) ? normalized : null;
    }

    function isGuidanceTargetVisible(target) {
        if (!target || !target.isConnected) return false;
        var rect = target.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return false;
        try {
            var style = window.getComputedStyle(target);
            if (
                style.display === 'none'
                || style.visibility === 'hidden'
                || style.visibility === 'collapse'
                || style.opacity === '0'
            ) {
                return false;
            }
        } catch (_) {}
        return true;
    }

    function findGuidanceTarget(targetId) {
        var candidates = document.querySelectorAll('[data-answerlattice-target]');
        var maxCandidates = Math.min(candidates.length, 500);
        for (var i = 0; i < maxCandidates; i++) {
            if (
                candidates[i].getAttribute('data-answerlattice-target') === targetId
                && isGuidanceTargetVisible(candidates[i])
            ) {
                return candidates[i];
            }
        }
        return null;
    }

    function removeGuidanceOverlayListeners() {
        window.removeEventListener('resize', updateGuidanceOverlay);
        window.removeEventListener('scroll', updateGuidanceOverlay, true);
    }

    function updateGuidanceOverlay() {
        if (!guidanceOverlay || !isGuidanceTargetVisible(activeGuidanceTarget)) {
            if (guidanceOverlay) guidanceOverlay.style.display = 'none';
            return;
        }
        var rect = activeGuidanceTarget.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
            guidanceOverlay.style.display = 'none';
            return;
        }
        guidanceOverlay.style.display = 'block';
        guidanceOverlay.style.left = Math.max(0, rect.left - 5) + 'px';
        guidanceOverlay.style.top = Math.max(0, rect.top - 5) + 'px';
        guidanceOverlay.style.width = Math.max(0, rect.width + 10) + 'px';
        guidanceOverlay.style.height = Math.max(0, rect.height + 10) + 'px';
    }

    function clearGuidanceHighlight() {
        removeGuidanceOverlayListeners();
        activeGuidanceTarget = null;
        if (guidanceOverlay && guidanceOverlay.parentNode) {
            guidanceOverlay.parentNode.removeChild(guidanceOverlay);
        }
        guidanceOverlay = null;
    }

    function clearGuidanceTargetLookupTimer() {
        if (guidanceTargetLookupTimer) window.clearTimeout(guidanceTargetLookupTimer);
        guidanceTargetLookupTimer = null;
    }

    function showGuidanceHighlight(target) {
        clearGuidanceHighlight();
        activeGuidanceTarget = target;
        guidanceOverlay = document.createElement('div');
        guidanceOverlay.id = 'answerlattice-guidance-highlight';
        guidanceOverlay.setAttribute('aria-hidden', 'true');
        Object.assign(guidanceOverlay.style, {
            position: 'fixed',
            pointerEvents: 'none',
            border: '3px solid ' + accentColor,
            borderRadius: '8px',
            boxShadow: '0 0 0 4px rgba(255,255,255,0.92), 0 0 0 8px ' + accentColor + '33',
            zIndex: String(Math.max(1000, Math.min(zIndex - 1, 2147483645))),
            boxSizing: 'border-box',
        });
        document.body.appendChild(guidanceOverlay);
        window.addEventListener('resize', updateGuidanceOverlay);
        window.addEventListener('scroll', updateGuidanceOverlay, true);
        updateGuidanceOverlay();

        var reducedMotion = false;
        try {
            reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (_) {}
        try {
            target.scrollIntoView({
                behavior: reducedMotion ? 'auto' : 'smooth',
                block: 'center',
                inline: 'nearest',
            });
        } catch (_) {
            target.scrollIntoView();
        }
        window.setTimeout(updateGuidanceOverlay, reducedMotion ? 0 : 250);
    }

    function clearGuidance() {
        clearGuidanceTargetLookupTimer();
        clearGuidanceHighlight();
        activeGuidance = null;
    }

    function reportGuidanceStepResult(sessionId, stepOrder, targetId, expectedEvent, attempt) {
        if (
            !activeGuidance
            || activeGuidance.sessionId !== sessionId
            || activeGuidance.stepOrder !== stepOrder
        ) return;

        var target = targetId ? findGuidanceTarget(targetId) : null;
        if (!target && targetId && attempt < 4) {
            guidanceTargetLookupTimer = window.setTimeout(function () {
                reportGuidanceStepResult(sessionId, stepOrder, targetId, expectedEvent, attempt + 1);
            }, 200);
            return;
        }
        guidanceTargetLookupTimer = null;
        if (target) showGuidanceHighlight(target);
        postToIframe({
            type: 'answerlattice-guidance-step-result',
            sessionId: sessionId,
            stepOrder: stepOrder,
            targetId: targetId,
            targetFound: Boolean(target),
            waitingForEvent: Boolean(expectedEvent),
        });
        emitEvent('guidance:step', {
            stepOrder: stepOrder,
            targetId: targetId,
            targetFound: Boolean(target),
            waitingForEvent: Boolean(expectedEvent),
        });
    }

    function resetGuidanceFromHost(reason) {
        if (!activeGuidance) return;
        clearGuidance();
        postToIframe({
            type: 'answerlattice-guidance-host-reset',
            reason: typeof reason === 'string' ? reason.slice(0, 40) : 'host_reset',
        });
    }

    function activateGuidanceStep(payload) {
        if (!guidedResolutionEnabled || !payload || typeof payload !== 'object') return;
        var sessionId = normalizeGuidanceSessionId(payload.sessionId);
        var step = payload.step && typeof payload.step === 'object' ? payload.step : null;
        var stepOrder = step ? Number(step.stepOrder) : 0;
        if (!sessionId || !Number.isInteger(stepOrder) || stepOrder < 1 || stepOrder > 12) return;

        var targetId = step.target ? normalizeGuidanceSemanticId(step.target) : null;
        var expectedEvent = step.expectedEvent ? normalizeGuidanceSemanticId(step.expectedEvent) : null;
        if ((step.target && !targetId) || (step.expectedEvent && !expectedEvent)) return;

        clearGuidanceTargetLookupTimer();
        clearGuidanceHighlight();
        activeGuidance = {
            sessionId: sessionId,
            stepOrder: stepOrder,
            targetId: targetId,
            expectedEvent: expectedEvent,
            routePath: getCurrentRoutePath(),
        };

        reportGuidanceStepResult(sessionId, stepOrder, targetId, expectedEvent, 0);
    }

    function emitWorkflowEvent(eventName) {
        var normalizedEvent = normalizeGuidanceSemanticId(eventName);
        if (!normalizedEvent) return false;
        emitEvent('workflow:event', { eventName: normalizedEvent });
        if (
            !guidedResolutionEnabled
            || !activeGuidance
            || activeGuidance.expectedEvent !== normalizedEvent
        ) {
            return false;
        }
        postToIframe({
            type: 'answerlattice-guidance-event',
            sessionId: activeGuidance.sessionId,
            stepOrder: activeGuidance.stepOrder,
            eventName: normalizedEvent,
        });
        return true;
    }

    // ===== POSITION HELPERS =====
    function getPositionStyles(elem) {
        var pos = {};
        var parts = position.split('-');
        var vert = parts[0]; // top or bottom
        var horiz = parts[1]; // right or left
        pos[vert] = offsetY + 'px';
        pos[horiz] = offsetX + 'px';
        return pos;
    }

    function getContainerPosition() {
        var pos = {};
        var parts = position.split('-');
        var vert = parts[0];
        var horiz = parts[1];
        pos[horiz] = offsetX + 'px';
        if (vert === 'bottom') {
            pos.bottom = (offsetY + s.circle + 12) + 'px';
        } else {
            pos.top = (offsetY + s.circle + 12) + 'px';
        }
        return pos;
    }

    // ===== LAUNCHER =====
    function getLauncherContent() {
        if (display === 'text') return label;
        if (display === 'icon-text') return label;
        return label; // icon mode — label serves as icon text (? by default)
    }

    function shouldHideLauncher() {
        return runtimeDenied || forceHidden || isCurrentRouteBlocked() || launcherVisibility === 'manual' || (isMobile && mobileVisibility === 'hide');
    }

    function getLauncherStyles() {
        var isPill = shape === 'pill';
        var baseStyles = {
            position: 'fixed',
            display: shouldHideLauncher() ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
            background: accentColor,
            color: '#ffffff',
            boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
            zIndex: String(zIndex),
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            userSelect: 'none',
            border: 'none',
            width: '',
            height: '',
            padding: '',
            borderRadius: '',
            fontSize: '',
            fontWeight: '700',
        };

        if (isPill) {
            baseStyles.height = s.pill + 'px';
            baseStyles.padding = '0 16px';
            baseStyles.borderRadius = (s.pill / 2) + 'px';
            baseStyles.fontSize = (s.iconFont) + 'px';
            baseStyles.fontWeight = '600';
        } else {
            baseStyles.width = s.circle + 'px';
            baseStyles.height = s.circle + 'px';
            baseStyles.borderRadius = '50%';
            baseStyles.fontSize = s.font + 'px';
            baseStyles.fontWeight = '700';
        }

        return Object.assign(baseStyles, getPositionStyles());
    }

    function updateWidgetChrome() {
        if (launcher) {
            Object.assign(launcher.style, getLauncherStyles());
            launcher.textContent = isOpen ? '✕' : getLauncherContent();
            launcher.style.fontSize = isOpen ? (s.iconFont + 'px') : (shape === 'pill' ? s.iconFont : s.font) + 'px';
        }
        if (container) {
            Object.assign(container.style, getContainerPosition());
            container.style.zIndex = String(Math.min(zIndex + 1, 2147483647));
            if (isMobile) {
                container.style.left = '12px';
                container.style.right = '12px';
                container.style.width = 'auto';
            }
        }
    }

    function createLauncher() {
        launcher = document.createElement('div');
        launcher.id = 'answerlattice-widget-launcher';
        launcher.setAttribute('role', 'button');
        launcher.setAttribute('aria-label', 'Open help widget');
        launcher.setAttribute('tabindex', '0');

        Object.assign(launcher.style, getLauncherStyles());

        launcher.textContent = getLauncherContent();

        launcher.addEventListener('mouseenter', function () {
            launcher.style.transform = 'scale(1.08)';
            launcher.style.boxShadow = '0 6px 32px rgba(0,0,0,0.2)';
        });
        launcher.addEventListener('mouseleave', function () {
            launcher.style.transform = 'scale(1)';
            launcher.style.boxShadow = '0 4px 24px rgba(0,0,0,0.15)';
        });
        launcher.addEventListener('click', toggleWidget);
        launcher.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleWidget(); }
        });

        document.body.appendChild(launcher);

        if (productContext) {
            requestPredictiveHelp(productContext);
        }
        syncRouteAvailability();
    }

    // ===== WIDGET CONTAINER =====
    function createWidget() {
        container = document.createElement('div');
        container.id = 'answerlattice-widget-container';

        var w = isMobile ? 'calc(100vw - 24px)' : '380px';
        var h = isMobile ? 'calc(100vh - ' + (offsetY + s.circle + 24) + 'px)' : '560px';

        Object.assign(container.style, {
            position: 'fixed',
            width: w,
            height: h,
            maxHeight: 'calc(100vh - 120px)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 8px 48px rgba(0,0,0,0.15)',
            zIndex: String(Math.min(zIndex + 1, 2147483647)),
            display: 'none',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
            opacity: '0',
            transform: 'translateY(10px) scale(0.95)',
        }, getContainerPosition());

        if (isMobile) {
            container.style.left = '12px';
            container.style.right = '12px';
            container.style.width = 'auto';
        }

        iframe = document.createElement('iframe');
        iframe.src = widgetHost + '/widget/embed';
        iframe.setAttribute('title', 'Help Widget');
        iframe.setAttribute('allow', 'clipboard-write');
        iframe.setAttribute('referrerpolicy', 'no-referrer');
        Object.assign(iframe.style, { width: '100%', height: '100%', border: 'none', borderRadius: '16px' });

        container.appendChild(iframe);
        document.body.appendChild(container);

        iframe.addEventListener('load', scheduleIframeSync);
    }

    // ===== OPEN / CLOSE =====
    function toggleWidget() { isOpen ? closeWidget() : openWidget(); }

    function openWidget() {
        if (forceHidden || runtimeDenied) return;
        if (isCurrentRouteBlocked()) return;
        if (isMobile && mobileVisibility === 'hide') return;
        if (!container) createWidget();
        if (pendingSuggestion && !pendingSuggestionClicked) {
            pendingSuggestionClicked = true;
            reportPredictiveInteraction('suggestion_clicked');
        }
        isOpen = true;
        container.style.display = 'block';
        requestAnimationFrame(function () {
            container.style.opacity = '1';
            container.style.transform = 'translateY(0) scale(1)';
        });
        if (launcher) {
            launcher.textContent = '✕';
            launcher.style.fontSize = (s.iconFont) + 'px';
        }
        emitEvent('open', { context: productContext, historyMode: historyMode });
        scheduleIframeSync();
    }

    function sendContextToIframe() {
        postToIframe({ type: 'answerlattice-context-update', context: productContext });
    }

    function sendVisitorToIframe() {
        postToIframe({ type: 'answerlattice-visitor-update', visitor: visitorContext });
    }

    function sendSecurityContextToIframe() {
        postToIframe({
            type: 'answerlattice-security-context-update',
            verifiedContextToken: verifiedContextToken,
            evidenceLinks: evidenceLinks,
            runtimeAuthorizationToken: runtimeAuthorizationExpiresAt > Date.now()
                ? runtimeAuthorizationToken
                : null,
        });
    }

    function sendSuggestionToIframe() {
        postToIframe({ type: 'answerlattice-predictive-suggestion', suggestion: pendingSuggestion });
    }

    function sendConfigToIframe() {
        postToIframe({
            type: 'answerlattice-widget-config',
            config: {
                accentColor: accentColor,
                headerTitle: headerTitle,
                greeting: greeting,
                poweredByVisible: poweredByVisible,
                guidedResolutionEnabled: guidedResolutionEnabled,
            },
        });
    }

    function syncIframeState() {
        sendBootstrapToIframe();
        if (isOpen) {
            postToIframe({ type: 'answerlattice-widget-visibility', state: 'open', historyMode: historyMode });
        }
        sendConfigToIframe();
        sendContextToIframe();
        sendVisitorToIframe();
        sendSecurityContextToIframe();
        sendSuggestionToIframe();
    }

    function scheduleIframeSync() {
        syncIframeState();
        window.setTimeout(syncIframeState, 100);
        window.setTimeout(syncIframeState, 500);
    }

    function resetPredictiveLauncherCue() {
        if (!launcher) return;
        launcher.setAttribute('aria-label', 'Open help widget');
        launcher.removeAttribute('title');
        launcher.style.boxShadow = '0 4px 24px rgba(0,0,0,0.15)';
    }

    function reportPredictiveInteraction(type) {
        if (
            !pendingSuggestion
            || !pendingSuggestionInteractionId
            || !pendingSuggestionContext
            || !window.fetch
        ) return;
        var page = sanitizeContextString(pendingSuggestionContext.page || pendingSuggestionContext.contextKey, 100);
        if (!page) return;
        var payload = {
            contractVersion: 'answerlattice.predictive.v1',
            interactionId: pendingSuggestionInteractionId,
            sessionId: getPredictiveSessionId(),
            triggerId: pendingSuggestion.triggerId,
            type: type,
            page: page,
        };
        ['feature', 'workflow', 'plan', 'userRole', 'contextKey'].forEach(function (key) {
            var value = sanitizeContextString(pendingSuggestionContext[key], 100);
            if (value) payload[key] = value;
        });
        fetch(widgetHost + '/api/answerlattice/predictive-interaction', {
            method: 'POST',
            cache: 'no-store',
            credentials: 'omit',
            redirect: 'error',
            referrerPolicy: 'no-referrer',
            keepalive: type === 'suggestion_dismissed',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
                ...(runtimeAuthorizationToken && runtimeAuthorizationExpiresAt > Date.now()
                    ? { 'X-Answerlattice-Widget-Runtime': runtimeAuthorizationToken }
                    : {}),
            },
            body: JSON.stringify(payload),
        }).catch(function () {
            // Interaction evidence is optional and must never affect the host app.
        });
    }

    function cancelPredictiveRequest() {
        predictiveRequestGeneration += 1;
        if (predictiveRequestTimer) {
            window.clearTimeout(predictiveRequestTimer);
            predictiveRequestTimer = null;
        }
        predictiveRequestInFlightKey = null;
    }

    function clearPendingSuggestion(reportDismissed) {
        if (reportDismissed && pendingSuggestion && !pendingSuggestionClicked) {
            reportPredictiveInteraction('suggestion_dismissed');
        }
        pendingSuggestion = null;
        pendingSuggestionContext = null;
        pendingSuggestionContextKey = null;
        pendingSuggestionInteractionId = null;
        pendingSuggestionClicked = false;
        resetPredictiveLauncherCue();
        postToIframe({ type: 'answerlattice-predictive-suggestion', suggestion: null });
    }

    function installPredictiveSuggestion(suggestion, ctx, contextKey) {
        var normalized = sanitizePredictiveSuggestion(suggestion);
        if (!normalized) return false;
        clearPendingSuggestion(false);
        pendingSuggestion = normalized;
        pendingSuggestionContext = ctx;
        pendingSuggestionContextKey = contextKey;
        pendingSuggestionInteractionId = createPredictiveRuntimeId('api');
        pendingSuggestionClicked = false;
        if (launcher && !isOpen) {
            launcher.setAttribute('aria-label', 'Open help suggestion');
            launcher.setAttribute('title', normalized.title || 'Help suggestion');
            launcher.style.boxShadow = '0 0 0 4px rgba(99,102,241,0.18), 0 4px 24px rgba(0,0,0,0.15)';
        }
        reportPredictiveInteraction('suggestion_shown');
        sendSuggestionToIframe();
        return true;
    }

    function closeWidget() {
        isOpen = false;
        clearGuidance();
        if (!container) return;
        container.style.opacity = '0';
        container.style.transform = 'translateY(10px) scale(0.95)';
        setTimeout(function () { if (!isOpen) container.style.display = 'none'; }, 200);
        if (launcher) {
            launcher.textContent = getLauncherContent();
            launcher.style.fontSize = (shape === 'pill' ? s.iconFont : s.font) + 'px';
        }
        postToIframe({ type: 'answerlattice-widget-visibility', state: 'closed', historyMode: historyMode, clearHistory: historyMode === 'forget' });
        emitEvent('close', { historyMode: historyMode, cleared: historyMode === 'forget' });
    }

    function clearHistory() {
        postToIframe({ type: 'answerlattice-widget-clear-history' });
        emitEvent('history:clear', {});
    }

    function syncRouteAvailability() {
        if (activeGuidance && activeGuidance.routePath !== getCurrentRoutePath()) {
            resetGuidanceFromHost('route_changed');
        }
        if ((runtimeDenied || forceHidden || isCurrentRouteBlocked()) && isOpen) {
            closeWidget();
        }
        if (runtimeDenied || forceHidden || isCurrentRouteBlocked()) {
            cancelPredictiveRequest();
            clearGuidance();
            clearPendingSuggestion(true);
        }
        updateWidgetChrome();
    }

    function denyWidgetRuntime() {
        runtimeDenied = true;
        runtimeAuthorizationRequired = true;
        runtimeAuthorizationToken = null;
        runtimeAuthorizationExpiresAt = 0;
        syncRouteAvailability();
    }

    function hideWidget() {
        forceHidden = true;
        cancelPredictiveRequest();
        clearPendingSuggestion(true);
        closeWidget();
        if (container) {
            container.style.display = 'none';
        }
        updateWidgetChrome();
        emitEvent('hide', {});
    }

    function showWidget() {
        forceHidden = false;
        syncRouteAvailability();
        emitEvent('show', {});
    }

    function scheduleRouteAvailabilitySync() {
        window.setTimeout(syncRouteAvailability, 0);
    }

    window.addEventListener('popstate', scheduleRouteAvailabilitySync);
    window.addEventListener('hashchange', scheduleRouteAvailabilitySync);
    try {
        ['pushState', 'replaceState'].forEach(function (methodName) {
            var original = window.history && window.history[methodName];
            if (typeof original !== 'function') return;
            window.history[methodName] = function () {
                var result = original.apply(this, arguments);
                scheduleRouteAvailabilitySync();
                return result;
            };
        });
    } catch (_) {}

    // ===== MESSAGE LISTENER =====
    window.addEventListener('message', function (e) {
        if (e.origin !== widgetHost) return;
        if (!iframe || e.source !== iframe.contentWindow) return;
        if (e.data && e.data.type === 'answerlattice-widget-close') { closeWidget(); }
        if (e.data && e.data.type === 'answerlattice-widget-ready') { scheduleIframeSync(); }
        if (e.data && e.data.type === 'answerlattice-guidance-step') { activateGuidanceStep(e.data); }
        if (e.data && e.data.type === 'answerlattice-guidance-clear') { clearGuidance(); }
    });

    // ===== PUBLIC API =====
    window.AnswerlatticeWidget = {
        setContext: function (ctx) {
            var sanitizedContext = sanitizeContextPayload(ctx);
            if (activeGuidance) resetGuidanceFromHost('context_changed');
            cancelPredictiveRequest();
            clearPendingSuggestion(true);
            productContext = sanitizedContext;
            emitEvent('context', { context: sanitizedContext });
            sendContextToIframe();
            syncRouteAvailability();
            if (sanitizedContext && !runtimeDenied && !forceHidden && !isCurrentRouteBlocked()) requestPredictiveHelp(sanitizedContext);
        },
        page: function (ctx) { this.setContext(ctx); },
        identify: function (visitor) {
            visitorContext = sanitizeVisitorPayload(visitor);
            emitEvent('identify', { visitor: visitorContext });
            sendVisitorToIframe();
        },
        identifySigned: function (token) {
            verifiedContextToken = typeof token === 'string' && token.length >= 40 && token.length <= 4096 ? token : null;
            emitEvent('identify:signed', { present: Boolean(verifiedContextToken) });
            sendSecurityContextToIframe();
        },
        setEvidenceLinks: function (links) {
            evidenceLinks = (Array.isArray(links) ? links : []).slice(0, 3).map(function (link) {
                if (!link || typeof link !== 'object') return null;
                try {
                    var parsed = new URL(String(link.url || ''));
                    if (parsed.protocol !== 'https:') return null;
                    return {
                        url: parsed.toString().slice(0, 1000),
                        label: typeof link.label === 'string' ? link.label.replace(/[<>]/g, '').trim().slice(0, 80) : undefined,
                    };
                } catch (_) {
                    return null;
                }
            }).filter(Boolean);
            emitEvent('evidence', { count: evidenceLinks.length });
            sendSecurityContextToIframe();
        },
        clearIdentity: function () {
            visitorContext = null;
            verifiedContextToken = null;
            emitEvent('identify:clear', {});
            sendVisitorToIframe();
            sendSecurityContextToIframe();
        },
        open: function () { openWidget(); },
        close: function () { closeWidget(); },
        hide: function () { hideWidget(); },
        show: function () { showWidget(); },
        clearHistory: function () { clearHistory(); },
        reset: function () { clearHistory(); },
        emitWorkflowEvent: function (eventName) { return emitWorkflowEvent(eventName); },
        on: function (eventName, callback) {
            if (typeof eventName !== 'string' || typeof callback !== 'function') return function () {};
            eventListeners[eventName] = eventListeners[eventName] || [];
            eventListeners[eventName].push(callback);
            return function () { window.AnswerlatticeWidget.off(eventName, callback); };
        },
        off: function (eventName, callback) {
            if (!eventListeners[eventName]) return;
            eventListeners[eventName] = eventListeners[eventName].filter(function (current) { return current !== callback; });
        },
        getContext: function () { return productContext; },
        getVisitor: function () { return visitorContext; },
        hasVerifiedIdentity: function () { return Boolean(verifiedContextToken); },
        getGuidanceState: function () {
            if (!activeGuidance) return null;
            return {
                stepOrder: activeGuidance.stepOrder,
                targetId: activeGuidance.targetId,
                expectedEvent: activeGuidance.expectedEvent,
            };
        },
    };

    function requestPredictiveHelp(ctx) {
        if (!predictiveEnabled) return;
        if (forceHidden || runtimeDenied) return;
        if (!ctx || !window.fetch) return;
        var predictivePage = sanitizeContextString(ctx.page || ctx.contextKey, 100);
        if (!predictivePage) return;
        if (isCurrentRouteBlocked()) return;
        if (predictiveRequestTimer) window.clearTimeout(predictiveRequestTimer);

        var contextKey = JSON.stringify({
            contextKey: ctx.contextKey || '',
            page: predictivePage,
            feature: ctx.feature || '',
            workflow: ctx.workflow || '',
            plan: ctx.plan || '',
            userRole: ctx.userRole || '',
            entityHints: Array.isArray(ctx.entityHints) ? ctx.entityHints : [],
        });
        if (predictiveRequestInFlightKey === contextKey) return;
        predictiveRequestGeneration += 1;
        var requestGeneration = predictiveRequestGeneration;

        predictiveRequestTimer = window.setTimeout(function () {
            predictiveRequestTimer = null;
            if (requestGeneration !== predictiveRequestGeneration) return;
            predictiveRequestInFlightKey = contextKey;
            var predictivePayload = {
                page: predictivePage,
                userId: getPredictiveSessionId(),
            };
            ['feature', 'workflow', 'plan', 'userRole'].forEach(function (key) {
                var value = sanitizeContextString(ctx[key], key === 'plan' || key === 'userRole' ? 80 : 100);
                if (value) predictivePayload[key] = value;
            });
            if (Array.isArray(ctx.entityHints)) predictivePayload.entityHints = ctx.entityHints.slice(0, 5);
            fetch(widgetHost + '/api/answerlattice/predictive-help', {
                method: 'POST',
                cache: 'no-store',
                credentials: 'omit',
                redirect: 'error',
                referrerPolicy: 'no-referrer',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey,
                    ...(runtimeAuthorizationToken && runtimeAuthorizationExpiresAt > Date.now()
                        ? { 'X-Answerlattice-Widget-Runtime': runtimeAuthorizationToken }
                        : {}),
                },
                body: JSON.stringify(predictivePayload),
            }).then(function (response) {
                if (requestGeneration !== predictiveRequestGeneration) return null;
                if (response.status !== 200) return null;
                return readPredictiveResponse(response);
            }).then(function (data) {
                if (requestGeneration !== predictiveRequestGeneration) return;
                if (!data || !data.suggestion) return;
                installPredictiveSuggestion(data.suggestion, ctx, contextKey);
            }).catch(function () {
                // Predictive help is optional and must never affect the host app.
            }).then(function () {
                if (predictiveRequestInFlightKey === contextKey) {
                    predictiveRequestInFlightKey = null;
                }
            });
        }, 250);
    }

    function getRemoteConfigCacheKey() {
        return 'answerlattice-widget-config:' + apiKey + ':' + widgetHost;
    }

    function sanitizeRuntimeAuthorization(value) {
        if (!value || typeof value !== 'object' || typeof value.required !== 'boolean') return null;
        if (!value.required) {
            return { required: false, token: null, expiresAt: 0 };
        }
        var token = typeof value.token === 'string' ? value.token : '';
        var expiresAt = value.expiresAt;
        if (token.length < 40 || token.length > 2048) return null;
        if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now() + 5000) return null;
        return { required: true, token: token, expiresAt: expiresAt };
    }

    function scheduleRuntimeAuthorizationRefresh() {
        if (remoteConfigRefreshTimer) {
            window.clearTimeout(remoteConfigRefreshTimer);
            remoteConfigRefreshTimer = null;
        }
        if (!runtimeAuthorizationRequired || !runtimeAuthorizationExpiresAt) return;
        var refreshDelay = Math.max(10000, runtimeAuthorizationExpiresAt - Date.now() - 60000);
        remoteConfigRefreshTimer = window.setTimeout(function () {
            loadRemoteConfig(true);
        }, refreshDelay);
    }

    function scheduleRemoteConfigRetry() {
        if (remoteConfigRefreshTimer) window.clearTimeout(remoteConfigRefreshTimer);
        remoteConfigRetryCount = Math.min(remoteConfigRetryCount + 1, 6);
        var retryDelay = Math.min(300000, 15000 * Math.pow(2, remoteConfigRetryCount - 1));
        remoteConfigRefreshTimer = window.setTimeout(function () {
            loadRemoteConfig(true);
        }, retryDelay);
    }

    function applyRuntimeAuthorization(value) {
        var authorization = sanitizeRuntimeAuthorization(value);
        if (!authorization) return false;
        var tokenChanged = runtimeAuthorizationToken !== authorization.token;
        runtimeAuthorizationRequired = authorization.required;
        runtimeAuthorizationToken = authorization.token;
        runtimeAuthorizationExpiresAt = authorization.expiresAt;
        if (tokenChanged) cancelPredictiveRequest();
        remoteConfigRetryCount = 0;
        scheduleRuntimeAuthorizationRefresh();
        sendSecurityContextToIframe();
        if (predictiveEnabled && productContext && !runtimeDenied && !forceHidden) {
            requestPredictiveHelp(productContext);
        }
        return true;
    }

    function readCachedRemoteConfig() {
        try {
            if (!window.sessionStorage) return null;
            var raw = window.sessionStorage.getItem(getRemoteConfigCacheKey());
            if (!raw) return null;
            var cached = JSON.parse(raw);
            if (!cached || !Number.isSafeInteger(cached.expiresAt) || cached.expiresAt <= Date.now()) {
                window.sessionStorage.removeItem(getRemoteConfigCacheKey());
                return null;
            }
            if (!applyRuntimeAuthorization(cached.runtimeAuthorization)) {
                window.sessionStorage.removeItem(getRemoteConfigCacheKey());
                return null;
            }
            contextBundleConfig = sanitizeBundleConfig(cached.bundle);
            return sanitizeRemoteConfig(cached.config);
        } catch (_) {
            return null;
        }
    }

    function writeCachedRemoteConfig(config, ttlSeconds, bundle, runtimeAuthorization) {
        try {
            if (!window.sessionStorage) return;
            var normalizedTtlSeconds = Number.isSafeInteger(ttlSeconds)
                ? Math.max(10, Math.min(300, ttlSeconds))
                : 60;
            window.sessionStorage.setItem(getRemoteConfigCacheKey(), JSON.stringify({
                config: config,
                bundle: sanitizeBundleConfig(bundle),
                runtimeAuthorization: runtimeAuthorization,
                expiresAt: Date.now() + normalizedTtlSeconds * 1000,
            }));
        } catch (_) {}
    }

    function readJsonResponseWithLimit(response, maxBytes) {
        var rawContentLength = response.headers && response.headers.get('content-length');
        if (rawContentLength && (!/^\d+$/.test(rawContentLength) || Number(rawContentLength) > maxBytes)) {
            return Promise.resolve(null);
        }
        if (!response.body || typeof response.body.getReader !== 'function' || typeof window.TextDecoder !== 'function') {
            return Promise.resolve(null);
        }
        var reader = response.body.getReader();
        var chunks = [];
        var totalBytes = 0;
        function finish() {
            var bytes = new Uint8Array(totalBytes);
            var offset = 0;
            chunks.forEach(function (chunk) {
                bytes.set(chunk, offset);
                offset += chunk.byteLength;
            });
            try {
                var body = new window.TextDecoder('utf-8', { fatal: true }).decode(bytes);
                return body ? JSON.parse(body) : null;
            } catch (_) {
                return null;
            }
        }
        function readNext() {
            return reader.read().then(function (result) {
                if (result.done) {
                    reader.releaseLock();
                    return finish();
                }
                if (result.value && result.value.byteLength) {
                    totalBytes += result.value.byteLength;
                    if (totalBytes > maxBytes) {
                        return reader.cancel().catch(function () {}).then(function () {
                            reader.releaseLock();
                            return null;
                        });
                    }
                    chunks.push(result.value);
                }
                return readNext();
            });
        }
        return readNext().catch(function () {
            try { reader.releaseLock(); } catch (_) {}
            return null;
        });
    }

    function buildRemoteConfigUrl() {
        var url = new URL(widgetHost + '/api/widget/config');
        var runtimePath = normalizeContextPath(window.location && window.location.pathname);
        if (runtimePath) url.searchParams.set('path', runtimePath);
        if (productContext) {
            ['contextKey', 'feature', 'page'].forEach(function (key) {
                var value = sanitizeContextString(productContext[key], 120);
                if (value) url.searchParams.set(key, value);
            });
        }
        return url.toString();
    }

    function loadRemoteConfig(forceRefresh) {
        if (!useRemoteConfig || !window.fetch || remoteConfigRequestInFlight) return;

        if (!forceRefresh) {
            var cachedConfig = readCachedRemoteConfig();
            if (cachedConfig && Object.keys(cachedConfig).length) {
                applyConfig(cachedConfig);
                return;
            }
        }

        remoteConfigRequestInFlight = true;
        fetch(buildRemoteConfigUrl(), {
            method: 'GET',
            cache: 'no-store',
            credentials: 'omit',
            redirect: 'error',
            referrerPolicy: 'no-referrer',
            headers: { 'X-API-Key': apiKey },
        }).then(function (response) {
            if (response.status === 401 || response.status === 403 || response.status === 404) {
                return { terminal: true };
            }
            if (response.status !== 200) return null;
            return readJsonResponseWithLimit(response, remoteConfigResponseMaxBytes);
        }).then(function (data) {
            if (data && data.terminal) {
                denyWidgetRuntime();
                return;
            }
            var runtimeAuthorization = data && sanitizeRuntimeAuthorization(data.runtimeAuthorization);
            if (
                !data
                || data.schemaVersion !== 'answerlattice.widget.v1'
                || !Number.isSafeInteger(data.cacheTtlSeconds)
                || !Number.isSafeInteger(data.configVersion)
                || data.configVersion < 0
                || !data.config
                || !data.capabilities
                || typeof data.capabilities.predictiveSupport !== 'boolean'
                || typeof data.capabilities.contextBundles !== 'boolean'
                || typeof data.capabilities.guidedResolution !== 'boolean'
                || !runtimeAuthorization
            ) {
                scheduleRemoteConfigRetry();
                return;
            }
            var remoteConfig = sanitizeRemoteConfig(data.config);
            remoteConfig.predictiveEnabled = data.capabilities.predictiveSupport;
            remoteConfig.guidedResolutionEnabled = data.capabilities.guidedResolution;
            var nextBundleConfig = sanitizeBundleConfig(data.bundles);
            if (data.capabilities.contextBundles !== Boolean(nextBundleConfig)) {
                scheduleRemoteConfigRetry();
                return;
            }
            if (!applyRuntimeAuthorization(runtimeAuthorization)) {
                scheduleRemoteConfigRetry();
                return;
            }
            contextBundleConfig = nextBundleConfig;
            writeCachedRemoteConfig(
                remoteConfig,
                data.cacheTtlSeconds,
                contextBundleConfig,
                data.runtimeAuthorization,
            );
            applyConfig(remoteConfig);
        }).catch(function () {
            // Dashboard config is optional. Script attributes keep the widget usable.
            scheduleRemoteConfigRetry();
        }).then(function () {
            remoteConfigRequestInFlight = false;
        });
    }

    // ===== INIT =====
    explicitConfig = readScriptConfig();
    applyConfig(explicitConfig);
    productContext = readInitialContextFromAttributes();
    loadRemoteConfig();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createLauncher);
    } else {
        createLauncher();
    }
})();
