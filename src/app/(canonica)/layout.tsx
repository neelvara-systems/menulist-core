import { AntdRegistry } from '@ant-design/nextjs-registry'
import CanonicaDashboardLayout from '@/components/canonica/CanonicaDashboardLayout'
import { authOptions } from '@lib/auth'
import { canUseCanonicaManagement, resolveCanonicaSessionScope } from '@lib/canonica/sessionScope'
import { getStaticCanonicaAppleStartupImages } from '@lib/canonica/pwaAssets'
import { isPlatformEntityBlocked } from '@lib/platform/entityBlock'
import LocalisationProvider from '@providers/localisationProvider'
import NoSSRProvider from '@providers/noSSRProvider'
import { ReduxStoreProvider } from '@providers/reduxProvider'
import SessionProvider from '@providers/sessionProvider'
import "@styles/app.scss"
import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { getLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import SessionExpiryMonitor from '../../components/auth/SessionExpiryMonitor'
import ServerSidePageLoader from '../loading'

export const metadata: Metadata = {
    applicationName: 'Canonica',
    title: 'Canonica — Knowledge Control Plane',
    description: 'The Support Knowledge Control Plane for SaaS',
    manifest: '/canonica.webmanifest',
    icons: {
        icon: [
            { url: '/canonica-favicon.ico', sizes: 'any' },
            { url: '/canonica-favicon-16.png', sizes: '16x16', type: 'image/png' },
            { url: '/canonica-favicon-32.png', sizes: '32x32', type: 'image/png' },
            { url: '/canonica-icon-192.png', sizes: '192x192', type: 'image/png' },
        ],
        apple: [{ url: '/canonica-apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    },
    appleWebApp: {
        capable: true,
        title: 'Canonica',
        statusBarStyle: 'black-translucent',
        startupImage: getStaticCanonicaAppleStartupImages(),
    },
}

export default async function CanonicaLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect("/signin");
    }
    if (session.user?.active === false || (session.user as any)?.deleted === true || session.user?.isVerified === false || isPlatformEntityBlocked(session.user)) {
        redirect("/unauthorized");
    }
    if (!resolveCanonicaSessionScope(session) && !canUseCanonicaManagement(session)) {
        redirect("/unauthorized");
    }

    const locale = await getLocale();

    return (
        <AntdRegistry>
            <LocalisationProvider locale={locale}>
                <ReduxStoreProvider>
                    <SessionProvider session={session}>
                        <SessionExpiryMonitor />
                        <NoSSRProvider>
                            <CanonicaDashboardLayout>
                                <Suspense fallback={<ServerSidePageLoader page="Canonica Dashboard" brand="canonica" />}>
                                    {children}
                                </Suspense>
                            </CanonicaDashboardLayout>
                        </NoSSRProvider>
                    </SessionProvider>
                </ReduxStoreProvider>
            </LocalisationProvider>
        </AntdRegistry>
    )
}
