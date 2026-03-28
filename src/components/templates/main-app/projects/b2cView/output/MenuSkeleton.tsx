/**
 * Menu Skeleton Loading Component (G12)
 * 
 * Constitutional requirement: No blank white screens during loading.
 * Shows placeholder content that matches menu structure.
 * 
 * HARD RULES:
 * - Must be shown during initial load
 * - Must match approximate menu layout
 * - Smooth pulse animation (not jarring)
 * - Neutral colors ONLY (no mood/brand influence)
 * 
 * CONSTITUTIONAL CONSTRAINT:
 * Skeletons are neutral by design.
 * They must not reflect brand or mood.
 * They signal "loading", not "branding".
 */

// NEUTRAL SKELETON TOKENS (hardcoded - DO NOT use moodConfig)
const SKELETON_TOKENS = {
    background: '#f5f5f5',           // neutral gray-100
    pulse: 'rgba(128, 128, 128, 0.15)', // gray pulse
    border: '#e5e5e5',               // neutral gray-200
    itemBackground: '#fafafa',       // very light gray
    borderRadius: 8,
    imageRadius: 6,
} as const;

interface MenuSkeletonProps {
    itemCount?: number;
    categoryCount?: number;
}

function SkeletonPulse({ style }: { style?: React.CSSProperties }) {
    return (
        <div
            className="animate-pulse"
            style={{
                backgroundColor: SKELETON_TOKENS.pulse,
                borderRadius: 4,
                ...style,
            }}
        />
    );
}

export default function MenuSkeleton({
    itemCount = 4,
    categoryCount = 2,
}: MenuSkeletonProps) {
    return (
        <div style={{ padding: 16, background: SKELETON_TOKENS.background }}>
            {/* Header skeleton */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24,
                paddingBottom: 16,
                borderBottom: `1px solid ${SKELETON_TOKENS.border}`,
            }}>
                <SkeletonPulse style={{ width: 100, height: 32 }} />
                <SkeletonPulse style={{ width: 80, height: 24 }} />
            </div>

            {/* Categories skeleton */}
            {Array.from({ length: categoryCount }).map((_, catIndex) => (
                <div key={catIndex} style={{ marginBottom: 32 }}>
                    {/* Category header */}
                    <SkeletonPulse style={{ width: 120, height: 20, marginBottom: 16 }} />

                    {/* Items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {Array.from({ length: itemCount }).map((_, itemIndex) => (
                            <div
                                key={itemIndex}
                                style={{
                                    display: 'flex',
                                    gap: 12,
                                    padding: 12,
                                    background: SKELETON_TOKENS.itemBackground,
                                    border: `1px solid ${SKELETON_TOKENS.border}`,
                                    borderRadius: SKELETON_TOKENS.borderRadius,
                                }}
                            >
                                {/* Image placeholder */}
                                <SkeletonPulse style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: SKELETON_TOKENS.imageRadius,
                                    flexShrink: 0,
                                }} />

                                {/* Content placeholder */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <SkeletonPulse style={{ width: '60%', height: 16 }} />
                                        <SkeletonPulse style={{ width: 50, height: 16 }} />
                                    </div>
                                    <SkeletonPulse style={{ width: '80%', height: 12 }} />
                                    <SkeletonPulse style={{ width: '50%', height: 12, marginTop: 4 }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
