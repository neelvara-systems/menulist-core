export type CanonicaContextKey =
  | 'contextKey'
  | 'feature'
  | 'page'
  | 'workflow'
  | 'userRole'
  | 'plan';

export type CanonicaPageContext = {
  contextVersion?: number;
  contextKey?: string;
  feature?: string;
  page?: string;
  workflow?: string;
  userRole?: string;
  plan?: string;
  entityHints?: string[];
};

export type CanonicaWidgetEventName = 'open' | 'close' | 'context' | 'ready';

export type CanonicaWidgetRuntime = {
  setContext?: (context: CanonicaPageContext) => void;
  page?: (context: CanonicaPageContext) => void;
  open?: () => void;
  close?: () => void;
  clearHistory?: () => void;
  on?: (eventName: string, callback: (payload?: unknown) => void) => void;
  off?: (eventName: string, callback: (payload?: unknown) => void) => void;
};

export type CanonicaInitOptions = {
  apiKey: string;
  scriptSrc?: string;
  autoLoad?: boolean;
  context?: CanonicaPageContext;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  accentColor?: string;
  blockedRoutes?: string[];
};

export type CanonicaValidationResult =
  | { ok: true; context: CanonicaPageContext; errors: [] }
  | { ok: false; context: null; errors: string[] };

export type CanonicaWebClient = {
  init: (nextOptions?: Partial<CanonicaInitOptions>) => Promise<CanonicaWidgetRuntime | null>;
  page: (context: CanonicaPageContext) => CanonicaValidationResult;
  setContext: (context: CanonicaPageContext) => CanonicaValidationResult;
  open: () => void;
  close: () => void;
  clearHistory: () => void;
  on: (eventName: CanonicaWidgetEventName, callback: (payload?: unknown) => void) => () => void;
  off: (eventName: CanonicaWidgetEventName, callback: (payload?: unknown) => void) => void;
  getRuntime: () => CanonicaWidgetRuntime | null;
};

declare global {
  interface Window {
    CanonicaWidget?: CanonicaWidgetRuntime;
  }
}

const DEFAULT_SCRIPT_SRC = 'https://canonica.app/widget/canonica-widget.js';
const CONTEXT_STRING_KEYS: CanonicaContextKey[] = ['contextKey', 'feature', 'page', 'workflow', 'userRole', 'plan'];
const MAX_CONTEXT_STRING_LENGTH = 100;
const MAX_ENTITY_HINTS = 5;
const MAX_ENTITY_HINT_LENGTH = 64;
const MAX_CONTEXT_PAYLOAD_BYTES = 2048;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function sanitizeContextString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, maxLength);
  return normalized || null;
}

function getPayloadByteLength(value: unknown): number {
  const serialized = JSON.stringify(value);
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(serialized).length;
  }
  return encodeURIComponent(serialized).replace(/%[A-F\d]{2}/gi, 'x').length;
}

export function validateCanonicaPageContext(input: CanonicaPageContext): CanonicaValidationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, context: null, errors: ['Context must be an object.'] };
  }

  const context: CanonicaPageContext = {};
  const errors: string[] = [];

  CONTEXT_STRING_KEYS.forEach((key) => {
    const value = sanitizeContextString(input[key], MAX_CONTEXT_STRING_LENGTH);
    if (value) context[key] = value;
  });

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
    || Boolean(context.entityHints?.length);

  if (!hasMeaningfulContext) {
    errors.push('Context must include at least one safe page, feature, workflow, plan, role, or entity hint.');
  }

  if (getPayloadByteLength(context) > MAX_CONTEXT_PAYLOAD_BYTES) {
    errors.push(`Context payload must stay below ${MAX_CONTEXT_PAYLOAD_BYTES} bytes.`);
  }

  return errors.length > 0
    ? { ok: false, context: null, errors }
    : { ok: true, context, errors: [] };
}

export const validateCanonicaContext = validateCanonicaPageContext;

function getRuntime(): CanonicaWidgetRuntime | null {
  return isBrowser() ? window.CanonicaWidget || null : null;
}

function setAttribute(script: HTMLScriptElement, name: string, value: string | number | boolean | undefined | null) {
  if (value === undefined || value === null || value === '') return;
  script.setAttribute(name, String(value));
}

function findExistingScript(scriptSrc: string, apiKey: string): HTMLScriptElement | null {
  if (!isBrowser()) return null;
  const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>('script[data-canonica-sdk="true"], script[data-api-key]'));
  return scripts.find((script) => script.src === scriptSrc || script.getAttribute('data-api-key') === apiKey) || null;
}

function loadWidgetScript(options: CanonicaInitOptions): Promise<CanonicaWidgetRuntime | null> {
  if (!isBrowser()) return Promise.resolve(null);

  const scriptSrc = options.scriptSrc || DEFAULT_SCRIPT_SRC;
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
      reject(new Error('Failed to load Canonica widget script.'));
    }, { once: true });

    if (!existing) {
      script.async = true;
      script.src = scriptSrc;
      script.setAttribute('data-canonica-sdk', 'true');
      setAttribute(script, 'data-api-key', options.apiKey);
      setAttribute(script, 'data-position', options.position);
      setAttribute(script, 'data-accent-color', options.accentColor);
      if (options.blockedRoutes?.length) setAttribute(script, 'data-blocked-routes', options.blockedRoutes.join(','));
      document.head.appendChild(script);
    }

    window.setTimeout(finish, 5000);
  });
}

export function createCanonicaWebClient(initialOptions: CanonicaInitOptions): CanonicaWebClient {
  let options = { ...initialOptions };
  const pendingContexts: CanonicaPageContext[] = [];

  const flushPendingContexts = () => {
    const runtime = getRuntime();
    if (!runtime?.page) return;
    while (pendingContexts.length > 0) {
      const context = pendingContexts.shift();
      if (context) runtime.page(context);
    }
  };

  const sendContext = (context: CanonicaPageContext, method: 'page' | 'setContext'): CanonicaValidationResult => {
    const validation = validateCanonicaPageContext(context);
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
    clearHistory() {
      getRuntime()?.clearHistory?.();
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
