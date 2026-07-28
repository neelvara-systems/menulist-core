import { AntdRegistry } from '@ant-design/nextjs-registry'
import { authOptions } from '@lib/auth'
import { getCurrentUser } from '@lib/auth/currentPlatformUser'
import { APP_THEME_COLOR } from '@constant/common'
import LocalisationProvider from '@providers/localisationProvider'
import NoSSRProvider from '@providers/noSSRProvider'
import { ReduxStoreProvider } from '@providers/reduxProvider'
import SessionProvider from '@providers/sessionProvider'
import AntdThemeProvider from '@providers/antdThemeProvider'
import '@styles/app.scss'
import type { Metadata, Viewport } from 'next'
import { getServerSession } from 'next-auth'
import { getLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import ServerSidePageLoader from '../loading'

export const metadata: Metadata = {
    title: 'MenuList - Authentication',
    description: 'Sign in or sign up to MenuList',
    // Owner PWA entry: installing from /signin should create the dashboard app,
    // not a browser-only shortcut. The manifest start_url remains /today.
    manifest: '/manifest.json',
}

export const viewport: Viewport = {
    themeColor: APP_THEME_COLOR,
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
}

export default async function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Check if user is already authenticated - if yes, redirect to dashboard
    const session = await getServerSession(authOptions)
    if (session) {
        const currentUser = await getCurrentUser(session)
        if (currentUser) {
            redirect('/dashboard')
        }
    }

    // Get locale for internationalization
    const locale = await getLocale()

    return (
        <AntdRegistry>
            <LocalisationProvider locale={locale}>
                <ReduxStoreProvider>
                    <SessionProvider session={session}>
                        <NoSSRProvider>
                            <AntdThemeProvider>
                                <Suspense fallback={<ServerSidePageLoader page="Authentication" />}>
                                    {children}
                                </Suspense>
                            </AntdThemeProvider>
                        </NoSSRProvider>
                    </SessionProvider>
                </ReduxStoreProvider>
            </LocalisationProvider>
        </AntdRegistry>
    )
}
