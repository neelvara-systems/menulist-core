/**
 * Offline Fallback Page
 *
 * Served by the service worker (registered via next-pwa) when a navigation
 * request fails due to no network connectivity. Primarily targets installed
 * PWA customers whose menu app launches while offline — without this page,
 * they'd see the browser's generic "No internet" error.
 *
 * Behavior:
 *   - SW precaches this at build time (see `fallbacks.document` in next.config.js)
 *   - Static route — no tenant-specific data (SW doesn't know which tenant yet)
 *   - Minimal JS; plain CSS; friendly copy; reload button
 *
 * Privacy: no analytics from here — we may not have network to send them.
 */

import type { Metadata, Viewport } from 'next';
import OfflineClient from './OfflineClient';

export const metadata: Metadata = {
    title: "You're offline",
    description: 'No internet connection. Try again shortly.',
    robots: { index: false, follow: false },
};

export const viewport: Viewport = {
    themeColor: '#0f172a',
};

export const dynamic = 'force-static';

/**
 * Offline page — server shell. All interactive bits (reload button) live in
 * OfflineClient so this file is pure SSR and ends up in the precache.
 */
export default function OfflinePage() {
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                minHeight: '100vh',
                background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
                color: '#0f172a',
                zIndex: 2147483647,
            }}
        >
            <div
                style={{
                    maxWidth: 440,
                    width: '100%',
                    background: '#fff',
                    borderRadius: 16,
                    padding: '32px 28px',
                    textAlign: 'center',
                    boxShadow: '0 10px 40px rgba(15, 23, 42, 0.08)',
                    border: '1px solid #e2e8f0',
                }}
            >
                <div
                    style={{
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        background: '#fef3c7',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 20,
                    }}
                    aria-hidden="true"
                >
                    {/* Wi-Fi-off icon inlined — no external dep */}
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <line x1="1" y1="1" x2="23" y2="23" />
                        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                        <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
                        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                        <line x1="12" y1="20" x2="12.01" y2="20" />
                    </svg>
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
                    You&apos;re offline
                </h1>
                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.5, margin: '0 0 24px' }}>
                    No internet connection right now. Check your Wi-Fi or mobile data, then try again.
                </p>
                <OfflineClient />
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 16 }}>
                    Reconnect to see the latest live menu.
                </p>
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, marginBottom: 0 }}>
                    If this screen appears inside the installed app, the menu will load again as soon as the connection returns.
                </p>
            </div>
        </div>
    );
}
