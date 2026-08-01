export type AnswerlatticeContextKey =
  | 'contextKey'
  | 'path'
  | 'title'
  | 'feature'
  | 'page'
  | 'workflow'
  | 'role'
  | 'locale'
  | 'userRole'
  | 'plan'
  | 'state'
  | 'version';

export type AnswerlatticePageContext = {
  contextVersion?: number;
  contextKey?: string;
  path?: string;
  title?: string;
  feature?: string;
  page?: string;
  workflow?: string;
  role?: string;
  locale?: string;
  /** Legacy compatibility field. Prefer role for new installs. */
  userRole?: string;
  /** Legacy compatibility field. Public plan label only; never billing metadata. */
  plan?: string;
  /** Public product-state slug used only for governed answer applicability. */
  state?: string;
  /** Numeric product version label, for example 2.4.1. */
  version?: string;
  /** Legacy compatibility field. Public slugs/tags/hints only. */
  entityHints?: string[];
};

export type AnswerlatticeWidgetEventName = 'open' | 'close' | 'context' | 'ready' | 'hide' | 'show';

export type AnswerlatticeWidgetRuntime = {
  setContext?: (context: AnswerlatticePageContext | null) => void;
  page?: (context: AnswerlatticePageContext | null) => void;
  open?: () => void;
  close?: () => void;
  hide?: () => void;
  show?: () => void;
  clearHistory?: () => void;
  clearIdentity?: () => void;
  identify?: (visitor: AnswerlatticeVisitorIdentity | null) => void;
  identifySigned?: (token: string) => void;
  setEvidenceLinks?: (links: AnswerlatticeEvidenceLink[]) => void;
  emitWorkflowEvent?: (eventName: string) => boolean;
  getGuidanceState?: () => {
    stepOrder: number;
    targetId: string | null;
    expectedEvent: string | null;
  } | null;
  on?: (eventName: string, callback: (payload?: unknown) => void) => void;
  off?: (eventName: string, callback: (payload?: unknown) => void) => void;
};

type AnswerlatticeRuntimeWindow = Window & {
  AnswerlatticeWidget?: AnswerlatticeWidgetRuntime;
};

export type AnswerlatticeVisitorIdentity = {
  id: string;
  name?: string;
  email?: string;
};

export type AnswerlatticeEvidenceLink = {
  url: string;
  label?: string;
};

export type AnswerlatticeInitOptions = {
  apiKey: string;
  scriptSrc?: string;
  autoLoad?: boolean;
  context?: AnswerlatticePageContext;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  accentColor?: string;
  blockedRoutes?: string[];
};

export type AnswerlatticeValidationResult =
  | { ok: true; context: AnswerlatticePageContext; errors: [] }
  | { ok: false; context: null; errors: string[] };

export type AnswerlatticeWebClient = {
  init: (nextOptions?: Partial<AnswerlatticeInitOptions>) => Promise<AnswerlatticeWidgetRuntime | null>;
  page: (context: AnswerlatticePageContext) => AnswerlatticeValidationResult;
  setContext: (context: AnswerlatticePageContext) => AnswerlatticeValidationResult;
  open: () => void;
  close: () => void;
  hide: () => void;
  show: () => void;
  clearHistory: () => void;
  clearIdentity: () => void;
  identify: (visitor: AnswerlatticeVisitorIdentity) => void;
  identifySigned: (token: string) => void;
  setEvidenceLinks: (links: AnswerlatticeEvidenceLink[]) => void;
  emitWorkflowEvent: (eventName: string) => boolean;
  getGuidanceState: () => ReturnType<NonNullable<AnswerlatticeWidgetRuntime['getGuidanceState']>>;
  on: (eventName: AnswerlatticeWidgetEventName, callback: (payload?: unknown) => void) => () => void;
  off: (eventName: AnswerlatticeWidgetEventName, callback: (payload?: unknown) => void) => void;
  getRuntime: () => AnswerlatticeWidgetRuntime | null;
};

