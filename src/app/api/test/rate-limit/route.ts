export const dynamic = 'force-dynamic';
/**
 * Rate Limiting Test Route
 * 
 * Use this to verify rate limiting works correctly.
 * Call this endpoint multiple times to hit the limit.
 * 
 * Test with:
 * - Browser: http://localhost:3000/api/test/rate-limit?type=ai
 * - Browser: http://localhost:3000/api/test/rate-limit?type=expensive
 * - Browser: http://localhost:3000/api/test/rate-limit?type=batch
 * - Terminal: node test-rate-limit.js [ai|expensive|batch]
 */

import { 
    checkAIOperationLimit, 
    checkDataWriteLimit,
    checkExpensiveAILimit,
    checkBatchOperationLimit
} from '@lib/rateLimit/helpers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limitType = searchParams.get('type') || 'ai';
    
    let rateLimitResponse;
    let limitInfo = '';
    
    // Choose which rate limit to test
    switch (limitType) {
        case 'expensive':
            rateLimitResponse = await checkExpensiveAILimit();
            limitInfo = '5 requests per minute';
            break;
        case 'batch':
            rateLimitResponse = await checkBatchOperationLimit();
            limitInfo = '3 requests per 5 minutes';
            break;
        case 'write':
            rateLimitResponse = await checkDataWriteLimit();
            limitInfo = '50 requests per minute';
            break;
        case 'ai':
        default:
            rateLimitResponse = await checkAIOperationLimit();
            limitInfo = '20 requests per minute';
            break;
    }
    
    if (rateLimitResponse) {
        return rateLimitResponse;
    }
    
    // If rate limit passed, return success
    return NextResponse.json({
        success: true,
        message: `✅ Request allowed!`,
        type: limitType.toUpperCase(),
        limit: limitInfo,
        timestamp: new Date().toISOString(),
        tip: 'Keep calling this endpoint to test rate limiting!'
    }, { status: 200 });
}

export async function POST(request: NextRequest) {
    return GET(request);
}
