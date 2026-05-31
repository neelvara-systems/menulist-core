export type AnswerlatticeContextKey = 'contextKey' | 'path' | 'title' | 'feature' | 'page' | 'workflow' | 'role' | 'locale' | 'userRole' | 'plan';
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
    on?: (eventName: string, callback: (payload?: unknown) => void) => void;
    off?: (eventName: string, callback: (payload?: unknown) => void) => void;
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
export type AnswerlatticeValidationResult = {
    ok: true;
    context: AnswerlatticePageContext;
    errors: [];
} | {
    ok: false;
    context: null;
    errors: string[];
};
export type AnswerlatticeWebClient = {
    init: (nextOptions?: Partial<AnswerlatticeInitOptions>) => Promise<AnswerlatticeWidgetRuntime | null>;
    page: (context: AnswerlatticePageContext) => AnswerlatticeValidationResult;
    setContext: (context: AnswerlatticePageContext) => AnswerlatticeValidationResult;
    open: () => void;
    close: () => void;
    hide: () => void;
    show: () => void;
    clearHistory: () => void;
    on: (eventName: AnswerlatticeWidgetEventName, callback: (payload?: unknown) => void) => () => void;
    off: (eventName: AnswerlatticeWidgetEventName, callback: (payload?: unknown) => void) => void;
    getRuntime: () => AnswerlatticeWidgetRuntime | null;
};
declare global {
    interface Window {
        AnswerlatticeWidget?: AnswerlatticeWidgetRuntime;
    }
}
export declare function validateAnswerlatticePageContext(input: AnswerlatticePageContext): AnswerlatticeValidationResult;
export declare const validateAnswerlatticeContext: typeof validateAnswerlatticePageContext;
export declare function createAnswerlatticeWebClient(initialOptions: AnswerlatticeInitOptions): AnswerlatticeWebClient;