const DEFAULT_SCRIPT_SRC = 'https://answerlattice.com/widget/v1/answerlattice-widget.js';
const CONTEXT_STRING_KEYS: AnswerlatticeContextKey[] = ['contextKey', 'feature', 'page', 'workflow', 'userRole', 'plan', 'state'];
const MAX_CONTEXT_STRING_LENGTH = 100;
const MAX_ENTITY_HINTS = 5;
const MAX_ENTITY_HINT_LENGTH = 64;
const MAX_CONTEXT_PAYLOAD_BYTES = 2048;
const SENSITIVE_CONTEXT_PATTERN = /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+?\d[\d\s().-]{7,}\d)/i;

export function normalizeAnswerlatticeScriptSrc(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  if (!candidate) return null;
  if (candidate.startsWith('/') && !candidate.startsWith('//')) return candidate;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function sanitizeContextString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  if (SENSITIVE_CONTEXT_PATTERN.test(value)) return null;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, maxLength);
  return normalized || null;
}

function sanitizeContextTitle(value: unknown, maxLength = 120): string | null {
  if (typeof value !== 'string') return null;
  if (SENSITIVE_CONTEXT_PATTERN.test(value)) return null;
  const normalized = value.trim().replace(/[<>{}]/g, '').replace(/\s+/g, ' ').slice(0, maxLength);
  return normalized || null;
}

function normalizeContextPath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (SENSITIVE_CONTEXT_PATTERN.test(value)) return null;
  let route = value.trim();
  if (!route) return null;
  try {
    if (/^https?:\/\//i.test(route)) {
      route = new URL(route).pathname || '/';
    }
  } catch {
    return null;
  }
  route = route.split(/[?#]/)[0]?.trim() || '';
  if (!route) return null;
  if (!route.startsWith('/')) route = `/${route}`;
  route = route.replace(/\/{2,}/g, '/');
  if (route.length > 1 && route.endsWith('/')) route = route.slice(0, -1);
  if (route.includes('*')) return null;
  return route.slice(0, 180);
}

function sanitizeContextVersion(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/^v/i, '');
  if (!/^\d{1,6}(?:\.\d{1,3}){0,2}$/.test(normalized)) return null;
  const [major, minor = '0', patch = '0'] = normalized.split('.');
  if (Number(major) <= 0 || Number(minor) > 999 || Number(patch) > 999) return null;
  return normalized;
}

function getPayloadByteLength(value: unknown): number {
  const serialized = JSON.stringify(value);
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(serialized).length;
  }
  return encodeURIComponent(serialized).replace(/%[A-F\d]{2}/gi, 'x').length;
}

export function validateAnswerlatticePageContext(input: AnswerlatticePageContext): AnswerlatticeValidationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, context: null, errors: ['Context must be an object.'] };
  }

  const context: AnswerlatticePageContext = {};
  const errors: string[] = [];

  CONTEXT_STRING_KEYS.forEach((key) => {
    const value = sanitizeContextString(input[key], MAX_CONTEXT_STRING_LENGTH);
    if (value) context[key] = value;
  });

  const path = normalizeContextPath(input.path);
  if (path) {
    context.path = path;
  }
  const title = sanitizeContextTitle(input.title);
  if (title) context.title = title;
  const role = sanitizeContextString(input.role, 80);
  if (role) {
    context.role = role;
    if (!context.userRole) context.userRole = role;
  }
  const locale = sanitizeContextString(input.locale, 24);
  if (locale) context.locale = locale;
  const version = sanitizeContextVersion(input.version);
  if (version) context.version = version;

  if (typeof input.contextVersion === 'number' && input.contextVersion >= 1 && input.contextVersion <= 10) {
    context.contextVersion = Math.floor(input.contextVersion);
  } else {
    context.contextVersion = 1;
  }

  if (Array.isArray(input.entityHints)) {
    const entityHints = input.entityHints
      .slice(0, MAX_ENTITY_HINTS)
      .map((hint) => sanitizeContextString(hint, MAX_ENTITY_HINT_LENGTH))
      .filter((hint): hint is string => Boolean(hint));
    if (entityHints.length > 0) context.entityHints = entityHints;
  }

  const hasMeaningfulContext = CONTEXT_STRING_KEYS.some((key) => Boolean(context[key]))
    || Boolean(context.path || context.title || context.role || context.locale || context.version)
    || Boolean(context.entityHints?.length);

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

