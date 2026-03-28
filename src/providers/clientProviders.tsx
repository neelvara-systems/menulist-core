'use client';

import { AntdRegistry } from '@ant-design/nextjs-registry';
import NoSSRProvider from '@providers/noSSRProvider';
import { ReduxStoreProvider } from '@providers/reduxProvider';
import { TodayActionProvider } from '@providers/TodayActionProvider';
import { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import React from 'react';

type ClientProvidersProps = {
  children: React.ReactNode;
  session: Session | null;
};

/**
 * A client component that wraps all providers consistently
 * This is needed because context providers cannot be used in Server Components
 * ORDER IS IMPORTANT: AntdRegistry -> NoSSR -> Redux -> Session -> Children
 */
export default function ClientProviders({ children, session }: ClientProvidersProps) {

  return (
    <AntdRegistry>
      <NoSSRProvider>
        <ReduxStoreProvider>
          <SessionProvider session={session}>
            <TodayActionProvider>
              {children}
            </TodayActionProvider>
          </SessionProvider>
        </ReduxStoreProvider>
      </NoSSRProvider>
    </AntdRegistry>
  );
}
