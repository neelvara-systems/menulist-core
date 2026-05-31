type AnswerlatticeConfigNoticeProps = {
    surface: string;
};

export default function AnswerlatticeConfigNotice({ surface }: AnswerlatticeConfigNoticeProps) {
    return (
        <main style={{ minHeight: '100dvh', padding: 24 }}>
            <section
                style={{
                    background: 'var(--ant-color-bg-container, #fff)',
                    border: '1px solid var(--ant-color-border-secondary, #e5e7eb)',
                    borderRadius: 8,
                    boxShadow: '0 6px 20px rgba(15, 23, 42, 0.08)',
                    maxWidth: 720,
                    padding: 20,
                }}
            >
                <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>{surface}</h1>
                <p style={{ color: 'var(--ant-color-text-secondary, #475569)', lineHeight: 1.6, margin: 0 }}>
                    Answerlattice Firebase is not configured in this environment. Add the
                    {' '}NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_* values to load this internal platform screen.
                </p>
            </section>
        </main>
    );
}
