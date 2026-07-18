import { AntdRegistry } from '@ant-design/nextjs-registry'
import AntdLayoutWrapper from '@antdComponent/layoutWrapper'
import { authOptions } from '@lib/auth'
import { APP_THEME_COLOR } from '@constant/common'
import { isPlatformEntityBlocked } from '@lib/platform/entityBlock'
import LocalisationProvider from '@providers/localisationProvider'
import NoSSRProvider from '@providers/noSSRProvider'
import { ReduxStoreProvider } from '@providers/reduxProvider'
import SessionProvider from '@providers/sessionProvider'
import "@styles/app.scss"
import type { Metadata, Viewport } from 'next'
import { getServerSession } from 'next-auth'
import { getLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import SessionExpiryMonitor from '../../components/auth/SessionExpiryMonitor'
import OwnerPermissionGuard from '../../components/auth/OwnerPermissionGuard'
import OwnerAppUpdatePrompt from '../../components/common/OwnerAppUpdatePrompt'
import MenuListAnswerlatticeWidgetEmbed from '../../components/answerlattice/MenuListAnswerlatticeWidgetEmbed'

export const metadata: Metadata = {
  title: 'MenuList Owner Dashboard',
  description: 'Private MenuList workspace for business owners and their teams.',
  manifest: "/manifest.json",
  authors: [{ name: "MenuList", url: "https://menulist.ai" }],
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export const viewport: Viewport = {
  themeColor: APP_THEME_COLOR,
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function MainLayout({ children }: { children: React.ReactNode }) {

  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/signin");
  }
  if (session.user?.active === false || (session.user as any)?.deleted === true || session.user?.isVerified === false || isPlatformEntityBlocked(session.user)) {
    redirect("/unauthorized");
  }

  // Get locale for internationalization
  const locale = await getLocale();

  return (
    <AntdRegistry>
      <LocalisationProvider locale={locale}>
        <ReduxStoreProvider>
            <SessionProvider session={session}>
            <NoSSRProvider>
              <AntdLayoutWrapper
                globalOverlays={(
                  <>
                    {/* Monitor session expiry and show friendly modal when session expires */}
                    <SessionExpiryMonitor />
                    <OwnerAppUpdatePrompt />
                    <MenuListAnswerlatticeWidgetEmbed />
                  </>
                )}
              >
                <OwnerPermissionGuard>
                  {children}
                </OwnerPermissionGuard>
              </AntdLayoutWrapper>
            </NoSSRProvider>
          </SessionProvider>
        </ReduxStoreProvider>
      </LocalisationProvider>
    </AntdRegistry>
  )
}
