import LoginPage from '@template/loginPage'
import { Metadata } from 'next'
import React, { Suspense } from 'react'
import ServerSidePageLoader from 'src/app/loading'
import { SafeClientWrapper } from 'src/providers/safeClientWrapper'

type SignInPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const isAnswerlatticeCallback = (callbackUrl?: string | string[]) => {
  const value = Array.isArray(callbackUrl) ? callbackUrl[0] : callbackUrl;
  if (!value) return false;

  try {
    const pathname = new URL(value, 'https://local.neelvara.invalid').pathname;
    return pathname === '/answerlattice' || pathname.startsWith('/answerlattice/');
  } catch {
    return false;
  }
};

export async function generateMetadata({ searchParams }: SignInPageProps): Promise<Metadata> {
  const params = await searchParams;
  const isAnswerlattice = isAnswerlatticeCallback(params.callbackUrl)
    || params.product === 'answerlattice';

  return {
    title: isAnswerlattice ? 'Answerlattice - Authentication' : 'MenuList - Authentication',
    description: isAnswerlattice ? 'Sign in to Answerlattice.' : 'Sign in to MenuList.',
    robots: {
      index: false,
      follow: false,
    },
  };
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
