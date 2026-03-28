/**
 * Firestore Error Handler
 * 
 * Provides specific error handling for Firestore/Firebase operations
 * with user-friendly messages and appropriate HTTP status codes.
 */

import { NextResponse } from 'next/server';
import { logger } from '@lib/monitoring/logger';

export interface FirestoreError extends Error {
    code?: string;
    details?: any;
}

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
    context?: {
        operation?: string;
        userId?: string;
        tenantId?: number;
        endpoint?: string;
        [key: string]: any;
    }
): NextResponse {
    const firestoreError = error as FirestoreError;
    const errorCode = firestoreError.code;
    
    // Check if it's a known Firestore error
    if (errorCode && errorCode in FIRESTORE_ERROR_CODES) {
        const errorInfo = FIRESTORE_ERROR_CODES[errorCode as keyof typeof FIRESTORE_ERROR_CODES];
        
        // Log based on severity
        const severity = errorInfo.status >= 500 ? 'high' : 'medium';
        logger.error('Firestore Error', {
            errorCode,
            errorMessage: firestoreError.message,
            status: errorInfo.status,
            ...context
        }, severity);
        
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
        logger.error('Firestore Transaction Error', {
            errorMessage: firestoreError.message,
            ...context
        }, 'high');
        
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
        logger.error('Firestore Quota Exceeded', {
            errorMessage: firestoreError.message,
            ...context
        }, 'critical');
        
        return NextResponse.json(
            {
                error: 'Service temporarily unavailable. Please try again in a few moments.',
                code: 'quota-exceeded'
            },
            { status: 503 }
        );
    }
    
    // Generic error fallback
    logger.error('Unhandled Firestore Error', {
        errorCode,
        errorMessage: firestoreError.message,
        stack: firestoreError.stack,
        ...context
    }, 'high');
    
    return NextResponse.json(
        {
            error: 'An error occurred while processing your request',
            details: process.env.NODE_ENV === 'development' ? firestoreError.message : undefined
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
    context?: {
        operation?: string;
        userId?: string;
        tenantId?: number;
        endpoint?: string;
        [key: string]: any;
    }
): NextResponse {
    const razorpayError = error as any;
    
    // Razorpay errors have statusCode property
    if (razorpayError.statusCode) {
        logger.error('Razorpay API Error', {
            statusCode: razorpayError.statusCode,
            errorMessage: razorpayError.error?.description || razorpayError.message,
            errorCode: razorpayError.error?.code,
            ...context
        }, 'high');
        
        return NextResponse.json(
            {
                error: 'Payment service error',
                details: razorpayError.error?.description || 'Failed to process payment request'
            },
            { status: razorpayError.statusCode >= 500 ? 502 : razorpayError.statusCode }
        );
    }
    
    // Network/timeout errors
    if (razorpayError.code === 'ECONNABORTED' || razorpayError.message?.includes('timeout')) {
        logger.error('Razorpay Timeout', {
            errorMessage: razorpayError.message,
            ...context
        }, 'high');
        
        return NextResponse.json(
            {
                error: 'Payment service timeout. Please try again.',
                code: 'timeout'
            },
            { status: 504 }
        );
    }
    
    // Generic Razorpay error
    logger.error('Unhandled Razorpay Error', {
        errorMessage: razorpayError.message,
        stack: razorpayError.stack,
        ...context
    }, 'high');
    
    return NextResponse.json(
        {
            error: 'Failed to process payment request',
            details: process.env.NODE_ENV === 'development' ? razorpayError.message : undefined
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
    context?: {
        operation?: string;
        userId?: string;
        tenantId?: number;
        endpoint?: string;
        [key: string]: any;
    }
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
