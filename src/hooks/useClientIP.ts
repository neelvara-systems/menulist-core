import { headers } from 'next/headers'

//used only for pure react components
export function useClientIP() {
    const header = headers()
    const ip = (header.get('x-forwarded-for') ?? '127.0.0.1').split(',')[0]
    return ip
}