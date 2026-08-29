import { headers } from 'next/headers';

const MYCODEX_PATH_PREFIX = '/__mycodex';

export function normalizeMyCodexBasePath(value: string | null | undefined): string {
    return value === MYCODEX_PATH_PREFIX ? MYCODEX_PATH_PREFIX : '';
}

export async function getMyCodexRequestBasePath(): Promise<string> {
    return normalizeMyCodexBasePath((await headers()).get('x-product-base-path'));
}
