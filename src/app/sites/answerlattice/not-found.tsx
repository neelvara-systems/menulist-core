import { ANSWERLATTICE_THEME } from './theme';

const { colors } = ANSWERLATTICE_THEME;

export default function AnswerlatticeNotFound() {
    return (
        <main style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            background: `linear-gradient(135deg, ${colors.background} 0%, ${colors.backgroundSubtle} 54%, ${colors.backgroundDeep} 100%)`,
            color: colors.textPrimary,
            padding: '2rem',
        }}>
            <section style={{
                textAlign: 'center',
                margin: 'auto',
            }}>
                <h1 style={{
                    fontSize: '4rem',
                    fontWeight: 700,
                    color: colors.primaryLight,
                    margin: '0 0 1rem 0',
                }}>
                    404
                </h1>
                <p style={{
                    fontSize: '1.25rem',
                    color: colors.textSecondary,
                    margin: '0 0 2rem 0',
                }}>
                    This page does not exist.
                </p>
                <a
                    href="/"
                    style={{
                        padding: '0.75rem 1.5rem',
                        background: colors.primary,
                        color: colors.textPrimary,
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
