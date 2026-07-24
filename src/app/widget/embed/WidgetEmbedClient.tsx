'use client';

import { useEffect, useState } from 'react';
import WidgetClient from '../[apiKey]/WidgetClient';

const WIDGET_KEY_PATTERN = /^al_[A-Za-z0-9_-]{20,128}$/;

export default function WidgetEmbedClient() {
    const [apiKey, setApiKey] = useState<string | null>(null);

    useEffect(() => {
        const handleBootstrap = (event: MessageEvent) => {
            if (event.source !== window.parent) return;
            if (event.data?.type !== 'answerlattice-widget-bootstrap') return;

            const rawApiKey = typeof event.data.apiKey === 'string' ? event.data.apiKey : '';
            const nextApiKey = rawApiKey.trim();
            if (rawApiKey !== nextApiKey || !WIDGET_KEY_PATTERN.test(nextApiKey)) return;
            setApiKey((current) => current || nextApiKey);
        };

        window.addEventListener('message', handleBootstrap);
        window.parent?.postMessage({ type: 'answerlattice-widget-ready' }, '*');
        return () => window.removeEventListener('message', handleBootstrap);
    }, []);

    return apiKey ? <WidgetClient apiKey={apiKey} /> : null;
}
