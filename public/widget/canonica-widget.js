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
 *           data-size="medium">
 *   </script>
 *
 * JavaScript API (optional):
 *   window.CanonicaWidget.setContext({ feature: 'billing', page: 'invoices' })
 *   window.CanonicaWidget.open()
 *   window.CanonicaWidget.close()
 *
 * Options:
 *   data-api-key       (required) Your Canonica API key
 *   data-position      (optional) "bottom-right" | "bottom-left" | "top-right" | "top-left"
 *   data-accent-color  (optional) Hex color (default: #6366f1)
 *   data-shape         (optional) "rounded" (circle) | "pill" (rectangle)
 *   data-display       (optional) "icon" | "text" | "icon-text"
 *   data-label         (optional) Text for launcher (default: "?")
 *   data-size          (optional) "small" | "medium" | "large"
 *   data-offset-x      (optional) Horizontal offset in px (default: 20)
 *   data-offset-y      (optional) Vertical offset in px (default: 20)
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
    var position = script.getAttribute('data-position') || 'bottom-right';
    var accentColor = script.getAttribute('data-accent-color') || '#6366f1';
    var shape = script.getAttribute('data-shape') || 'rounded';
    var display = script.getAttribute('data-display') || 'icon';
    var label = script.getAttribute('data-label') || '?';
    var size = script.getAttribute('data-size') || 'medium';
    var offsetX = parseInt(script.getAttribute('data-offset-x') || '20', 10);
    var offsetY = parseInt(script.getAttribute('data-offset-y') || '20', 10);
    var widgetHost = new URL(script.src).origin;

    // Size presets
    var sizes = {
        small: { circle: 44, pill: 32, font: 16, iconFont: 14 },
        medium: { circle: 56, pill: 40, font: 20, iconFont: 16 },
        large: { circle: 64, pill: 48, font: 24, iconFont: 18 },
    };
    var s = sizes[size] || sizes.medium;

    // Mobile detection
    var isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    if (isMobile) { position = 'bottom-right'; }

    // ===== STATE =====
    var isOpen = false;
    var container = null;
    var iframe = null;
    var launcher = null;
    var productContext = null;
    var pendingSuggestion = null;
    var predictiveRequestTimer = null;

    function sanitizeContextString(value, maxLength) {
        if (typeof value !== 'string') return null;
        var normalized = value.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, '').slice(0, maxLength || 100);
        return normalized || null;
    }

    function sanitizeContextPayload(ctx) {
        if (!ctx || typeof ctx !== 'object' || Array.isArray(ctx)) return null;
        var output = {};
        ['feature', 'page', 'workflow', 'userRole', 'plan'].forEach(function (key) {
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
        return Object.keys(output).length ? output : null;
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

    function createLauncher() {
        launcher = document.createElement('div');
        launcher.id = 'canonica-widget-launcher';
        launcher.setAttribute('role', 'button');
        launcher.setAttribute('aria-label', 'Open help widget');
        launcher.setAttribute('tabindex', '0');

        var isPill = shape === 'pill';
        var baseStyles = {
            position: 'fixed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
            background: accentColor,
            color: '#ffffff',
            boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
            zIndex: '2147483646',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            userSelect: 'none',
            border: 'none',
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

        Object.assign(launcher.style, baseStyles, getPositionStyles());

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
            zIndex: '2147483647',
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

        iframe.addEventListener('load', function () {
            sendContextToIframe();
            sendSuggestionToIframe();
        });
    }

    // ===== OPEN / CLOSE =====
    function toggleWidget() { isOpen ? closeWidget() : openWidget(); }

    function openWidget() {
        if (!container) createWidget();
        isOpen = true;
        container.style.display = 'block';
        requestAnimationFrame(function () {
            container.style.opacity = '1';
            container.style.transform = 'translateY(0) scale(1)';
        });
        launcher.textContent = '✕';
        launcher.style.fontSize = (s.iconFont) + 'px';
        // Send current context and suggestion to iframe
        sendContextToIframe();
        sendSuggestionToIframe();
    }

    function sendContextToIframe() {
        if (productContext && iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'canonica-context-update', context: productContext }, widgetHost);
        }
    }

    function sendSuggestionToIframe() {
        if (pendingSuggestion && iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'canonica-predictive-suggestion', suggestion: pendingSuggestion }, widgetHost);
        }
    }

    function closeWidget() {
        isOpen = false;
        container.style.opacity = '0';
        container.style.transform = 'translateY(10px) scale(0.95)';
        setTimeout(function () { if (!isOpen) container.style.display = 'none'; }, 200);
        launcher.textContent = getLauncherContent();
        launcher.style.fontSize = (shape === 'pill' ? s.iconFont : s.font) + 'px';
    }

    // ===== MESSAGE LISTENER =====
    window.addEventListener('message', function (e) {
        if (e.origin !== widgetHost) return;
        if (e.data && e.data.type === 'canonica-widget-close') { closeWidget(); }
    });

    // ===== PUBLIC API =====
    window.CanonicaWidget = {
        setContext: function (ctx) {
            var sanitizedContext = sanitizeContextPayload(ctx);
            if (!sanitizedContext) return;
            productContext = sanitizedContext;
            // Forward to iframe if already loaded
            sendContextToIframe();
            requestPredictiveHelp(sanitizedContext);
        },
        page: function (ctx) { this.setContext(ctx); },
        open: function () { openWidget(); },
        close: function () { closeWidget(); },
    };

    function requestPredictiveHelp(ctx) {
        if (!ctx || !ctx.page || !window.fetch) return;
        if (predictiveRequestTimer) window.clearTimeout(predictiveRequestTimer);

        predictiveRequestTimer = window.setTimeout(function () {
            fetch(widgetHost + '/api/canonica/predictive-help', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey,
                },
                body: JSON.stringify(ctx),
            }).then(function (response) {
                if (response.status !== 200) return null;
                return response.json();
            }).then(function (data) {
                if (!data || !data.suggestion) return;
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

    // ===== INIT =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createLauncher);
    } else {
        createLauncher();
    }
})();
