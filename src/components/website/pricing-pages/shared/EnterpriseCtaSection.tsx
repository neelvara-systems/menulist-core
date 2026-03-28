"use client";

import { LuArrowRight } from "react-icons/lu";

const EnterpriseCtaSection = () => {
    return (
        <section
            style={{
                padding: 'var(--ws-space-16) var(--ws-space-6)',
                backgroundColor: '#0f172a',
                textAlign: 'center',
            }}
        >
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <h2
                    style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: '#f1f5f9',
                        lineHeight: 1.3,
                        letterSpacing: '-0.01em',
                    }}
                >
                    Running a larger network of locations?
                </h2>
                <p
                    style={{
                        fontSize: '0.9375rem',
                        color: '#94a3b8',
                        marginTop: 'var(--ws-space-4)',
                        lineHeight: 1.6,
                    }}
                >
                    Contact us to configure multi-location pricing for larger chains. No enterprise contract required.
                </p>
                <a
                    href="mailto:sales@menulist.ai"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: 'var(--ws-space-8)',
                        padding: '12px 28px',
                        backgroundColor: 'var(--ws-brand-primary)',
                        color: '#fff',
                        borderRadius: 'var(--ws-radius-md)',
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                        transition: 'opacity 0.2s',
                    }}
                >
                    Contact us <LuArrowRight size={16} />
                </a>
            </div>
        </section>
    );
};

export default EnterpriseCtaSection;
