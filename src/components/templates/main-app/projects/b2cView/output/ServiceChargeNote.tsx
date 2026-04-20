/**
 * Service Charge Note Component
 * 
 * Constitutional G06 - Trust-critical disclosure
 * 
 * HARD RULES (DO NOT MODIFY):
 * - Renders only when specialNote is provided
 * - Fixed styling - cannot be overridden by moods/layouts
 * - Minimum 12px font size
 * - Neutral gray color (#6B7280)
 * - No animations, no accent colors, no hide toggles
 * - Auto-injected before LiveIndicator in menu footer
 * 
 * This is infrastructure text, not UI decoration.
 */

interface ServiceChargeNoteProps {
    note?: string;
}

export default function ServiceChargeNote({ note }: ServiceChargeNoteProps) {
    // Silent if empty - no fallback boilerplate
    if (!note || note.trim() === '') {
        return null;
    }

    return (
        <p
            className="text-xs text-center mt-6 mb-4"
            style={{
                color: '#6B7280', // Neutral gray - immutable
                lineHeight: 1.4,
                fontWeight: 400,
                maxWidth: '90%',
                margin: '24px auto 16px',
                fontSize: '12px', // Minimum size enforced
            }}
            aria-label="Service charge disclosure"
        >
            {note}
        </p>
    );
}
