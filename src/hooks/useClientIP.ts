import { headers } from 'next/headers'

// Server-only compatibility helper. No React hooks are used here.
export async function useClientIP() {
    const header = await headers()
    const ip = (header.get('x-forwarded-for') ?? '127.0.0.1').split(',')[0]
    return ip
}
