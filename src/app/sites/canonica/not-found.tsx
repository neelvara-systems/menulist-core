export default function CanonicaNotFound() {
    return (
        <main style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0d0d2b 100%)',
            color: '#ffffff',
            padding: '2rem',
        }}>
            <h1 style={{
                fontSize: '4rem',
                fontWeight: 700,
                color: '#8b8bff',
                margin: '0 0 1rem 0',
            }}>
                404
            </h1>
            <p style={{
                fontSize: '1.25rem',
                color: '#a0a0c0',
                margin: '0 0 2rem 0',
            }}>
                This page does not exist.
            </p>
            <a
                href="/"
                style={{
                    padding: '0.75rem 1.5rem',
                    background: '#6366f1',
                    color: '#ffffff',
                    borderRadius: '0.5rem',
                    textDecoration: 'none',
                    fontWeight: 500,
                }}
            >
                Go Home
            </a>
        </main>
    );
}
