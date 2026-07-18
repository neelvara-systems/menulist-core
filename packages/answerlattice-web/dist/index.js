const DEFAULT_SCRIPT_SRC = 'https://answerlattice.com/widget/v1/answerlattice-widget.js';
const CONTEXT_STRING_KEYS = ['contextKey', 'feature', 'page', 'workflow', 'userRole', 'plan'];
const MAX_CONTEXT_STRING_LENGTH = 100;
const MAX_ENTITY_HINTS = 5;
const MAX_ENTITY_HINT_LENGTH = 64;
const MAX_CONTEXT_PAYLOAD_BYTES = 2048;
const SENSITIVE_CONTEXT_PATTERN = /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+?\d[\d\s().-]{7,}\d)/i;
function isBrowser() {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
}
function sanitizeContextString(value, maxLength) {
    if (typeof value !== 'string')
        return null;
    if (SENSITIVE_CONTEXT_PATTERN.test(value))
        return null;
    const normalized = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '')
        .slice(0, maxLength);
    return normalized || null;
}
function sanitizeContextTitle(value, maxLength = 120) {
    if (typeof value !== 'string')
        return null;
    if (SENSITIVE_CONTEXT_PATTERN.test(value))
        return null;
    const normalized = value.trim().replace(/[<>{}]/g, '').replace(/\s+/g, ' ').slice(0, maxLength);
    return normalized || null;
}
function normalizeContextPath(value) {
    var _a;
    if (typeof value !== 'string')
        return null;
    if (SENSITIVE_CONTEXT_PATTERN.test(value))
        return null;
    let route = value.trim();
    if (!route)
        return null;
    try {
        if (/^https?:\/\//i.test(route)) {
            route = new URL(route).pathname || '/';
        }
    }
    catch {
        return null;
    }
    route = ((_a = route.split(/[?#]/)[0]) === null || _a === void 0 ? void 0 : _a.trim()) || '';
    if (!route)
        return null;
    if (!route.startsWith('/'))
        route = `/${route}`;
    route = route.replace(/\/{2,}/g, '/');
    if (route.length > 1 && route.endsWith('/'))
        route = route.slice(0, -1);
    return route.slice(0, 180);
}
function getPayloadByteLength(value) {
    const serialized = JSON.stringify(value);
    if (typeof TextEncoder !== 'undefined') {
        return new TextEncoder().encode(serialized).length;
    }
    return encodeURIComponent(serialized).replace(/%[A-F\d]{2}/gi, 'x').length;
}
export function validateAnswerlatticePageContext(input) {
    var _a;
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return { ok: false, context: null, errors: ['Context must be an object.'] };
    }
    const context = {};
    const errors = [];
    CONTEXT_STRING_KEYS.forEach((key) => {
        const value = sanitizeContextString(input[key], MAX_CONTEXT_STRING_LENGTH);
        if (value)
            context[key] = value;
    });
    const path = normalizeContextPath(input.path);
    if (path) {
        context.path = path;
        if (!context.page)
            context.page = sanitizeContextString(path.replace(/^\/+/, '').replace(/\//g, '_') || 'home', MAX_CONTEXT_STRING_LENGTH) || undefined;
    }
    const title = sanitizeContextTitle(input.title);
    if (title)
        context.title = title;
    const role = sanitizeContextString(input.role, 80);
    if (role) {
        context.role = role;
        if (!context.userRole)
            context.userRole = role;
    }
    const locale = sanitizeContextString(input.locale, 24);
    if (locale)
        context.locale = locale;
    if (typeof input.contextVersion === 'number' && input.contextVersion >= 1 && input.contextVersion <= 10) {
        context.contextVersion = Math.floor(input.contextVersion);
    }
    else {
        context.contextVersion = 1;
    }
    if (Array.isArray(input.entityHints)) {
        const entityHints = input.entityHints
            .slice(0, MAX_ENTITY_HINTS)
            .map((hint) => sanitizeContextString(hint, MAX_ENTITY_HINT_LENGTH))
            .filter((hint) => Boolean(hint));
        if (entityHints.length > 0)
            context.entityHints = entityHints;
    }
    const hasMeaningfulContext = CONTEXT_STRING_KEYS.some((key) => Boolean(context[key]))
        || Boolean(context.path || context.title || context.role || context.locale)
        || Boolean((_a = context.entityHints) === null || _a === void 0 ? void 0 : _a.length);
    if (!hasMeaningfulContext) {
        errors.push('Context must include at least one safe page, feature, workflow, public role/plan label, or entity hint.');
    }
    if (getPayloadByteLength(context) > MAX_CONTEXT_PAYLOAD_BYTES) {
        errors.push(`Context payload must stay below ${MAX_CONTEXT_PAYLOAD_BYTES} bytes.`);
    }
    return errors.length > 0
        ? { ok: false, context: null, errors }
        : { ok: true, context, errors: [] };
}
export const validateAnswerlatticeContext = validateAnswerlatticePageContext;
function getRuntime() {
    return isBrowser() ? window.AnswerlatticeWidget || null : null;
}
function setAttribute(script, name, value) {
    if (value === undefined || value === null || value === '')
        return;
    script.setAttribute(name, String(value));
}
function findExistingScript(scriptSrc, apiKey) {
    if (!isBrowser())
        return null;
    const scripts = Array.from(document.querySelectorAll('script[data-answerlattice-sdk="true"], script[data-answerlattice-key], script[data-api-key]'));
    return scripts.find((script) => script.src === scriptSrc || script.getAttribute('data-answerlattice-key') === apiKey || script.getAttribute('data-api-key') === apiKey) || null;
}
function loadWidgetScript(options) {
    if (!isBrowser())
        return Promise.resolve(null);
    const scriptSrc = options.scriptSrc || DEFAULT_SCRIPT_SRC;
    const existing = findExistingScript(scriptSrc, options.apiKey);
    if (existing && getRuntime())
        return Promise.resolve(getRuntime());
    return new Promise((resolve, reject) => {
        var _a;
        const script = existing || document.createElement('script');
        let resolved = false;
        const finish = () => {
            if (resolved)
                return;
            resolved = true;
            resolve(getRuntime());
        };
        script.addEventListener('load', finish, { once: true });
        script.addEventListener('error', () => {
            if (resolved)
                return;
            resolved = true;
            reject(new Error('Failed to load Answerlattice widget script.'));
        }, { once: true });
        if (!existing) {
            script.async = true;
            script.src = scriptSrc;
            script.setAttribute('data-answerlattice-sdk', 'true');
            setAttribute(script, 'data-answerlattice-key', options.apiKey);
            setAttribute(script, 'data-position', options.position);
            setAttribute(script, 'data-accent-color', options.accentColor);
            if ((_a = options.blockedRoutes) === null || _a === void 0 ? void 0 : _a.length)
                setAttribute(script, 'data-blocked-routes', options.blockedRoutes.join(','));
            document.head.appendChild(script);
        }
        window.setTimeout(finish, 5000);
    });
}
export function createAnswerlatticeWebClient(initialOptions) {
    let options = { ...initialOptions };
    const pendingContexts = [];
    const flushPendingContexts = () => {
        const runtime = getRuntime();
        if (!(runtime === null || runtime === void 0 ? void 0 : runtime.page))
            return;
        while (pendingContexts.length > 0) {
            const context = pendingContexts.shift();
            if (context)
                runtime.page(context);
        }
    };
    const sendContext = (context, method) => {
        var _a;
        const validation = validateAnswerlatticePageContext(context);
        if (!validation.ok)
            return validation;
        const runtime = getRuntime();
        if (runtime === null || runtime === void 0 ? void 0 : runtime[method]) {
            (_a = runtime[method]) === null || _a === void 0 ? void 0 : _a.call(runtime, validation.context);
        }
        else {
            pendingContexts.push(validation.context);
        }
        return validation;
    };
    return {
        async init(nextOptions = {}) {
            options = { ...options, ...nextOptions };
            const runtime = options.autoLoad === false
                ? getRuntime()
                : await loadWidgetScript(options);
            if (options.context) {
                sendContext(options.context, 'page');
            }
            flushPendingContexts();
            return runtime;
        },
        page(context) {
            return sendContext(context, 'page');
        },
        setContext(context) {
            return sendContext(context, 'setContext');
        },
        open() {
            var _a, _b;
            (_b = (_a = getRuntime()) === null || _a === void 0 ? void 0 : _a.open) === null || _b === void 0 ? void 0 : _b.call(_a);
        },
        close() {
            var _a, _b;
            (_b = (_a = getRuntime()) === null || _a === void 0 ? void 0 : _a.close) === null || _b === void 0 ? void 0 : _b.call(_a);
        },
        hide() {
            var _a, _b;
            (_b = (_a = getRuntime()) === null || _a === void 0 ? void 0 : _a.hide) === null || _b === void 0 ? void 0 : _b.call(_a);
        },
        show() {
            var _a, _b;
            (_b = (_a = getRuntime()) === null || _a === void 0 ? void 0 : _a.show) === null || _b === void 0 ? void 0 : _b.call(_a);
        },
        clearHistory() {
            var _a, _b;
            (_b = (_a = getRuntime()) === null || _a === void 0 ? void 0 : _a.clearHistory) === null || _b === void 0 ? void 0 : _b.call(_a);
        },
        clearIdentity() {
            var _a, _b;
            (_b = (_a = getRuntime()) === null || _a === void 0 ? void 0 : _a.clearIdentity) === null || _b === void 0 ? void 0 : _b.call(_a);
        },
        identify(visitor) {
            var _a, _b;
            (_b = (_a = getRuntime()) === null || _a === void 0 ? void 0 : _a.identify) === null || _b === void 0 ? void 0 : _b.call(_a, visitor);
        },
        identifySigned(token) {
            var _a, _b;
            (_b = (_a = getRuntime()) === null || _a === void 0 ? void 0 : _a.identifySigned) === null || _b === void 0 ? void 0 : _b.call(_a, token);
        },
        setEvidenceLinks(links) {
            var _a, _b;
            (_b = (_a = getRuntime()) === null || _a === void 0 ? void 0 : _a.setEvidenceLinks) === null || _b === void 0 ? void 0 : _b.call(_a, links);
        },
        emitWorkflowEvent(eventName) {
            var _a, _b;
            return ((_b = (_a = getRuntime()) === null || _a === void 0 ? void 0 : _a.emitWorkflowEvent) === null || _b === void 0 ? void 0 : _b.call(_a, eventName)) === true;
        },
        getGuidanceState() {
            var _a, _b;
            return ((_b = (_a = getRuntime()) === null || _a === void 0 ? void 0 : _a.getGuidanceState) === null || _b === void 0 ? void 0 : _b.call(_a)) || null;
        },
        on(eventName, callback) {
            var _a, _b;
            (_b = (_a = getRuntime()) === null || _a === void 0 ? void 0 : _a.on) === null || _b === void 0 ? void 0 : _b.call(_a, eventName, callback);
            return () => { var _a, _b; return (_b = (_a = getRuntime()) === null || _a === void 0 ? void 0 : _a.off) === null || _b === void 0 ? void 0 : _b.call(_a, eventName, callback); };
        },
        off(eventName, callback) {
            var _a, _b;
            (_b = (_a = getRuntime()) === null || _a === void 0 ? void 0 : _a.off) === null || _b === void 0 ? void 0 : _b.call(_a, eventName, callback);
        },
        getRuntime,
    };
}
