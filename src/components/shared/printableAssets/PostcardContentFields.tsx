'use client';

import type { PrintablePostcardContent } from '@lib/printable-asset-templates/types';
import { theme } from 'antd';

export type PrintablePostcardContentDraft = {
    headline: string;
    message: string;
};

export const EMPTY_PRINTABLE_POSTCARD_CONTENT_DRAFT: PrintablePostcardContentDraft = {
    headline: '',
    message: '',
};

export function buildPrintablePostcardContent(
    value: PrintablePostcardContentDraft,
): PrintablePostcardContent | undefined {
    const headline = value.headline.trim();
    if (!headline) return undefined;
    const message = value.message.trim();
    return {
        headline,
        ...(message ? { message } : {}),
    };
}

export default function PostcardContentFields({
    applying = false,
    compact = false,
    dirty = true,
    disabled = false,
    onApply,
    onChange,
    value,
}: {
    applying?: boolean;
    compact?: boolean;
    dirty?: boolean;
    disabled?: boolean;
    onApply: () => void;
    onChange: (value: PrintablePostcardContentDraft) => void;
    value: PrintablePostcardContentDraft;
}) {
    const { token } = theme.useToken();
    const hasMessage = Boolean(value.headline.trim());
    const update = (key: keyof PrintablePostcardContentDraft, nextValue: string) => {
        onChange({ ...value, [key]: nextValue });
    };
    const fieldStyle = {
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorder}`,
        borderRadius: 10,
        color: token.colorText,
        font: 'inherit',
        lineHeight: 1.4,
        minHeight: 44,
        padding: '10px 12px',
        resize: 'vertical' as const,
        width: '100%',
    };

    return (
        <section
            aria-label="Postcard content"
            style={{
                background: token.colorBgLayout,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: compact ? 16 : 12,
                padding: compact ? 12 : 14,
            }}
        >
            <div style={{ color: token.colorText, fontSize: compact ? 14 : 15, fontWeight: 700 }}>
                Postcard message
            </div>
            <div style={{ color: token.colorTextSecondary, fontSize: 12, lineHeight: 1.45, marginTop: 3 }}>
                {hasMessage
                    ? 'Only the message you supplied will appear.'
                    : 'Leave the headline empty for a clean brand postcard with your business link. Content stays in this open screen until you leave it.'}
            </div>
            <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                <label style={{ color: token.colorTextSecondary, display: 'grid', fontSize: 12, gap: 5 }}>
                    Headline
                    <input
                        disabled={disabled}
                        maxLength={70}
                        onChange={(event) => update('headline', event.target.value)}
                        placeholder="Enter the exact headline to print"
                        style={fieldStyle}
                        value={value.headline}
                    />
                </label>
                <label style={{ color: token.colorTextSecondary, display: 'grid', fontSize: 12, gap: 5 }}>
                    Supporting message (optional)
                    <textarea
                        disabled={disabled}
                        maxLength={180}
                        onChange={(event) => update('message', event.target.value)}
                        placeholder="Add only information you want customers to see"
                        rows={compact ? 2 : 3}
                        style={fieldStyle}
                        value={value.message}
                    />
                </label>
                <button
                    disabled={applying || disabled || !dirty}
                    onClick={onApply}
                    style={{
                        background: token.colorPrimary,
                        border: 0,
                        borderRadius: 10,
                        color: token.colorTextLightSolid,
                        cursor: applying ? 'wait' : (disabled || !dirty ? 'not-allowed' : 'pointer'),
                        font: 'inherit',
                        fontWeight: 700,
                        minHeight: 44,
                        opacity: applying || disabled || !dirty ? 0.62 : 1,
                        padding: '10px 14px',
                        width: '100%',
                    }}
                    type="button"
                >
                    {applying ? 'Updating preview...' : dirty ? 'Update preview' : 'Preview up to date'}
                </button>
                <div aria-live="polite" style={{ color: dirty ? token.colorWarningText : token.colorTextTertiary, fontSize: 12 }}>
                    {dirty ? 'Preview has unapplied changes.' : 'Preview matches these details.'}
                </div>
            </div>
        </section>
    );
}
