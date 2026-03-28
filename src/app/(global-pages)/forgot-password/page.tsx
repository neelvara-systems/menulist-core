import ForgotPasswordPage from '@template/forgotPassword'
import React, { Suspense } from 'react'
import ServerSidePageLoader from 'src/app/loading'
import { SafeClientWrapper } from 'src/providers/safeClientWrapper'

function page() {
    return <React.Fragment>
        <Suspense fallback={<ServerSidePageLoader page={'Forgot Password'} />}>
            <SafeClientWrapper>
                <ForgotPasswordPage />
            </SafeClientWrapper>
        </Suspense>
    </React.Fragment>
}

export default page