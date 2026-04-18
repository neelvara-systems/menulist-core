'use client';

/**
 * Offline page — interactive island.
 *
 * Only renders the "Try again" button. Kept tiny so the offline page stays
 * well under any reasonable precache budget.
 */
export default function OfflineClient() {
    return (
        <button
            type="button"
            onClick={() => {
                if (typeof window !== 'undefined') window.location.reload();
            }}
            style={{
                width: '100%',
                padding: '12px 20px',
                background: '#0f172a',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: 48,
            }}
        >
            Try again
        </button>
    );
}
