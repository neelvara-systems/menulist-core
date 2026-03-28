import { AntdRegistry } from '@ant-design/nextjs-registry'
import CanonicaDashboardLayout from '@/components/canonica/CanonicaDashboardLayout'
import { authOptions } from '@lib/auth'
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
    title: 'Canonica — Knowledge Control Plane',
    description: 'The Support Knowledge Control Plane for SaaS',
}

export default async function CanonicaLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect("/signin");
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
                                <Suspense fallback={<ServerSidePageLoader page="Canonica Dashboard" />}>
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
