"use client";

import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import ErrorReportButton from "@/components/shared/debug/ErrorReportButton";
import { getBoundedErrorStringField } from "@lib/monitoring/boundedLogContext";
import { getDefaultErrorPageTheme, readPersistedErrorPageTheme } from "@lib/runtime/errorPageTheme";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { useEffect, useState } from "react";
import { LuHome, LuRefreshCw } from 'react-icons/lu';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [theme, setTheme] = useState(getDefaultErrorPageTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const digest = getBoundedErrorStringField(error, 'digest');
    logRuntimeFailure('global_error_boundary_rendered', error, {
      hasDigest: Boolean(digest),
      ...getBoundedRuntimeStringContext('digest', digest),
    });
    setTheme(readPersistedErrorPageTheme('global-error-boundary'));
    setMounted(true);
  }, [error]);

  // Theme-aware styles
  const bgColor = theme.darkMode ? '#141414' : '#f5f5f5';
  const textColor = theme.darkMode ? '#ffffff' : '#000000';
  const secondaryTextColor = theme.darkMode ? '#a0a0a0' : '#666666';
  const buttonBgColor = theme.primaryColor;

  return (
    <html lang="en">
      <body style={{
        margin: 0,
        padding: 0,
        backgroundColor: bgColor,
        color: textColor,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: mounted ? 'background-color 0.2s, color 0.2s' : 'none'
      }}>
        <div style={{
          textAlign: 'center',
          padding: 24,
          maxWidth: 480
        }}>
          <ContextualStateIllustration
            color={secondaryTextColor}
            size={152}
            style={{ margin: '0 auto 24px' }}
            variant="serverErrorContext"
          />

          <h1 style={{
            fontSize: 24,
            fontWeight: 600,
            margin: '0 0 12px',
            color: textColor
          }}>
            Something went wrong
          </h1>

          <p style={{
            fontSize: 15,
            margin: '0 0 8px',
            color: textColor
          }}>
            Don&apos;t worry—this happens occasionally. Try refreshing the page to continue.
          </p>

          <p style={{
            fontSize: 13,
            margin: '0 0 24px',
            color: secondaryTextColor
          }}>
            If the problem continues, our support team is here to help.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => reset()}
              style={{
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 500,
                backgroundColor: buttonBgColor,
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <LuRefreshCw aria-hidden="true" size={16} />
              Try Again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 500,
                backgroundColor: 'transparent',
                color: textColor,
                border: `1px solid ${theme.darkMode ? '#404040' : '#d9d9d9'}`,
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <LuHome aria-hidden="true" size={16} />
              Go Home
            </button>
          </div>
          <ErrorReportButton
            error={error}
            source="global-error-boundary"
            style={{ marginTop: 16 }}
          />
        </div>
      </body>
    </html>
  );
}
