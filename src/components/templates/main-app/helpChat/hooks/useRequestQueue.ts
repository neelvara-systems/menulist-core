/**
 * Request Queue Hook
 * 
 * Prevents race conditions by ensuring only one request processes at a time.
 * This is critical for preventing:
 * - Messages added to wrong session
 * - Duplicate messages
 * - Lost messages when user rapidly sends multiple queries
 * 
 * Industry Standard: ChatGPT, Claude, and Perplexity all use request queuing
 * to ensure message ordering and prevent race conditions.
 */

import { useCallback, useRef } from 'react';

interface QueueItem {
    id: string;
    execute: () => Promise<void>;
}

interface UseRequestQueueReturn {
    enqueue: (item: QueueItem) => void;
    isProcessing: () => boolean;
    clear: () => void;
}

export function useRequestQueue(): UseRequestQueueReturn {
    const queueRef = useRef<QueueItem[]>([]);
    const processingRef = useRef(false);

    const processQueue = useCallback(async () => {
        // Don't start if already processing or queue is empty
        if (processingRef.current || queueRef.current.length === 0) {
            return;
        }

        processingRef.current = true;

        // Process all queued items sequentially
        while (queueRef.current.length > 0) {
            const item = queueRef.current[0];

            try {
                await item.execute();
            } catch (error) {
                // Continue processing even if one item fails
            }

            // Remove processed item
            queueRef.current.shift();
        }

        processingRef.current = false;
    }, []);

    const enqueue = useCallback((item: QueueItem) => {
        queueRef.current.push(item);
        processQueue();
    }, [processQueue]);

    const isProcessing = useCallback(() => {
        return processingRef.current || queueRef.current.length > 0;
    }, []);

    const clear = useCallback(() => {
        queueRef.current = [];
        processingRef.current = false;
    }, []);

    return { enqueue, isProcessing, clear };
}
