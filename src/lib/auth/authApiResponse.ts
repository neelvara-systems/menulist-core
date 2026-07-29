import { NextResponse } from "next/server";

export const AUTH_PRIVATE_RESPONSE_HEADERS = {
    "Cache-Control": "private, no-store, max-age=0",
    "Pragma": "no-cache",
    "X-Content-Type-Options": "nosniff",
} as const;

export function authPrivateJson(
    body: unknown,
    init: ResponseInit = {},
): NextResponse {
    const headers = new Headers(init.headers);
    Object.entries(AUTH_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        headers.set(name, value);
    });
    return NextResponse.json(body, { ...init, headers });
}

export function withAuthPrivateHeaders<T extends NextResponse>(response: T): T {
    Object.entries(AUTH_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        response.headers.set(name, value);
    });
    return response;
}
