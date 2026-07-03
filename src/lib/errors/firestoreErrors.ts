/**
 * Firestore Error Handler
 * 
 * Provides specific error handling for Firestore/Firebase operations
 * with user-friendly messages and appropriate HTTP status codes.
 */

import { NextResponse } from 'next/server';
import { logger } from '@lib/monitoring/logger';
import { getBoundedRuntimeStringContext } from '@lib/runtime/runtimeDiagnostics';

export interface FirestoreError extends Error {
    code?: string;
    details?: any;
}

type PaymentErrorContext = {
    operation?: string;
    userId?: string;
    tenantId?: number | string;
    storeId?: number | string;
    productId?: string;
    endpoint?: string;
    [key: string]: any;
};

type PaymentErrorLike = Error & {
    code?: unknown;
    status?: unknown;
    statusCode?: unknown;
    error?: {
        code?: unknown;
        description?: unknown;
    };
};

const getPaymentErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getPaymentErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object') return undefined;
    const paymentError = error as PaymentErrorLike;
    const code = paymentError.code ?? paymentError.error?.code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getPaymentErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object') return undefined;
    const paymentError = error as PaymentErrorLike;
    const status = Number(paymentError.status ?? paymentError.statusCode);
    return Number.isFinite(status) ? status : undefined;
};

const getPaymentHandlerLogContext = (
    context: PaymentErrorContext | undefined,
    responseStatus?: number,
): Record<string, boolean | number | string | null | undefined> => ({
    operation: typeof context?.operation === 'string' ? context.operation.slice(0, 64) : undefined,
    endpoint: typeof context?.endpoint === 'string' ? context.endpoint.slice(0, 128) : undefined,
    productId: typeof context?.productId === 'string' ? context.productId.slice(0, 32) : undefined,
    responseStatus,
    ...getBoundedRuntimeStringContext('userId', context?.userId),
    ...getBoundedRuntimeStringContext('tenantId', context?.tenantId),
    ...getBoundedRuntimeStringContext('storeId', context?.storeId),
});

const logPaymentFailure = (
    message: string,
    failureCode: string,
    error: unknown,
    context?: PaymentErrorContext,
    responseStatus?: number,
): void => {
    logger.error(message, new Error(failureCode), {
        failureCode,
        ...getPaymentHandlerLogContext(context, responseStatus),
        sourceErrorName: getPaymentErrorName(error),
        sourceErrorCode: getPaymentErrorCode(error),
        sourceStatusCode: getPaymentErrorStatus(error),
    });
};

/**
 * Firestore error codes and their meanings
 * https://firebase.google.com/docs/reference/node/firebase.firestore#firestoreerrorcode
 */
export const FIRESTORE_ERROR_CODES = {
    // Client errors (4xx)
    'invalid-argument': { status: 400, message: 'Invalid input data provided' },
    'failed-precondition': { status: 400, message: 'Operation cannot be performed in current state' },
    'out-of-range': { status: 400, message: 'Value is out of valid range' },
    'unauthenticated': { status: 401, message: 'Authentication required' },
    'permission-denied': { status: 403, message: 'Permission denied to access this resource' },
    'not-found': { status: 404, message: 'Requested resource not found' },
    'already-exists': { status: 409, message: 'Resource already exists' },
    'aborted': { status: 409, message: 'Operation aborted due to conflict' },
    
    // Server/Service errors (5xx)
    'cancelled': { status: 499, message: 'Operation was cancelled' },
    'unknown': { status: 500, message: 'An unknown error occurred' },
    'internal': { status: 500, message: 'Internal server error' },
    'data-loss': { status: 500, message: 'Data loss or corruption detected' },
    'deadline-exceeded': { status: 504, message: 'Operation timed out. Please try again.' },
    'resource-exhausted': { status: 503, message: 'Service temporarily unavailable. Please try again later.' },
    'unavailable': { status: 503, message: 'Service temporarily unavailable' },
} as const;

/**
 * Handle Firestore errors and return appropriate NextResponse
 * 
 * @param error - The error object from Firestore
 * @param context - Additional context for logging
 * @returns NextResponse with appropriate status code and message
 * 
 * @example
 * ```typescript
 * try {
 *     await db.runTransaction(...);
 * } catch (error) {
 *     return handleFirestoreError(error, {
 *         operation: 'create-subscription',
 *         userId: session.user.id
 *     });
 * }
 * ```
 */
