import ForgotPasswordPage from '@template/forgotPassword'
import { Metadata } from 'next'
import React, { Suspense } from 'react'
import ServerSidePageLoader from 'src/app/loading'
import { SafeClientWrapper } from 'src/providers/safeClientWrapper'

export const metadata: Metadata = {
    title: 'MenuList - Password Reset',
    description: 'Reset access to a MenuList account.',
    robots: {
        index: false,
        follow: false,
    },
}

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
