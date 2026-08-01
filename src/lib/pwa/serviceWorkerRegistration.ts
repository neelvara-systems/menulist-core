type ServiceWorkerScriptState = {
    scriptURL: string;
};

export type ServiceWorkerRegistrationIdentity = {
    active?: ServiceWorkerScriptState | null;
    installing?: ServiceWorkerScriptState | null;
    scope: string;
    waiting?: ServiceWorkerScriptState | null;
};

export const getServiceWorkerRegistrationScriptUrl = (
    registration: ServiceWorkerRegistrationIdentity,
): string | undefined => (
    registration.active?.scriptURL
    || registration.installing?.scriptURL
    || registration.waiting?.scriptURL
);

export const isExactServiceWorkerRegistration = (
    registration: ServiceWorkerRegistrationIdentity,
    targetScriptUrl: string,
    targetScope: string,
): boolean => (
    getServiceWorkerRegistrationScriptUrl(registration) === targetScriptUrl
    && registration.scope === targetScope
);
