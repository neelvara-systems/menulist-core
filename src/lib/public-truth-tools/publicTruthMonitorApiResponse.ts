import { NextResponse } from "next/server";

export const PUBLIC_TRUTH_MONITOR_PRIVATE_RESPONSE_HEADERS = {
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
} as const;

export function publicTruthMonitorJson(
    body: unknown,
    init: ResponseInit = {},
): NextResponse {
    const headers = new Headers(init.headers);
    Object.entries(PUBLIC_TRUTH_MONITOR_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        headers.set(name, value);
    });
    return NextResponse.json(body, { ...init, headers });
}

export function withPublicTruthMonitorPrivateHeaders<T extends NextResponse>(
    response: T,
): T {
    Object.entries(PUBLIC_TRUTH_MONITOR_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        response.headers.set(name, value);
    });
    return response;
}
