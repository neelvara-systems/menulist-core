'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
    useEffect(() => {
        // Only register service worker in production
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                    if (registrations.length === 0) {
                        navigator.serviceWorker.register('/sw.js')
                            .then(registration => {
                                console.log('Service Worker registered in production:', registration);
                            })
                            .catch(error => {
                                console.error('Service Worker registration failed:', error);
                            });
                    }
                });
            }
        }
    }, []);

    return null;
}

// Add TypeScript declaration for window.workbox
declare global {
    interface Window {
        workbox?: {
            register: () => void;
        };
    }
}
