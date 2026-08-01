export type AnswerlatticeContextKey = 'contextKey' | 'path' | 'title' | 'feature' | 'page' | 'workflow' | 'role' | 'locale' | 'userRole' | 'plan' | 'state' | 'version';
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
export declare function normalizeAnswerlatticeScriptSrc(value: unknown): string | null;
export declare function validateAnswerlatticePageContext(input: AnswerlatticePageContext): AnswerlatticeValidationResult;
export declare const validateAnswerlatticeContext: typeof validateAnswerlatticePageContext;
export declare function createAnswerlatticeWebClient(initialOptions: AnswerlatticeInitOptions): AnswerlatticeWebClient;
