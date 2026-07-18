'use client';

import AntdLayoutWrapper from '@antdComponent/layoutWrapper';
import AntdThemeProvider from '@providers/antdThemeProvider';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import React, { Component, ErrorInfo, ReactNode } from 'react';

type LayoutProviderProps = {
  children: React.ReactNode;
  skipLayout?: boolean;
};

// Error boundary to catch layout rendering errors
class LayoutErrorBoundary extends Component<{ children: ReactNode }> {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logRuntimeFailure('layout_error_boundary_render_failed', error, {
      componentStackPresent: Boolean(errorInfo.componentStack),
      componentStackLength: errorInfo.componentStack?.length || 0,
    });
  }
  
  render() {
    if (this.state.hasError) {
      return <LayoutFailureFallback />;
    }
    
    return this.props.children;
  }
}

// Do not render the same failed child tree again inside the fallback.
function LayoutFailureFallback() {
  return (
    <div
      role="alert"
      style={{
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: 22, margin: 0 }}>Page layout unavailable</h1>
      <p style={{ margin: 0, maxWidth: 420 }}>
        Refresh the page to restore the owner workspace.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{ minHeight: 44, padding: '10px 18px' }}
        type="button"
      >
        Refresh Page
      </button>
    </div>
  );
}

/**
 * A client component that wraps content with the AntdLayoutWrapper
 * This component assumes Redux and other providers are already set up
 */
export default function LayoutProvider({ children, skipLayout = false }: LayoutProviderProps) {
  // Using useEffect to ensure client-side only execution
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // During server rendering or static generation, just render children
  if (!isMounted) {
    return <>{children}</>;
  }
  
  if (skipLayout) {
    return <>{children}</>;
  }
  
  // Note: Redux provider is now provided by ClientProviders, not here
  return (
    <AntdThemeProvider>
      <LayoutErrorBoundary>
        <AntdLayoutWrapper>{children}</AntdLayoutWrapper>
      </LayoutErrorBoundary>
    </AntdThemeProvider>
  );
}
