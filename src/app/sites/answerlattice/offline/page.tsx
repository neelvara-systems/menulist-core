import type { Metadata } from 'next';
import { headers } from 'next/headers';

import ContextualStateIllustration from '@/components/atoms/contextualStateIllustration';
import { isAnswerlatticeProductHostname } from '@/constants/answerlattice/domains';

export const metadata: Metadata = {
    title: 'AnswerLattice offline',
    description: 'AnswerLattice is offline. Reconnect and try again.',
    robots: {
        index: false,
        follow: false,
        nocache: true,
    },
};

export default async function AnswerlatticeOfflinePage() {
    const host = (await headers()).get('host');
    const retryHref = isAnswerlatticeProductHostname(host)
        ? '/activation'
        : '/answerlattice/activation';

    return (
        <main
            style={{
                alignItems: 'center',
                background: 'var(--al-bg)',
                color: 'var(--al-text)',
                display: 'flex',
                justifyContent: 'center',
                minHeight: '100dvh',
                overflowX: 'hidden',
                padding: 'max(1.5rem, env(safe-area-inset-top)) 1.5rem max(1.5rem, env(safe-area-inset-bottom))',
            }}
        >
            <section style={{ boxSizing: 'border-box', maxWidth: '26rem', textAlign: 'center', width: '100%' }}>
                <ContextualStateIllustration
                    color="var(--al-primary-light)"
                    size={128}
                    variant="serverErrorContext"
                />
                <h1 style={{ fontSize: '2rem', lineHeight: 1.15, margin: '1.5rem 0 0' }}>
                    AnswerLattice is offline
                </h1>
                <p style={{ color: 'var(--al-text-secondary)', lineHeight: 1.65, margin: '0.875rem 0 0' }}>
                    Reconnect to load the latest reviewed answers and support activity. Nothing will be changed while you are offline.
                </p>
                <a
                    href={retryHref}
                    style={{
                        alignItems: 'center',
                        background: 'var(--al-primary)',
                        borderRadius: '0.75rem',
                        color: '#ffffff',
                        display: 'inline-flex',
                        fontWeight: 700,
                        justifyContent: 'center',
                        marginTop: '2rem',
                        minHeight: '3rem',
                        padding: '0.75rem 1.25rem',
                        textDecoration: 'none',
                        width: '100%',
                    }}
                >
                    Try again
                </a>
            </section>
        </main>
    );
}
