/**
 * OBP Loading Skeleton
 * 
 * Renders instantly while data streams via Suspense.
 * Ultra-minimal branded skeleton matching OBP layout.
 * 
 * @see __docs__/official-business-page/official-business-page_impl.md §7
 */

export default function OBPSkeleton() {
    return (
        <div
            style={{
                minHeight: '100vh',
                background: '#f7f6f2',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                padding: '28px 16px',
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: '520px',
                    margin: '0 auto',
                }}
            >
                {/* Logo placeholder */}
                <div
                    style={{
                        width: '76px',
                        height: '76px',
                        borderRadius: '18px',
                        background: '#e8e8e8',
                        marginBottom: '18px',
                        animation: 'obpPulse 1.5s ease-in-out infinite',
                    }}
                />
                {/* Name placeholder */}
                <div
                    style={{
                        width: '220px',
                        maxWidth: '72%',
                        height: '34px',
                        borderRadius: '8px',
                        background: '#e8e8e8',
                        marginBottom: '10px',
                        animation: 'obpPulse 1.5s ease-in-out infinite',
                        animationDelay: '0.1s',
                    }}
                />
                {/* Descriptor placeholder */}
                <div
                    style={{
                        width: '160px',
                        height: '14px',
                        borderRadius: '4px',
                        background: '#e8e8e8',
                        marginBottom: '10px',
                        animation: 'obpPulse 1.5s ease-in-out infinite',
                        animationDelay: '0.15s',
                    }}
                />
                {/* Status placeholder */}
                <div
                    style={{
                        width: '92px',
                        height: '26px',
                        borderRadius: '999px',
                        background: '#e8e8e8',
                        marginBottom: '18px',
                        animation: 'obpPulse 1.5s ease-in-out infinite',
                        animationDelay: '0.2s',
                    }}
                />
                {/* CTA button placeholder */}
                <div
                    style={{
                        width: '100%',
                        height: '56px',
                        borderRadius: '12px',
                        background: '#e8e8e8',
                        marginBottom: '12px',
                        animation: 'obpPulse 1.5s ease-in-out infinite',
                        animationDelay: '0.25s',
                    }}
                />
                {/* Action buttons placeholder */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '8px',
                        marginBottom: '18px',
                    }}
                >
                    {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        style={{
                            height: '74px',
                            borderRadius: '12px',
                            background: '#e8e8e8',
                            animation: 'obpPulse 1.5s ease-in-out infinite',
                            animationDelay: `${0.3 + i * 0.05}s`,
                        }}
                    />
                    ))}
                </div>
            </div>
            <style>{`
                @keyframes obpPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
}
