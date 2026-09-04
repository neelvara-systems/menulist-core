'use client';

import type { PrintableFlyerCampaignContent } from '@lib/printable-asset-templates/types';
import { theme } from 'antd';

export type PrintableFlyerCampaignDraft = {
    details: string;
    headline: string;
    offer: string;
    terms: string;
    validUntil: string;
};

export const EMPTY_PRINTABLE_FLYER_CAMPAIGN_DRAFT: PrintableFlyerCampaignDraft = {
    details: '',
    headline: '',
    offer: '',
    terms: '',
    validUntil: '',
};

export function buildPrintableFlyerCampaignContent(
    value: PrintableFlyerCampaignDraft,
): PrintableFlyerCampaignContent | undefined {
    const headline = value.headline.trim();
    if (!headline) return undefined;
    const details = value.details.trim();
    const offer = value.offer.trim();
    const terms = value.terms.trim();
    const validUntil = value.validUntil.trim();
    return {
        headline,
        ...(offer ? { offer } : {}),
        ...(details ? { details } : {}),
        ...(validUntil ? { validUntil } : {}),
        ...(terms ? { terms } : {}),
    };
}

export default function FlyerCampaignFields({
    assetLabel = 'Flyer',
    applying = false,
    compact = false,
    dirty = true,
    disabled = false,
    onApply,
    onChange,
    value,
}: {
    assetLabel?: 'Campaign Poster' | 'Flyer';
    applying?: boolean;
    compact?: boolean;
    dirty?: boolean;
    disabled?: boolean;
    onApply: () => void;
    onChange: (value: PrintableFlyerCampaignDraft) => void;
    value: PrintableFlyerCampaignDraft;
}) {
    const { token } = theme.useToken();
    const hasCampaign = Boolean(value.headline.trim());
    const update = (key: keyof PrintableFlyerCampaignDraft, nextValue: string) => {
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
            aria-label={`${assetLabel} content`}
            style={{
                background: token.colorBgLayout,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: compact ? 16 : 12,
                padding: compact ? 12 : 14,
            }}
        >
            <div style={{ color: token.colorText, fontSize: compact ? 14 : 15, fontWeight: 700 }}>
                {assetLabel} content
            </div>
            <div style={{ color: token.colorTextSecondary, fontSize: 12, lineHeight: 1.45, marginTop: 3 }}>
                {hasCampaign
                    ? 'Only your supplied campaign details will appear.'
                    : `Add a real headline before downloading this ${assetLabel.toLowerCase()}. Content stays in this open screen until you leave it.`}
            </div>
            <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                <label style={{ color: token.colorTextSecondary, display: 'grid', fontSize: 12, gap: 5 }}>
                    Campaign headline
                    <input
                        disabled={disabled}
                        maxLength={70}
                        onChange={(event) => update('headline', event.target.value)}
                        placeholder="Example: A little something for you"
                        style={fieldStyle}
                        value={value.headline}
                    />
                </label>
                <label style={{ color: token.colorTextSecondary, display: 'grid', fontSize: 12, gap: 5 }}>
                    Offer or benefit (optional)
                    <input
                        disabled={disabled}
                        maxLength={90}
                        onChange={(event) => update('offer', event.target.value)}
                        placeholder="Use only an offer you are ready to honour"
                        style={fieldStyle}
                        value={value.offer}
                    />
                </label>
                <label style={{ color: token.colorTextSecondary, display: 'grid', fontSize: 12, gap: 5 }}>
                    Supporting details (optional)
                    <textarea
                        disabled={disabled}
                        maxLength={180}
                        onChange={(event) => update('details', event.target.value)}
                        placeholder="What should the customer know?"
                        rows={compact ? 2 : 3}
                        style={fieldStyle}
                        value={value.details}
                    />
                </label>
                <label style={{ color: token.colorTextSecondary, display: 'grid', fontSize: 12, gap: 5 }}>
                    Valid until (optional)
                    <input
                        disabled={disabled}
                        maxLength={60}
                        onChange={(event) => update('validUntil', event.target.value)}
                        placeholder="Example: Valid through 30 September"
                        style={fieldStyle}
                        value={value.validUntil}
                    />
                </label>
                <label style={{ color: token.colorTextSecondary, display: 'grid', fontSize: 12, gap: 5 }}>
                    Terms (optional)
                    <textarea
                        disabled={disabled}
                        maxLength={140}
                        onChange={(event) => update('terms', event.target.value)}
                        placeholder="Only add real conditions"
                        rows={2}
                        style={fieldStyle}
                        value={value.terms}
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
