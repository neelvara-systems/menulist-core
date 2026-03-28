
// Logging utilities
export const logDatabaseOperation = (operation: string, collection: string, payload?: any) => {
    console.group(`🔥 Firebase Operation: ${operation}`);
    console.log(`Collection: ${collection}`);
    if (payload) {
        console.log('Payload:', payload);
    }
    console.groupEnd();
};

export const logOperationResult = (operation: string, result: any, error?: any) => {
    if (error) {
        console.group(`❌ Operation Failed: ${operation}`);
        console.error('Error:', error);
        console.groupEnd();
    } else {
        console.group(`✅ Operation Success: ${operation}`);
        console.log('Result:', result);
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
    console.log('Firebase Operation:', stats);
};