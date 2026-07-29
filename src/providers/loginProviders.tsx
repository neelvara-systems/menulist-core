'use client';

import AntdThemeProvider from '@providers/antdThemeProvider';
import type { ReactNode } from 'react';

type LoginProvidersProps = {
  children: ReactNode;
};

/**
 * A client component that wraps providers needed for login
 * The root client-provider tree owns Redux; this layer adds Ant Design chrome.
 */
export default function LoginProviders({ children }: LoginProvidersProps) {
  return (
    <AntdThemeProvider>
      {children}
    </AntdThemeProvider>
  );
}
