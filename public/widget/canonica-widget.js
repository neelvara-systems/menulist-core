/**
 * Canonica Help Widget — Embed Script (v2)
 *
 * Usage:
 *   <script src="https://canonica.app/widget/canonica-widget.js"
 *           data-api-key="YOUR_API_KEY"
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
 *   window.CanonicaWidget.setContext({ contextKey: 'billing_invoices', feature: 'billing', page: 'invoices' })
 *   window.CanonicaWidget.page({ contextKey: 'billing_invoices', feature: 'billing', page: 'invoices' })
 *   window.CanonicaWidget.open()
 *   window.CanonicaWidget.close()
 *   window.CanonicaWidget.clearHistory()
 *   window.CanonicaWidget.on('open', function () {})
 *
 * Options:
 *   data-api-key       (required) Your Canonica API key
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

    if (window.__canonicaWidget) return;
    window.__canonicaWidget = true;

    var script = document.currentScript || (function () {
        var scripts = document.getElementsByTagName('script');
        for (var i = scripts.length - 1; i >= 0; i--) {
            if (scripts[i].src && scripts[i].src.indexOf('canonica-widget') !== -1) {
                return scripts[i];
            }
        }
        return null;
    })();

    if (!script) { console.warn('[Canonica] Widget script tag not found.'); return; }

    var apiKey = script.getAttribute('data-api-key');
    if (!apiKey) { console.warn('[Canonica] Missing data-api-key attribute.'); return; }

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
    var useRemoteConfig = script.getAttribute('data-use-remote-config') !== 'false';
    var widgetHost = new URL(script.src).origin;
    var maxContextPayloadBytes = 2048;
    var remoteConfigCacheTtlMs = 60000;

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
    var container = null;
    var iframe = null;
    var launcher = null;
    var productContext = null;
    var pendingSuggestion = null;
    var predictiveRequestTimer = null;
    var predictiveSuggestionCache = {};
    var predictiveSuggestionCacheTtlMs = 60000;
    var contextBundleConfig = null;
    var eventListeners = {};

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
        if (route.indexOf('*') !== -1 && route.slice(-1) !== '*') return null;
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
        if (pattern.slice(-1) === '*') {
            return path.indexOf(pattern.slice(0, -1)) === 0;
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
        return config;
    }

    function sanitizeBundleConfig(value) {
        if (!value || typeof value !== 'object') return null;
        if (value.status !== 'ready' || !Number.isFinite(Number(value.bundleVersion))) return null;
        var files = value.files && typeof value.files === 'object' ? value.files : {};
        var safeFiles = {};
        ['widgetBootstrap', 'contextIndex', 'docsNav', 'canonicalLite'].forEach(function (key) {
            if (typeof files[key] === 'string' && files[key].indexOf('/api/canonica/bundles/public/') === 0) {
                safeFiles[key] = files[key];
            }
        });
        return {
            status: 'ready',
            bundleVersion: Number(value.bundleVersion),
            generatedAt: typeof value.generatedAt === 'string' ? value.generatedAt : null,
            basePath: typeof value.basePath === 'string' && value.basePath.indexOf('/api/canonica/bundles/public/') === 0 ? value.basePath : null,
            files: safeFiles,
        };
    }

    function applyConfig(config) {
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
        predictiveEnabled = Boolean(merged.predictiveEnabled);
        s = sizes[size] || sizes.medium;

        updateWidgetChrome();
        syncRouteAvailability();
    }

    function sanitizeContextString(value, maxLength) {
        if (typeof value !== 'string') return null;
        var normalized = value.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, '').slice(0, maxLength || 100);
        return normalized || null;
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
        ['contextKey', 'feature', 'page', 'workflow', 'userRole', 'plan'].forEach(function (key) {
            var value = sanitizeContextString(ctx[key], 100);
            if (value) output[key] = value;
        });
        if (typeof ctx.contextVersion === 'number' && ctx.contextVersion >= 1 && ctx.contextVersion <= 10) {
            output.contextVersion = Math.floor(ctx.contextVersion);
        }
        if (Array.isArray(ctx.entityHints)) {
            output.entityHints = ctx.entityHints
                .slice(0, 5)
                .map(function (hint) { return sanitizeContextString(hint, 64); })
                .filter(Boolean);
        }
        var hasMeaningfulContext = ['contextKey', 'feature', 'page', 'workflow', 'userRole', 'plan'].some(function (key) {
            return Boolean(output[key]);
        }) || (Array.isArray(output.entityHints) && output.entityHints.length > 0);
        if (!hasMeaningfulContext) return null;
        return getPayloadByteLength(output) <= maxContextPayloadBytes ? output : null;
    }

    function readInitialContextFromAttributes() {
        var ctx = {
            contextVersion: 1,
            contextKey: script.getAttribute('data-context-key'),
            feature: script.getAttribute('data-feature'),
            page: script.getAttribute('data-page'),
            workflow: script.getAttribute('data-workflow'),
            userRole: script.getAttribute('data-user-role'),
            plan: script.getAttribute('data-plan'),
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
            window.dispatchEvent(new CustomEvent('canonica:widget', { detail: { type: type, payload: eventPayload } }));
        } catch (_) {}
    }

    function postToIframe(message) {
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage(message, widgetHost);
        }
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
        return isCurrentRouteBlocked() || launcherVisibility === 'manual' || (isMobile && mobileVisibility === 'hide');
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
        launcher.id = 'canonica-widget-launcher';
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
        container.id = 'canonica-widget-container';

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
        iframe.src = widgetHost + '/widget/' + encodeURIComponent(apiKey);
        iframe.setAttribute('title', 'Help Widget');
        iframe.setAttribute('allow', 'clipboard-write');
        Object.assign(iframe.style, { width: '100%', height: '100%', border: 'none', borderRadius: '16px' });

        container.appendChild(iframe);
        document.body.appendChild(container);

        iframe.addEventListener('load', scheduleIframeSync);
    }

    // ===== OPEN / CLOSE =====
    function toggleWidget() { isOpen ? closeWidget() : openWidget(); }

    function openWidget() {
        if (isCurrentRouteBlocked()) return;
        if (isMobile && mobileVisibility === 'hide') return;
        if (!container) createWidget();
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
        postToIframe({ type: 'canonica-context-update', context: productContext });
    }

    function sendSuggestionToIframe() {
        if (pendingSuggestion && iframe && iframe.contentWindow) {
            postToIframe({ type: 'canonica-predictive-suggestion', suggestion: pendingSuggestion });
        }
    }

    function sendConfigToIframe() {
        postToIframe({
            type: 'canonica-widget-config',
            config: {
                accentColor: accentColor,
                headerTitle: headerTitle,
                greeting: greeting,
                poweredByVisible: poweredByVisible,
            },
        });
    }

    function syncIframeState() {
        if (isOpen) {
            postToIframe({ type: 'canonica-widget-visibility', state: 'open', historyMode: historyMode });
        }
        sendConfigToIframe();
        sendContextToIframe();
        sendSuggestionToIframe();
    }

    function scheduleIframeSync() {
        syncIframeState();
        window.setTimeout(syncIframeState, 100);
        window.setTimeout(syncIframeState, 500);
    }

    function closeWidget() {
        isOpen = false;
        if (!container) return;
        container.style.opacity = '0';
        container.style.transform = 'translateY(10px) scale(0.95)';
        setTimeout(function () { if (!isOpen) container.style.display = 'none'; }, 200);
        if (launcher) {
            launcher.textContent = getLauncherContent();
            launcher.style.fontSize = (shape === 'pill' ? s.iconFont : s.font) + 'px';
        }
        postToIframe({ type: 'canonica-widget-visibility', state: 'closed', historyMode: historyMode, clearHistory: historyMode === 'forget' });
        emitEvent('close', { historyMode: historyMode, cleared: historyMode === 'forget' });
    }

    function clearHistory() {
        postToIframe({ type: 'canonica-widget-clear-history' });
        emitEvent('history:clear', {});
    }

    function syncRouteAvailability() {
        if (isCurrentRouteBlocked() && isOpen) {
            closeWidget();
        }
        updateWidgetChrome();
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
        if (e.data && e.data.type === 'canonica-widget-close') { closeWidget(); }
        if (e.data && e.data.type === 'canonica-widget-ready') { scheduleIframeSync(); }
    });

    // ===== PUBLIC API =====
    window.CanonicaWidget = {
        setContext: function (ctx) {
            var sanitizedContext = sanitizeContextPayload(ctx);
            productContext = sanitizedContext;
            pendingSuggestion = null;
            if (launcher) {
                launcher.setAttribute('aria-label', 'Open help widget');
                launcher.removeAttribute('title');
                launcher.style.boxShadow = '0 4px 24px rgba(0,0,0,0.15)';
            }
            if (!sanitizedContext) {
                sendSuggestionToIframe();
            }
            emitEvent('context', { context: sanitizedContext });
            sendContextToIframe();
            syncRouteAvailability();
            if (sanitizedContext && !isCurrentRouteBlocked()) requestPredictiveHelp(sanitizedContext);
        },
        page: function (ctx) { this.setContext(ctx); },
        open: function () { openWidget(); },
        close: function () { closeWidget(); },
        clearHistory: function () { clearHistory(); },
        reset: function () { clearHistory(); },
        on: function (eventName, callback) {
            if (typeof eventName !== 'string' || typeof callback !== 'function') return function () {};
            eventListeners[eventName] = eventListeners[eventName] || [];
            eventListeners[eventName].push(callback);
            return function () { window.CanonicaWidget.off(eventName, callback); };
        },
        off: function (eventName, callback) {
            if (!eventListeners[eventName]) return;
            eventListeners[eventName] = eventListeners[eventName].filter(function (current) { return current !== callback; });
        },
        getContext: function () { return productContext; },
    };

    function requestPredictiveHelp(ctx) {
        if (!predictiveEnabled) return;
        if (!ctx || !ctx.page || !window.fetch) return;
        if (isCurrentRouteBlocked()) return;
        if (predictiveRequestTimer) window.clearTimeout(predictiveRequestTimer);

        var contextKey = JSON.stringify({
            contextKey: ctx.contextKey || '',
            page: ctx.page || '',
            feature: ctx.feature || '',
            workflow: ctx.workflow || '',
            plan: ctx.plan || '',
            userRole: ctx.userRole || '',
            entityHints: Array.isArray(ctx.entityHints) ? ctx.entityHints : [],
        });
        var cachedSuggestion = predictiveSuggestionCache[contextKey];
        if (cachedSuggestion && cachedSuggestion.expiresAt > Date.now()) {
            pendingSuggestion = cachedSuggestion.suggestion || null;
            if (pendingSuggestion && launcher && !isOpen) {
                launcher.setAttribute('aria-label', 'Open help suggestion');
                launcher.setAttribute('title', pendingSuggestion.title || 'Help suggestion');
                launcher.style.boxShadow = '0 0 0 4px rgba(99,102,241,0.18), 0 4px 24px rgba(0,0,0,0.15)';
            }
            sendSuggestionToIframe();
            return;
        }

        predictiveRequestTimer = window.setTimeout(function () {
            fetch(widgetHost + '/api/canonica/predictive-help', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey,
                },
                body: JSON.stringify(ctx),
            }).then(function (response) {
                if (response.status !== 200) {
                    predictiveSuggestionCache[contextKey] = {
                        expiresAt: Date.now() + predictiveSuggestionCacheTtlMs,
                        suggestion: null,
                    };
                    return null;
                }
                return response.json();
            }).then(function (data) {
                if (!data || !data.suggestion) return;
                predictiveSuggestionCache[contextKey] = {
                    expiresAt: Date.now() + predictiveSuggestionCacheTtlMs,
                    suggestion: data.suggestion,
                };
                pendingSuggestion = data.suggestion;
                if (launcher && !isOpen) {
                    launcher.setAttribute('aria-label', 'Open help suggestion');
                    launcher.setAttribute('title', data.suggestion.title || 'Help suggestion');
                    launcher.style.boxShadow = '0 0 0 4px rgba(99,102,241,0.18), 0 4px 24px rgba(0,0,0,0.15)';
                }
                sendSuggestionToIframe();
            }).catch(function () {
                // Predictive help is optional and must never affect the host app.
            });
        }, 250);
    }

    function getRemoteConfigCacheKey() {
        return 'canonica-widget-config:' + apiKey.slice(0, 14) + ':' + widgetHost;
    }

    function readCachedRemoteConfig() {
        try {
            if (!window.sessionStorage) return null;
            var raw = window.sessionStorage.getItem(getRemoteConfigCacheKey());
            if (!raw) return null;
            var cached = JSON.parse(raw);
            if (!cached || cached.expiresAt <= Date.now()) {
                window.sessionStorage.removeItem(getRemoteConfigCacheKey());
                return null;
            }
            contextBundleConfig = sanitizeBundleConfig(cached.bundle);
            return sanitizeRemoteConfig(cached.config);
        } catch (_) {
            return null;
        }
    }

    function writeCachedRemoteConfig(config, ttlSeconds, bundle) {
        try {
            if (!window.sessionStorage) return;
            window.sessionStorage.setItem(getRemoteConfigCacheKey(), JSON.stringify({
                config: config,
                bundle: sanitizeBundleConfig(bundle),
                expiresAt: Date.now() + Math.max(10, Math.min(300, ttlSeconds || 60)) * 1000,
            }));
        } catch (_) {}
    }

    function buildRemoteConfigUrl() {
        var params = [];
        function addParam(key, value) {
            if (!value || typeof value !== 'string') return;
            params.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
        }

        addParam('path', getCurrentRoutePath());
        if (productContext) {
            addParam('contextKey', productContext.contextKey || '');
            addParam('feature', productContext.feature || '');
            addParam('page', productContext.page || '');
        }

        return widgetHost + '/api/widget/config' + (params.length ? '?' + params.join('&') : '');
    }

    function loadRemoteConfig() {
        if (!useRemoteConfig || !window.fetch) return;

        var cachedConfig = readCachedRemoteConfig();
        if (cachedConfig && Object.keys(cachedConfig).length) {
            applyConfig(cachedConfig);
            return;
        }

        fetch(buildRemoteConfigUrl(), {
            method: 'GET',
            headers: { 'X-API-Key': apiKey },
        }).then(function (response) {
            if (response.status !== 200) return null;
            return response.json();
        }).then(function (data) {
            if (!data || !data.config) return;
            var remoteConfig = sanitizeRemoteConfig(data.config);
            remoteConfig.predictiveEnabled = Boolean(data.capabilities && data.capabilities.predictiveSupport);
            contextBundleConfig = sanitizeBundleConfig(data.bundles);
            writeCachedRemoteConfig(remoteConfig, data.cacheTtlSeconds || remoteConfigCacheTtlMs / 1000, contextBundleConfig);
            applyConfig(remoteConfig);
        }).catch(function () {
            // Dashboard config is optional. Script attributes keep the widget usable.
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
