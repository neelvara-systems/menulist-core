import { AntdRegistry } from '@ant-design/nextjs-registry'
import AntdLayoutWrapper from '@antdComponent/layoutWrapper'
import { authOptions } from '@lib/auth'
import LocalisationProvider from '@providers/localisationProvider'
import NoSSRProvider from '@providers/noSSRProvider'
import { ReduxStoreProvider } from '@providers/reduxProvider'
import SessionProvider from '@providers/sessionProvider'
import '@styles/app.scss'
import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { getLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import ServerSidePageLoader from '../loading'

export const metadata: Metadata = {
    title: 'Menulist Ai - Authentication',
    description: 'Sign in or sign up to Menulist Ai',
}

export default async function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Check if user is already authenticated - if yes, redirect to dashboard
    const session = await getServerSession(authOptions)
    if (session) {
        redirect('/dashboard')
    }

    // Get locale for internationalization
    const locale = await getLocale()

    return (
        <AntdRegistry>
            <LocalisationProvider locale={locale}>
                <ReduxStoreProvider>
                    <SessionProvider session={session}>
                        <NoSSRProvider>
                            <AntdLayoutWrapper>
                                <Suspense fallback={<ServerSidePageLoader page="Main Layout" />}>
                                    {children}
                                </Suspense>
                            </AntdLayoutWrapper>
                        </NoSSRProvider>
                    </SessionProvider>
                </ReduxStoreProvider>
            </LocalisationProvider>
        </AntdRegistry>
    )
}
