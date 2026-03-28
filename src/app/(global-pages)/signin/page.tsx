import LoginPage from '@template/loginPage'
import React, { Suspense } from 'react'
import ServerSidePageLoader from 'src/app/loading'
import { SafeClientWrapper } from 'src/providers/safeClientWrapper'

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