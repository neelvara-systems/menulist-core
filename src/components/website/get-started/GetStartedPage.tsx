'use client';

import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function GetStartedPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.replace('/pricing');
    }
  }, [status, session, router]);

  // Show loading state while checking session
  if (status === 'loading' || (status === 'authenticated' && session)) {
    return (
      <main>
        <section
          style={{
            padding: 'var(--ws-space-24) var(--ws-space-6)',
            backgroundColor: 'var(--ws-bg-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '70vh',
          }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid var(--ws-border-default)',
            borderTopColor: 'var(--ws-brand-secondary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </section>
      </main>
    );
  }
  return (
    <main>
      <section
        style={{
          padding: 'var(--ws-space-24) var(--ws-space-6)',
          backgroundColor: 'var(--ws-bg-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '70vh',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 'var(--ws-max-w-narrow)', margin: '0 auto' }}>
          <h1 className="ws-h1">Create your MenuList</h1>

          <p className="ws-body" style={{ marginTop: 'var(--ws-space-4)' }}>
            Your official menu starts here. Takes minutes. We handle the rest.
          </p>

          <div style={{ marginTop: 'var(--ws-space-12)' }}>
            <button
              onClick={() => signIn('google', { callbackUrl: '/pricing' })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--ws-space-3)',
                width: '100%',
                maxWidth: '360px',
                padding: '0.875rem 1.5rem',
                backgroundColor: 'var(--ws-bg-primary)',
                border: '1.5px solid var(--ws-border-default)',
                borderRadius: 'var(--ws-radius-lg)',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 500,
                color: 'var(--ws-text-primary)',
                transition: 'all var(--ws-transition-fast)',
                boxShadow: 'var(--ws-shadow-sm)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = 'var(--ws-shadow-md)';
                e.currentTarget.style.borderColor = 'var(--ws-brand-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'var(--ws-shadow-sm)';
                e.currentTarget.style.borderColor = 'var(--ws-border-default)';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>
          </div>

          <p style={{ marginTop: 'var(--ws-space-6)', fontSize: '0.875rem', color: 'var(--ws-text-muted)' }}>
            Already have an account?{' '}
            <Link
              href="/pricing"
              style={{ color: 'var(--ws-brand-secondary)', textDecoration: 'none', fontWeight: 500 }}
            >
              Login
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
