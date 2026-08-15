import * as React from 'react';
import { render, toPlainText } from '@react-email/render';
import { EMAIL_OS_LIMITS } from '@data/shared/emailOs';

export interface EmailOsTemplateInput {
    productName: string;
    previewText: string;
    title: string;
    paragraphs: readonly string[];
    rows?: readonly { label: string; value: string }[];
    action?: { label: string; url: string };
    footer: string;
    accentColor?: string;
}

export interface RenderedEmailOsContent {
    html: string;
    text: string;
}

function bounded(value: string, maxLength: number, code: string): string {
    const normalized = String(value || '').trim();
    if (!normalized || normalized.length > maxLength || /\0/.test(normalized)) throw new Error(code);
    return normalized;
}

function actionUrl(value: string): string {
    let parsed: URL;
    try {
        parsed = new URL(bounded(value, 2_048, 'EMAIL_OS_ACTION_URL_INVALID'));
    } catch {
        throw new Error('EMAIL_OS_ACTION_URL_INVALID');
    }
    if (parsed.protocol !== 'https:') throw new Error('EMAIL_OS_ACTION_URL_INVALID');
    return parsed.toString();
}

function documentElement(input: EmailOsTemplateInput): React.ReactElement {
    const accent = /^#[0-9a-fA-F]{6}$/.test(input.accentColor || '') ? input.accentColor : '#1677ff';
    const children: React.ReactNode[] = [
        React.createElement('p', { key: 'product', style: { color: accent, fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', margin: '0 0 12px', textTransform: 'uppercase' } }, input.productName),
        React.createElement('h1', { key: 'title', style: { color: '#111827', fontSize: 26, lineHeight: 1.25, margin: '0 0 20px' } }, input.title),
        ...input.paragraphs.map((paragraph, index) => React.createElement('p', { key: `paragraph-${index}`, style: { fontSize: 16, lineHeight: 1.6, margin: '0 0 16px' } }, paragraph)),
    ];
    if (input.rows?.length) {
        children.push(React.createElement('table', { cellPadding: '0', cellSpacing: '0', key: 'rows', role: 'presentation', style: { borderCollapse: 'collapse', margin: '20px 0', width: '100%' } },
            React.createElement('tbody', null, input.rows.map((row, index) => React.createElement('tr', { key: `row-${index}` },
                React.createElement('th', { scope: 'row', style: { borderBottom: '1px solid #e5e7eb', fontSize: 14, padding: '10px 8px 10px 0', textAlign: 'left', verticalAlign: 'top', width: '36%' } }, row.label),
                React.createElement('td', { style: { borderBottom: '1px solid #e5e7eb', fontSize: 14, padding: '10px 0 10px 8px', verticalAlign: 'top' } }, row.value),
            ))),
        ));
    }
    if (input.action) {
        children.push(React.createElement('p', { key: 'action', style: { margin: '24px 0' } },
            React.createElement('a', { href: actionUrl(input.action.url), style: { backgroundColor: accent, borderRadius: 8, color: '#ffffff', display: 'inline-block', fontSize: 16, fontWeight: 700, lineHeight: '44px', minHeight: 44, padding: '0 20px', textDecoration: 'none' } }, input.action.label),
        ));
    }
    children.push(
        React.createElement('hr', { key: 'rule', style: { border: 0, borderTop: '1px solid #e5e7eb', margin: '28px 0 18px' } }),
        React.createElement('p', { key: 'footer', style: { color: '#6b7280', fontSize: 12, lineHeight: 1.5, margin: 0 } }, input.footer),
    );

    return React.createElement('html', { lang: 'en' },
        React.createElement('head', null,
            React.createElement('meta', { content: 'width=device-width', name: 'viewport' }),
            React.createElement('meta', { content: 'IE=edge', httpEquiv: 'X-UA-Compatible' }),
            React.createElement('meta', { name: 'x-apple-disable-message-reformatting' }),
            React.createElement('title', null, input.title),
        ),
        React.createElement('body', { style: { backgroundColor: '#f4f6f8', color: '#1f2937', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif", margin: 0, padding: '24px 12px' } },
            React.createElement('div', { style: { display: 'none', maxHeight: 0, maxWidth: 0, opacity: 0, overflow: 'hidden' } }, input.previewText),
            React.createElement('main', { style: { backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, margin: '0 auto', maxWidth: 600, padding: '28px 24px' } }, children),
        ),
    );
}

export async function renderEmailOsTemplate(input: EmailOsTemplateInput): Promise<RenderedEmailOsContent> {
    const normalized: EmailOsTemplateInput = {
        ...input,
        productName: bounded(input.productName, 80, 'EMAIL_OS_PRODUCT_NAME_INVALID'),
        previewText: bounded(input.previewText, EMAIL_OS_LIMITS.MAX_PREVIEW_TEXT_LENGTH, 'EMAIL_OS_PREVIEW_INVALID'),
        title: bounded(input.title, EMAIL_OS_LIMITS.MAX_SUBJECT_LENGTH, 'EMAIL_OS_TITLE_INVALID'),
        paragraphs: input.paragraphs.map((value) => bounded(value, 5_000, 'EMAIL_OS_PARAGRAPH_INVALID')),
        rows: input.rows?.map((row) => ({ label: bounded(row.label, 100, 'EMAIL_OS_ROW_INVALID'), value: bounded(row.value, 2_000, 'EMAIL_OS_ROW_INVALID') })),
        action: input.action ? { label: bounded(input.action.label, 80, 'EMAIL_OS_ACTION_INVALID'), url: actionUrl(input.action.url) } : undefined,
        footer: bounded(input.footer, 500, 'EMAIL_OS_FOOTER_INVALID'),
    };
    if (normalized.paragraphs.length < 1 || normalized.paragraphs.length > 20) throw new Error('EMAIL_OS_PARAGRAPHS_INVALID');
    if ((normalized.rows?.length || 0) > 20) throw new Error('EMAIL_OS_ROWS_INVALID');
    const html = await render(documentElement(normalized));
    const text = toPlainText(html).trim();
    if (!html || html.length > EMAIL_OS_LIMITS.MAX_HTML_LENGTH) throw new Error('EMAIL_OS_HTML_INVALID');
    if (!text || text.length > EMAIL_OS_LIMITS.MAX_PLAIN_TEXT_LENGTH) throw new Error('EMAIL_OS_TEXT_INVALID');
    return { html, text };
}

export function renderEmailOsLegacyContent(html: string, fallbackText?: string): RenderedEmailOsContent {
    if (!html || html.length > EMAIL_OS_LIMITS.MAX_HTML_LENGTH) throw new Error('EMAIL_OS_HTML_INVALID');
    const text = toPlainText(html).trim() || String(fallbackText || '').trim();
    if (!text || text.length > EMAIL_OS_LIMITS.MAX_PLAIN_TEXT_LENGTH) throw new Error('EMAIL_OS_TEXT_INVALID');
    return { html, text };
}