export function handleFirestoreError(
    error: any,
    context?: PaymentErrorContext
): NextResponse {
    const firestoreError = error as FirestoreError;
    const errorCode = firestoreError.code;
    
    // Check if it's a known Firestore error
    if (errorCode && errorCode in FIRESTORE_ERROR_CODES) {
        const errorInfo = FIRESTORE_ERROR_CODES[errorCode as keyof typeof FIRESTORE_ERROR_CODES];
        
        // Log based on severity
        logPaymentFailure(
            'Firestore Error',
            'payment_firestore_error',
            error,
            context,
            errorInfo.status,
        );
        
        return NextResponse.json(
            {
                error: errorInfo.message,
                code: errorCode
            },
            { status: errorInfo.status }
        );
    }
    
    // Special handling for transaction errors
    if (firestoreError.message?.includes('transaction')) {
        logPaymentFailure(
            'Firestore Transaction Error',
            'payment_firestore_transaction_failed',
            error,
            context,
            409,
        );
        
        return NextResponse.json(
            {
                error: 'Transaction failed. Please try again.',
                details: 'The operation could not be completed atomically'
            },
            { status: 409 }
        );
    }
    
    // Special handling for quota/rate limit errors from Firebase
    if (firestoreError.message?.includes('quota') || firestoreError.message?.includes('rate limit')) {
        logPaymentFailure(
            'Firestore Quota Exceeded',
            'payment_firestore_quota_or_rate_limited',
            error,
            context,
            503,
        );
        
        return NextResponse.json(
            {
                error: 'Service temporarily unavailable. Please try again in a few moments.',
                code: 'quota-exceeded'
            },
            { status: 503 }
        );
    }
    
    // Generic error fallback
    logPaymentFailure(
        'Unhandled Firestore Error',
        'payment_firestore_unhandled',
        error,
        context,
        500,
    );
    
    return NextResponse.json(
        {
            error: 'An error occurred while processing your request',
            details: 'Request could not be completed'
        },
        { status: 500 }
    );
}

/**
 * Razorpay-specific error handler
 * 
 * @param error - The error object from Razorpay
 * @param context - Additional context for logging
 * @returns NextResponse with appropriate status code and message
 */
export function handleRazorpayError(
    error: any,
    context?: PaymentErrorContext
): NextResponse {
    const razorpayError = error as any;
    
    // Razorpay errors have statusCode property
    if (razorpayError.statusCode) {
        logPaymentFailure(
            'Razorpay API Error',
            'payment_razorpay_api_failed',
            error,
            context,
            razorpayError.statusCode >= 500 ? 502 : razorpayError.statusCode,
        );
        
        return NextResponse.json(
            {
                error: 'Payment service error',
                details: 'Failed to process payment request'
            },
            { status: razorpayError.statusCode >= 500 ? 502 : razorpayError.statusCode }
        );
    }
    
    // Network/timeout errors
    if (razorpayError.code === 'ECONNABORTED' || razorpayError.message?.includes('timeout')) {
        logPaymentFailure(
            'Razorpay Timeout',
            'payment_razorpay_timeout',
            error,
            context,
            504,
        );
        
        return NextResponse.json(
            {
                error: 'Payment service timeout. Please try again.',
                code: 'timeout'
            },
            { status: 504 }
        );
    }
    
    // Generic Razorpay error
    logPaymentFailure(
        'Unhandled Razorpay Error',
        'payment_razorpay_unhandled',
        error,
        context,
        502,
    );
    
    return NextResponse.json(
        {
            error: 'Failed to process payment request',
            details: 'Failed to process payment request'
        },
        { status: 502 }
    );
}

/**
 * Determine error type and route to appropriate handler
 * 
 * @example
 * ```typescript
 * try {
 *     // ... operation
 * } catch (error) {
 *     return handlePaymentError(error, {
 *         operation: 'create-subscription',
 *         userId: session.user.id
 *     });
 * }
 * ```
 */
export function handlePaymentError(
    error: any,
    context?: PaymentErrorContext
): NextResponse {
    // Check if it's a Firestore error
    if (error.code && error.code.includes('firestore')) {
        return handleFirestoreError(error, context);
    }
    
    // Check if it's a Razorpay error
    if (error.statusCode || error.error?.code) {
        return handleRazorpayError(error, context);
    }
    
    // Default to Firestore handler (covers most cases)
    return handleFirestoreError(error, context);
}