function getRuntime(): AnswerlatticeWidgetRuntime | null {
  return isBrowser() ? (window as AnswerlatticeRuntimeWindow).AnswerlatticeWidget || null : null;
}

function setAttribute(script: HTMLScriptElement, name: string, value: string | number | boolean | undefined | null) {
  if (value === undefined || value === null || value === '') return;
  script.setAttribute(name, String(value));
}

function findExistingScript(scriptSrc: string, apiKey: string): HTMLScriptElement | null {
  if (!isBrowser()) return null;
  const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>('script[data-answerlattice-sdk="true"], script[data-answerlattice-key], script[data-api-key]'));
  return scripts.find((script) => script.src === scriptSrc || script.getAttribute('data-answerlattice-key') === apiKey || script.getAttribute('data-api-key') === apiKey) || null;
}

function loadWidgetScript(options: AnswerlatticeInitOptions): Promise<AnswerlatticeWidgetRuntime | null> {
  if (!isBrowser()) return Promise.resolve(null);

  const scriptSrc = normalizeAnswerlatticeScriptSrc(options.scriptSrc || DEFAULT_SCRIPT_SRC);
  if (!scriptSrc) {
    return Promise.reject(new Error('Invalid Answerlattice widget script source.'));
  }
  const existing = findExistingScript(scriptSrc, options.apiKey);
  if (existing && getRuntime()) return Promise.resolve(getRuntime());

  return new Promise((resolve, reject) => {
    const script = existing || document.createElement('script');
    let resolved = false;

    const finish = () => {
      if (resolved) return;
      resolved = true;
      resolve(getRuntime());
    };

    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', () => {
      if (resolved) return;
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
      if (options.blockedRoutes?.length) setAttribute(script, 'data-blocked-routes', options.blockedRoutes.join(','));
      document.head.appendChild(script);
    }

    window.setTimeout(finish, 5000);
  });
}

export function createAnswerlatticeWebClient(initialOptions: AnswerlatticeInitOptions): AnswerlatticeWebClient {
  let options = { ...initialOptions };
  const pendingContexts: AnswerlatticePageContext[] = [];

  const flushPendingContexts = () => {
    const runtime = getRuntime();
    if (!runtime?.page) return;
    while (pendingContexts.length > 0) {
      const context = pendingContexts.shift();
      if (context) runtime.page(context);
    }
  };

  const sendContext = (context: AnswerlatticePageContext, method: 'page' | 'setContext'): AnswerlatticeValidationResult => {
    const validation = validateAnswerlatticePageContext(context);
    if (!validation.ok) return validation;

    const runtime = getRuntime();
    if (runtime?.[method]) {
      runtime[method]?.(validation.context);
    } else {
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
      getRuntime()?.open?.();
    },
    close() {
      getRuntime()?.close?.();
    },
    hide() {
      getRuntime()?.hide?.();
    },
    show() {
      getRuntime()?.show?.();
    },
    clearHistory() {
      getRuntime()?.clearHistory?.();
    },
    clearIdentity() {
      getRuntime()?.clearIdentity?.();
    },
    identify(visitor) {
      getRuntime()?.identify?.(visitor);
    },
    identifySigned(token) {
      getRuntime()?.identifySigned?.(token);
    },
    setEvidenceLinks(links) {
      getRuntime()?.setEvidenceLinks?.(links);
    },
    emitWorkflowEvent(eventName) {
      return getRuntime()?.emitWorkflowEvent?.(eventName) === true;
    },
    getGuidanceState() {
      return getRuntime()?.getGuidanceState?.() || null;
    },
    on(eventName, callback) {
      getRuntime()?.on?.(eventName, callback);
      return () => getRuntime()?.off?.(eventName, callback);
    },
    off(eventName, callback) {
      getRuntime()?.off?.(eventName, callback);
    },
    getRuntime,
  };
}
