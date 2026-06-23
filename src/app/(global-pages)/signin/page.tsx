import LoginPage from '@template/loginPage'
import { Metadata } from 'next'
import React, { Suspense } from 'react'
import ServerSidePageLoader from 'src/app/loading'
import { SafeClientWrapper } from 'src/providers/safeClientWrapper'

export const metadata: Metadata = {
  title: 'MenuList - Authentication',
  description: 'Sign in to MenuList.',
  robots: {
    index: false,
    follow: false,
  },
}

function page() {
  return <React.Fragment>
    <Suspense fallback={<ServerSidePageLoader page={'Login'} />}>
      <SafeClientWrapper>
        <LoginPage />
      </SafeClientWrapper>
    </Suspense>
  </React.Fragment>
}

export default page
