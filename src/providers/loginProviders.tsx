'use client';

import AntdThemeProvider from '@providers/antdThemeProvider';
import React from 'react';

type LoginProvidersProps = {
  children: React.ReactNode;
};

/**
 * A client component that wraps providers needed for login
 * Includes Redux and AntD theme providers to ensure theme changes are applied
 */
export default function LoginProviders({ children }: LoginProvidersProps) {
  // Using useEffect to ensure client-side only execution
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // During server rendering or static generation, just render children
  if (!isMounted) {
    return <>{children}</>;
  }

  // In the browser, provide AntdThemeProvider with Redux context
  return (
    <AntdThemeProvider ensureReduxContext={true}>
      {children}
    </AntdThemeProvider>
  );
}
