// Logging utilities
import {
    getBoundedDatabaseLoggerStringContext,
    getObjectKeyCount,
    logDatabaseLoggerDiagnostic,
    logDatabaseLoggerFailure,
} from './loggerDiagnostics';

export const logDatabaseOperation = (operation: string, collection: string, payload?: any) => {
    if (process.env.NODE_ENV !== 'development') return;
    logDatabaseLoggerDiagnostic('database_operation_observed', {
        ...getBoundedDatabaseLoggerStringContext('collection', collection),
        ...getBoundedDatabaseLoggerStringContext('operation', operation),
        payloadKeyCount: getObjectKeyCount(payload),
    });
};

export const logOperationResult = (operation: string, result: any, error?: any) => {
    if (process.env.NODE_ENV !== 'development') return;
    if (error) {
        logDatabaseLoggerFailure('database_operation_failed', error, {
            ...getBoundedDatabaseLoggerStringContext('operation', operation),
        });
    } else {
        logDatabaseLoggerDiagnostic('database_operation_succeeded', {
            ...getBoundedDatabaseLoggerStringContext('operation', operation),
            resultKeyCount: getObjectKeyCount(result),
        });
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
        logDatabaseLoggerDiagnostic('firebase_operation_stats_recorded', {
            cacheHits: stats.cacheHits,
            cacheMisses: stats.cacheMisses,
            deletes: stats.deletes,
            ...getBoundedDatabaseLoggerStringContext('collection', stats.collection),
            ...getBoundedDatabaseLoggerStringContext('operationType', stats.operationType),
            ...getBoundedDatabaseLoggerStringContext('timestamp', stats.timestamp),
            reads: stats.reads,
            writes: stats.writes,
        });
    }
};
