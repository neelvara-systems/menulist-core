export type CanonicaContextKey = 'contextKey' | 'path' | 'title' | 'feature' | 'page' | 'workflow' | 'role' | 'locale' | 'userRole' | 'plan';
export type CanonicaPageContext = {
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
    /** Legacy compatibility field. Public slugs/tags/hints only. */
    entityHints?: string[];
};
export type CanonicaWidgetEventName = 'open' | 'close' | 'context' | 'ready' | 'hide' | 'show';
export type CanonicaWidgetRuntime = {
    setContext?: (context: CanonicaPageContext | null) => void;
    page?: (context: CanonicaPageContext | null) => void;
    open?: () => void;
    close?: () => void;
    hide?: () => void;
    show?: () => void;
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
export type CanonicaValidationResult = {
    ok: true;
    context: CanonicaPageContext;
    errors: [];
} | {
    ok: false;
    context: null;
    errors: string[];
};
export type CanonicaWebClient = {
    init: (nextOptions?: Partial<CanonicaInitOptions>) => Promise<CanonicaWidgetRuntime | null>;
    page: (context: CanonicaPageContext) => CanonicaValidationResult;
    setContext: (context: CanonicaPageContext) => CanonicaValidationResult;
    open: () => void;
    close: () => void;
    hide: () => void;
    show: () => void;
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
export declare function validateCanonicaPageContext(input: CanonicaPageContext): CanonicaValidationResult;
export declare const validateCanonicaContext: typeof validateCanonicaPageContext;
export declare function createCanonicaWebClient(initialOptions: CanonicaInitOptions): CanonicaWebClient;
