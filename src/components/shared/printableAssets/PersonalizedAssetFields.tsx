'use client';

import type {
    PrintableGiftCertificateContent,
    PrintableInvitationContent,
} from '@lib/printable-asset-templates/types';
import { theme } from 'antd';
import type { CSSProperties, ReactNode } from 'react';

export type PrintableGiftCertificateDraft = {
    certificateNumber: string;
    message: string;
    recipient: string;
    sender: string;
    validUntil: string;
    value: string;
};

export type PrintableInvitationDraft = {
    date: string;
    location: string;
    occasion: string;
    time: string;
};

export const EMPTY_PRINTABLE_GIFT_CERTIFICATE_DRAFT: PrintableGiftCertificateDraft = {
    certificateNumber: '',
    message: '',
    recipient: '',
    sender: '',
    validUntil: '',
    value: '',
};

export const EMPTY_PRINTABLE_INVITATION_DRAFT: PrintableInvitationDraft = {
    date: '',
    location: '',
    occasion: '',
    time: '',
};

export function buildPrintableGiftCertificateContent(
    value: PrintableGiftCertificateDraft,
): PrintableGiftCertificateContent | undefined {
    const recipient = value.recipient.trim();
    const sender = value.sender.trim();
    const message = value.message.trim();
    const certificateValue = value.value.trim();
    const validUntil = value.validUntil.trim();
    const certificateNumber = value.certificateNumber.trim();
    if (!recipient && !sender && !message && !certificateValue && !validUntil && !certificateNumber) return undefined;
    return {
        ...(recipient ? { recipient } : {}),
        ...(sender ? { sender } : {}),
        ...(message ? { message } : {}),
        ...(certificateValue ? { value: certificateValue } : {}),
        ...(validUntil ? { validUntil } : {}),
        ...(certificateNumber ? { certificateNumber } : {}),
    };
}

export function buildPrintableInvitationContent(
    value: PrintableInvitationDraft,
): PrintableInvitationContent | undefined {
    const occasion = value.occasion.trim();
    const date = value.date.trim();
    const time = value.time.trim();
    const location = value.location.trim();
    if (!occasion && !date && !time && !location) return undefined;
    return {
        ...(occasion ? { occasion } : {}),
        ...(date ? { date } : {}),
        ...(time ? { time } : {}),
        ...(location ? { location } : {}),
    };
}

function RuntimeContentPanel({
    applying,
    children,
    compact,
    description,
    dirty,
    disabled,
    onApply,
    title,
}: {
    applying: boolean;
    children: ReactNode;
    compact: boolean;
    description: string;
    dirty: boolean;
    disabled: boolean;
    onApply: () => void;
    title: string;
}) {
    const { token } = theme.useToken();
    return (
        <section
            aria-label={title}
            style={{
                background: token.colorBgLayout,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: compact ? 16 : 12,
                padding: compact ? 12 : 14,
            }}
        >
            <div style={{ color: token.colorText, fontSize: compact ? 14 : 15, fontWeight: 700 }}>{title}</div>
            <div style={{ color: token.colorTextSecondary, fontSize: 12, lineHeight: 1.45, marginTop: 3 }}>{description}</div>
            <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>{children}</div>
            <div aria-live="polite" style={{ color: dirty ? token.colorWarningText : token.colorTextTertiary, fontSize: 12, marginTop: 10 }}>
                {dirty ? 'Preview has unapplied changes.' : 'Preview matches these details.'}
            </div>
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
                    marginTop: 12,
                    minHeight: 44,
                    opacity: applying || disabled || !dirty ? 0.62 : 1,
                    padding: '10px 14px',
                    width: '100%',
                }}
                type="button"
            >
                {applying ? 'Updating preview...' : dirty ? 'Update preview' : 'Preview up to date'}
            </button>
        </section>
    );
}

