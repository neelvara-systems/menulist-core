import { AntdRegistry } from '@ant-design/nextjs-registry'
import AntdLayoutWrapper from '@antdComponent/layoutWrapper'
import { authOptions } from '@lib/auth'
import { APP_THEME_COLOR } from '@constant/common'
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
import MenuListCanonicaWidgetTestHost from '../../components/canonica/MenuListCanonicaWidgetTestHost'
import OwnerAppUpdatePrompt from '../../components/common/OwnerAppUpdatePrompt'

export const metadata: Metadata = {
  title: 'Menulist Ai Dashboard Main',
  description: 'The everything app',
  generator: `
  
  ᴾʳᵉˢᵉⁿᵗⁱⁿᵍ ʸᵒᵘ...
        ▀▄▀▄▀▄🄴🄲🄾🄼🅂🄰🄸▀▄▀▄▀▄
    ✳  🎀  𝒯𝒽𝑒 𝑒𝓋𝑒𝓇𝓎𝓉𝒽𝒾𝓃𝑔 𝒶𝓅𝓅  🎀  ✳
    
  `,
  manifest: "/manifest.json",
  keywords: ["Ecommerce", "Artificial Intelligence"],
  authors: [
    { name: "Dnyaneshwar Garudkar" },
    { name: "Dnyaneshwar Garudkar", url: "https://garudkar.in" },
  ],
};

export const viewport: Viewport = {
  themeColor: APP_THEME_COLOR,
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default async function MainLayout({ children }: { children: React.ReactNode }) {

  const session = await getServerSession(authOptions);
  if (!session) {
    console.log("No session found in MainLayout, redirecting to signin");
    redirect("/signin");
  }

  // Get locale for internationalization
  const locale = await getLocale();

  return (
    <AntdRegistry>
      <LocalisationProvider locale={locale}>
        <ReduxStoreProvider>
            <SessionProvider session={session}>
            {/* Monitor session expiry and show friendly modal when session expires */}
            <SessionExpiryMonitor />
            <OwnerAppUpdatePrompt />
            <NoSSRProvider>
              <AntdLayoutWrapper>
                {children}
              </AntdLayoutWrapper>
              <MenuListCanonicaWidgetTestHost />
            </NoSSRProvider>
          </SessionProvider>
        </ReduxStoreProvider>
      </LocalisationProvider>
    </AntdRegistry>
  )
}
