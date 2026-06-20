
// Logging utilities
export const logDatabaseOperation = (operation: string, collection: string, payload?: any) => {
    if (process.env.NODE_ENV !== 'development') return;
    console.group(`🔥 Firebase Operation: ${operation}`);
    console.log(`Collection: ${collection}`);
    if (payload) {
        console.log('Payload keys:', Object.keys(payload || {}));
    }
    console.groupEnd();
};

export const logOperationResult = (operation: string, result: any, error?: any) => {
    if (process.env.NODE_ENV !== 'development') return;
    if (error) {
        console.group(`❌ Operation Failed: ${operation}`);
        console.error('Error:', error instanceof Error ? error.message : error);
        console.groupEnd();
    } else {
        console.group(`✅ Operation Success: ${operation}`);
        console.log('Result keys:', Object.keys(result || {}));
        console.groupEnd();
    }
};

// Operation tracking
export interface OperationStats {
    operationType: 'read' | 'write' | 'delete';
    timestamp: string;
    collection: string;
    reads: number;
    writes: number;
    deletes: number;
    cacheHits: number;
    cacheMisses: number;
    data?: any;
    payload?: any
}

export const logOperation = (operationStats, stats: OperationStats) => {
    operationStats.push(stats);
    if (process.env.NODE_ENV === 'development') {
        console.log('Firebase Operation:', {
            cacheHits: stats.cacheHits,
            cacheMisses: stats.cacheMisses,
            collection: stats.collection,
            deletes: stats.deletes,
            operationType: stats.operationType,
            reads: stats.reads,
            timestamp: stats.timestamp,
            writes: stats.writes,
        });
    }
};
