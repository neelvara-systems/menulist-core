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
                background: '#fafafa',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: '60px',
            }}
        >
            {/* Logo placeholder */}
            <div
                style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: '#e8e8e8',
                    marginBottom: '16px',
                    animation: 'obpPulse 1.5s ease-in-out infinite',
                }}
            />
            {/* Name placeholder */}
            <div
                style={{
                    width: '180px',
                    height: '22px',
                    borderRadius: '6px',
                    background: '#e8e8e8',
                    marginBottom: '10px',
                    animation: 'obpPulse 1.5s ease-in-out infinite',
                    animationDelay: '0.1s',
                }}
            />
            {/* Descriptor placeholder */}
            <div
                style={{
                    width: '120px',
                    height: '14px',
                    borderRadius: '4px',
                    background: '#e8e8e8',
                    marginBottom: '8px',
                    animation: 'obpPulse 1.5s ease-in-out infinite',
                    animationDelay: '0.15s',
                }}
            />
            {/* Status placeholder */}
            <div
                style={{
                    width: '80px',
                    height: '24px',
                    borderRadius: '12px',
                    background: '#e8e8e8',
                    marginBottom: '32px',
                    animation: 'obpPulse 1.5s ease-in-out infinite',
                    animationDelay: '0.2s',
                }}
            />
            {/* CTA button placeholder */}
            <div
                style={{
                    width: 'calc(100% - 48px)',
                    maxWidth: '360px',
                    height: '52px',
                    borderRadius: '12px',
                    background: '#e8e8e8',
                    marginBottom: '24px',
                    animation: 'obpPulse 1.5s ease-in-out infinite',
                    animationDelay: '0.25s',
                }}
            />
            {/* Action buttons placeholder */}
            <div
                style={{
                    display: 'flex',
                    gap: '16px',
                    marginBottom: '32px',
                }}
            >
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        style={{
                            width: '72px',
                            height: '72px',
                            borderRadius: '16px',
                            background: '#e8e8e8',
                            animation: 'obpPulse 1.5s ease-in-out infinite',
                            animationDelay: `${0.3 + i * 0.05}s`,
                        }}
                    />
                ))}
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
