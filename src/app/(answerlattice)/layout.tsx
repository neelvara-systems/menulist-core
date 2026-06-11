import { AntdRegistry } from '@ant-design/nextjs-registry'
import AnswerlatticeDashboardLayout from '@/components/answerlattice/AnswerlatticeDashboardLayout'
import { authOptions } from '@lib/auth'
import { ANSWERLATTICE_LOCAL_DEV_PATH_PREFIX, isAnswerlatticeProductHostname } from '@constant/answerlattice/domains'
import { canUseAnswerlatticeManagement, resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope'
import { getStaticAnswerlatticeAppleStartupImages } from '@lib/answerlattice/pwaAssets'
import { isPlatformEntityBlocked } from '@lib/platform/entityBlock'
import LocalisationProvider from '@providers/localisationProvider'
import NoSSRProvider from '@providers/noSSRProvider'
import { ReduxStoreProvider } from '@providers/reduxProvider'
import SessionProvider from '@providers/sessionProvider'
import "@styles/app.scss"
import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { headers } from 'next/headers'
import { getLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import SessionExpiryMonitor from '../../components/auth/SessionExpiryMonitor'
import ServerSidePageLoader from '../loading'

export const metadata: Metadata = {
    applicationName: 'Answerlattice',
    title: 'Answerlattice — Governed Answer Infrastructure',
    description: 'The Governed Answer Infrastructure for SaaS Support',
    metadataBase: new URL('https://answerlattice.com'),
    manifest: '/answerlattice.webmanifest',
    keywords: [
        'governed answer infrastructure',
        'support knowledge infrastructure',
        'canonical answers',
        'support widget',
        'SaaS support knowledge',
    ],
    authors: [{ name: 'Answerlattice', url: 'https://answerlattice.com' }],
    creator: 'Answerlattice',
    publisher: 'Answerlattice',
    openGraph: {
        title: 'Answerlattice — Governed Answer Infrastructure',
        description: 'The governed answer infrastructure that keeps product truth consistent across AI, documentation, and support systems.',
        url: 'https://answerlattice.com',
        siteName: 'Answerlattice',
        images: [
            {
                url: '/answerlattice-og-image.png',
                width: 1200,
                height: 630,
                alt: 'Answerlattice governed answer infrastructure',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Answerlattice — Governed Answer Infrastructure',
        description: 'The governed answer infrastructure that keeps product truth consistent across AI, documentation, and support systems.',
        images: ['/answerlattice-og-image.png'],
    },
    icons: {
        icon: [
            { url: '/answerlattice-favicon.ico', sizes: 'any' },
            { url: '/answerlattice-favicon-16.png', sizes: '16x16', type: 'image/png' },
            { url: '/answerlattice-favicon-32.png', sizes: '32x32', type: 'image/png' },
            { url: '/answerlattice-icon-192.png', sizes: '192x192', type: 'image/png' },
        ],
        apple: [{ url: '/answerlattice-apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    },
    appleWebApp: {
        capable: true,
        title: 'Answerlattice',
        statusBarStyle: 'black-translucent',
        startupImage: getStaticAnswerlatticeAppleStartupImages(),
    },
}

export default async function AnswerlatticeLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);
    const host = headers().get('host');
    const answerlatticePricingPath = isAnswerlatticeProductHostname(host)
        ? '/pricing'
        : `${ANSWERLATTICE_LOCAL_DEV_PATH_PREFIX}/pricing`;

    if (!session) {
        redirect("/signin");
    }
    if (session.user?.active === false || (session.user as any)?.deleted === true || session.user?.isVerified === false || isPlatformEntityBlocked(session.user)) {
        redirect("/unauthorized");
    }
    if (!resolveAnswerlatticeSessionScope(session) && !canUseAnswerlatticeManagement(session)) {
        redirect(answerlatticePricingPath);
    }

    const locale = await getLocale();

    return (
        <AntdRegistry>
            <LocalisationProvider locale={locale}>
                <ReduxStoreProvider>
                    <SessionProvider session={session}>
                        <SessionExpiryMonitor />
                        <NoSSRProvider>
                            <AnswerlatticeDashboardLayout>
                                <Suspense fallback={<ServerSidePageLoader page="Answerlattice Dashboard" brand="answerlattice" />}>
                                    {children}
                                </Suspense>
                            </AnswerlatticeDashboardLayout>
                        </NoSSRProvider>
                    </SessionProvider>
                </ReduxStoreProvider>
            </LocalisationProvider>
        </AntdRegistry>
    )
}
