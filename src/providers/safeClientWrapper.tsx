'use client'

import React, { ReactNode } from 'react'

// A wrapper component to safely render client components
// that might fail during static generation
interface SafeClientWrapperProps {
  children: ReactNode
  fallback?: ReactNode
}

export function SafeClientWrapper({ children, fallback = null }: SafeClientWrapperProps) {
  // This will only be true in the browser, not during static generation
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  // During static generation, return the fallback
  if (!isMounted) {
    return fallback
  }

  // In the browser, render the actual component
  return <>{children}</>
}
