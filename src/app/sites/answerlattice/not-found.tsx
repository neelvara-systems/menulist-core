import { headers } from 'next/headers';

async function getBasePath(): Promise<string> {
    try {
        const h = await headers();
        const aliasBasePath = h.get('x-product-base-path') || '';
        if (aliasBasePath) return aliasBasePath;

        const host = h.get('host') || '';
        return h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))
            ? '/__answerlattice'
            : '';
    } catch {
        return '';
    }
}

export default async function AnswerlatticeNotFound() {
    const basePath = await getBasePath();

    return (
        <main style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            background: 'linear-gradient(135deg, var(--al-bg) 0%, var(--al-bg-subtle) 54%, var(--al-bg-band-deep) 100%)',
            color: 'var(--al-text)',
            padding: '2rem',
        }}>
            <section style={{
                textAlign: 'center',
                margin: 'auto',
            }}>
                <h1 style={{
                    fontSize: '4rem',
                    fontWeight: 700,
                    color: 'var(--al-primary-light)',
                    margin: '0 0 1rem 0',
                }}>
                    404
                </h1>
                <p style={{
                    fontSize: '1.25rem',
                    color: 'var(--al-text-secondary)',
                    margin: '0 0 2rem 0',
                }}>
                    This page does not exist.
                </p>
                <a
                    href={basePath ? `${basePath}/` : '/'}
                    style={{
                        padding: '0.75rem 1.5rem',
                        background: 'var(--al-primary)',
                        color: '#ffffff',
                        borderRadius: '0.5rem',
                        textDecoration: 'none',
                        fontWeight: 500,
                    }}
                >
                    Go Home
                </a>
            </section>
        </main>
    );
}
