import { useEffect, useState } from 'react';

export interface NetworkStatus {
    isOnline: boolean;
    isSlow: boolean;
    effectiveType?: string; // '4g', '3g', '2g', 'slow-2g'
    downlink?: number; // Mbps
    rtt?: number; // Round-trip time in ms
}

type NetworkInformation = EventTarget & {
    downlink?: unknown;
    effectiveType?: unknown;
    rtt?: unknown;
};

function getNetworkInformation(): NetworkInformation | null {
    const navigatorWithConnection = navigator as Navigator & {
        connection?: NetworkInformation;
        mozConnection?: NetworkInformation;
        webkitConnection?: NetworkInformation;
    };

    return navigatorWithConnection.connection
        || navigatorWithConnection.mozConnection
        || navigatorWithConnection.webkitConnection
        || null;
}

function getFiniteMetric(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? value
        : undefined;
}

/**
 * Hook to monitor network connectivity and speed
 * 
 * Features:
 * - Detects online/offline status
 * - Detects slow network (< 1 Mbps or 2g/slow-2g)
 * - Uses Network Information API when available
 * - Falls back to basic online/offline detection
 * 
 * @returns NetworkStatus object
 */
export const useNetworkStatus = (): NetworkStatus => {
    const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(() => {
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        return {
            isOnline,
            isSlow: false,
            effectiveType: undefined,
            downlink: undefined,
            rtt: undefined
        };
    });

    useEffect(() => {
        // Update network status
        const updateNetworkStatus = () => {
            const isOnline = navigator.onLine;

            // Check if Network Information API is available
            const connection = getNetworkInformation();

            if (connection) {
                const effectiveType = typeof connection.effectiveType === 'string'
                    ? connection.effectiveType
                    : undefined;
                const downlink = getFiniteMetric(connection.downlink);
                const rtt = getFiniteMetric(connection.rtt);

                // Consider network slow if:
                // - Effective type is 2g or slow-2g
                // - Downlink is less than 1 Mbps
                // - RTT is greater than 500ms
                const isSlow = effectiveType === '2g' ||
                    effectiveType === 'slow-2g' ||
                    (downlink !== undefined && downlink < 1) ||
                    (rtt !== undefined && rtt > 500);

                setNetworkStatus({
                    isOnline,
                    isSlow,
                    effectiveType,
                    downlink,
                    rtt
                });
            } else {
                // Fallback: only online/offline detection
                setNetworkStatus({
                    isOnline,
                    isSlow: false,
                    effectiveType: undefined,
                    downlink: undefined,
                    rtt: undefined
                });
            }
        };

        // Initial check
        updateNetworkStatus();

        // Listen to online/offline events
        window.addEventListener('online', updateNetworkStatus);
        window.addEventListener('offline', updateNetworkStatus);

        // Listen to connection changes (if supported)
        const connection = getNetworkInformation();

        if (connection) {
            connection.addEventListener('change', updateNetworkStatus);
        }

        // Cleanup
        return () => {
            window.removeEventListener('online', updateNetworkStatus);
            window.removeEventListener('offline', updateNetworkStatus);

            if (connection) {
                connection.removeEventListener('change', updateNetworkStatus);
            }
        };
    }, []);

    return networkStatus;
};
