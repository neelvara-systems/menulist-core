'use client';

import { useEffect, useRef } from 'react';

export type TurnstileStatus = 'disabled' | 'loading' | 'ready' | 'expired' | 'error';

type TurnstileApi = {
    render: (container: HTMLElement, options: Record<string, unknown>) => string;
    remove?: (widgetId: string) => void;
    reset: (widgetId?: string) => void;
};

type TurnstileWindow = Window & {
    turnstile?: TurnstileApi;
};

type TurnstileWidgetProps = {
    action?: string;
    className?: string;
    onStatusChange?: (status: TurnstileStatus) => void;
    onTokenChange: (token: string | null) => void;
    resetSignal?: number;
    theme?: 'auto' | 'light' | 'dark';
};

const TURNSTILE_SCRIPT_ID = 'cloudflare-turnstile-script';
const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

let turnstileScriptPromise: Promise<void> | null = null;

export const isTurnstileClientEnabled = () => Boolean(TURNSTILE_SITE_KEY);

const getTurnstile = () => {
    if (typeof window === 'undefined') return null;
    return (window as TurnstileWindow).turnstile || null;
};

const loadTurnstileScript = () => {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('Turnstile is browser-only.'));
    }

    if (getTurnstile()) return Promise.resolve();
    if (turnstileScriptPromise) return turnstileScriptPromise;

    turnstileScriptPromise = new Promise<void>((resolve, reject) => {
        const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(), { once: true });
            existingScript.addEventListener('error', () => reject(new Error('Turnstile script failed.')), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.id = TURNSTILE_SCRIPT_ID;
        script.async = true;
        script.defer = true;
        script.src = TURNSTILE_SCRIPT_SRC;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Turnstile script failed.'));
        document.head.appendChild(script);
    });

    return turnstileScriptPromise;
};

export default function TurnstileWidget({
    action = 'public_form_submit',
    className,
    onStatusChange,
    onTokenChange,
    resetSignal = 0,
    theme = 'auto',
}: TurnstileWidgetProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);
    const onStatusChangeRef = useRef(onStatusChange);
    const onTokenChangeRef = useRef(onTokenChange);

    useEffect(() => {
        onStatusChangeRef.current = onStatusChange;
    }, [onStatusChange]);

    useEffect(() => {
        onTokenChangeRef.current = onTokenChange;
    }, [onTokenChange]);

    useEffect(() => {
        if (!TURNSTILE_SITE_KEY) {
            onStatusChangeRef.current?.('disabled');
            onTokenChangeRef.current(null);
            return;
        }

        let active = true;
        onStatusChangeRef.current?.('loading');
        onTokenChangeRef.current(null);

        loadTurnstileScript()
            .then(() => {
                if (!active || !containerRef.current) return;

                const turnstile = getTurnstile();
                if (!turnstile) throw new Error('Turnstile API unavailable.');

                if (widgetIdRef.current && turnstile.remove) {
                    turnstile.remove(widgetIdRef.current);
                    widgetIdRef.current = null;
                }

                widgetIdRef.current = turnstile.render(containerRef.current, {
                    action,
                    callback: (token: string) => {
                        onTokenChangeRef.current(token);
                        onStatusChangeRef.current?.('ready');
                    },
                    'error-callback': () => {
                        onTokenChangeRef.current(null);
                        onStatusChangeRef.current?.('error');
                    },
                    'expired-callback': () => {
                        onTokenChangeRef.current(null);
                        onStatusChangeRef.current?.('expired');
                    },
                    sitekey: TURNSTILE_SITE_KEY,
                    theme,
                });
            })
            .catch(() => {
                onTokenChangeRef.current(null);
                onStatusChangeRef.current?.('error');
            });

        return () => {
            active = false;
            const turnstile = getTurnstile();
            if (widgetIdRef.current && turnstile?.remove) {
                turnstile.remove(widgetIdRef.current);
                widgetIdRef.current = null;
            }
        };
    }, [action, theme]);

    useEffect(() => {
        if (!widgetIdRef.current) return;
        const turnstile = getTurnstile();
        if (!turnstile) return;
        onTokenChangeRef.current(null);
        onStatusChangeRef.current?.('loading');
        turnstile.reset(widgetIdRef.current);
    }, [resetSignal]);

    if (!TURNSTILE_SITE_KEY) return null;

    return (
        <div
            className={className}
            style={className ? undefined : { display: 'flex', justifyContent: 'center', minHeight: 65 }}
        >
            <div ref={containerRef} />
        </div>
    );
}
