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
class LayoutErrorBoundary extends Component<{ children: ReactNode, fallback: ReactNode }> {
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
      return this.props.fallback;
    }
    
    return this.props.children;
  }
}

// Simple fallback component when layout encounters an error
function SimpleLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: '20px' }}>
      {children}
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
      <LayoutErrorBoundary fallback={<SimpleLayout>{children}</SimpleLayout>}>
        <AntdLayoutWrapper>{children}</AntdLayoutWrapper>
      </LayoutErrorBoundary>
    </AntdThemeProvider>
  );
}
