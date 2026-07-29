import { NextResponse } from "next/server";

export const GROWTHOS_PRIVATE_RESPONSE_HEADERS = {
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
} as const;

export function growthOSPrivateJson(
    body: unknown,
    init: ResponseInit = {},
): NextResponse {
    const headers = new Headers(init.headers);
    Object.entries(GROWTHOS_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        headers.set(name, value);
    });
    return NextResponse.json(body, { ...init, headers });
}

export function withGrowthOSPrivateHeaders<T extends NextResponse>(response: T): T {
    Object.entries(GROWTHOS_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        response.headers.set(name, value);
    });
    return response;
}