function RuntimeField({
    disabled,
    label,
    maxLength,
    multiline = false,
    onChange,
    placeholder,
    value,
}: {
    disabled: boolean;
    label: string;
    maxLength: number;
    multiline?: boolean;
    onChange: (value: string) => void;
    placeholder: string;
    value: string;
}) {
    const { token } = theme.useToken();
    const fieldStyle: CSSProperties = {
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorder}`,
        borderRadius: 10,
        color: token.colorText,
        font: 'inherit',
        lineHeight: 1.4,
        minHeight: 44,
        padding: '10px 12px',
        resize: multiline ? 'vertical' : undefined,
        width: '100%',
    };
    return (
        <label style={{ color: token.colorTextSecondary, display: 'grid', fontSize: 12, gap: 5 }}>
            {label}
            {multiline ? (
                <textarea
                    disabled={disabled}
                    maxLength={maxLength}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder={placeholder}
                    rows={2}
                    style={fieldStyle}
                    value={value}
                />
            ) : (
                <input
                    disabled={disabled}
                    maxLength={maxLength}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder={placeholder}
                    style={fieldStyle}
                    value={value}
                />
            )}
        </label>
    );
}

export function GiftCertificateContentFields({
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
    onChange: (value: PrintableGiftCertificateDraft) => void;
    value: PrintableGiftCertificateDraft;
}) {
    const update = (key: keyof PrintableGiftCertificateDraft, nextValue: string) => {
        onChange({ ...value, [key]: nextValue });
    };
    return (
        <RuntimeContentPanel
            applying={applying}
            compact={compact}
            description="Enter any details you want printed, or leave fields blank to write them by hand after printing. This creates the printable design only; it does not track balances, redemptions, or certificate validity."
            dirty={dirty}
            disabled={disabled}
            onApply={onApply}
            title="Gift certificate details"
        >
            <RuntimeField disabled={disabled} label="Presented to" maxLength={70} onChange={(next) => update('recipient', next)} placeholder="Recipient name" value={value.recipient} />
            <RuntimeField disabled={disabled} label="From" maxLength={70} onChange={(next) => update('sender', next)} placeholder="Sender name" value={value.sender} />
            <RuntimeField disabled={disabled} label="Personal message" maxLength={140} multiline onChange={(next) => update('message', next)} placeholder="Optional message" value={value.message} />
            <RuntimeField disabled={disabled} label="Value" maxLength={40} onChange={(next) => update('value', next)} placeholder="Example: ₹1,000 or One service" value={value.value} />
            <RuntimeField disabled={disabled} label="Valid until" maxLength={60} onChange={(next) => update('validUntil', next)} placeholder="Example: 30 September 2026" value={value.validUntil} />
            <RuntimeField disabled={disabled} label="Certificate number" maxLength={40} onChange={(next) => update('certificateNumber', next)} placeholder="Optional tracking number" value={value.certificateNumber} />
        </RuntimeContentPanel>
    );
}

export function InvitationContentFields({
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
    onChange: (value: PrintableInvitationDraft) => void;
    value: PrintableInvitationDraft;
}) {
    const update = (key: keyof PrintableInvitationDraft, nextValue: string) => {
        onChange({ ...value, [key]: nextValue });
    };
    return (
        <RuntimeContentPanel
            applying={applying}
            compact={compact}
            description="Enter event details now, or leave fields blank when you plan to write them by hand. This creates the invitation design only; it does not collect RSVPs or register guests."
            dirty={dirty}
            disabled={disabled}
            onApply={onApply}
            title="Invitation details"
        >
            <RuntimeField disabled={disabled} label="Occasion" maxLength={80} onChange={(next) => update('occasion', next)} placeholder="Example: Autumn open house" value={value.occasion} />
            <RuntimeField disabled={disabled} label="Date" maxLength={50} onChange={(next) => update('date', next)} placeholder="Example: Saturday, 12 September" value={value.date} />
            <RuntimeField disabled={disabled} label="Time" maxLength={40} onChange={(next) => update('time', next)} placeholder="Example: 6:30 PM onwards" value={value.time} />
            <RuntimeField disabled={disabled} label="Location" maxLength={120} multiline onChange={(next) => update('location', next)} placeholder="Venue or complete address" value={value.location} />
        </RuntimeContentPanel>
    );
}
