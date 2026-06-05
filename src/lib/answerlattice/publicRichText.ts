const escapeHtml = (value: unknown) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeAttribute = (value: unknown) => escapeHtml(value).replace(/`/g, '&#96;');

const safeHref = (value: unknown) => {
    const href = String(value || '').trim();
    if (!href) return '';
    if (href.startsWith('//')) return '';
    if (href.startsWith('/') || href.startsWith('#')) return href;
    if (/^(https?:|mailto:|tel:)/i.test(href)) return href;
    return '';
};

const safeImageSrc = (value: unknown) => {
    const src = String(value || '').trim();
    if (!src || src.startsWith('//')) return '';
    if (src.startsWith('/')) return src;
    if (/^https?:/i.test(src)) return src;
    return '';
};

const safeTextAlign = (value: unknown) => {
    const align = String(value || '').trim().toLowerCase();
    return ['left', 'center', 'right', 'justify'].includes(align) ? align : '';
};

const safeColor = (value: unknown) => {
    const color = String(value || '').trim();
    return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(color) ? color : '';
};

const styleAttribute = (styles: Record<string, string | undefined>) => {
    const style = Object.entries(styles)
        .filter(([, value]) => Boolean(value))
        .map(([property, value]) => `${property}: ${value}`)
        .join('; ');

    return style ? ` style="${escapeAttribute(style)}"` : '';
};

// This server renderer is the sanitizer: it accepts TipTap JSON only, emits a fixed tag set,
// and escapes text/attributes so Next page-data collection does not need a DOM shim.
const renderChildren = (node: any): string => (
    Array.isArray(node?.content)
        ? node.content.map(renderNode).join('')
        : ''
);

const renderTextWithMarks = (text: string, marks: any[] = []) => {
    return marks.reduce((current, mark) => {
        switch (mark?.type) {
            case 'bold':
                return `<strong>${current}</strong>`;
            case 'italic':
                return `<em>${current}</em>`;
            case 'underline':
                return `<u>${current}</u>`;
            case 'strike':
                return `<s>${current}</s>`;
            case 'code':
                return `<code>${current}</code>`;
            case 'link': {
                const href = safeHref(mark.attrs?.href);
                if (!href) return current;
                return `<a href="${escapeAttribute(href)}" target="_blank" rel="noopener noreferrer">${current}</a>`;
            }
            case 'textStyle': {
                const color = safeColor(mark.attrs?.color);
                if (!color) return current;
                return `<span${styleAttribute({ color })}>${current}</span>`;
            }
            default:
                return current;
        }
    }, escapeHtml(text));
};

const renderNode = (node: any): string => {
    if (!node || typeof node !== 'object') return '';

    switch (node.type) {
        case 'doc':
            return renderChildren(node);
        case 'text':
            return renderTextWithMarks(String(node.text || ''), Array.isArray(node.marks) ? node.marks : []);
        case 'paragraph': {
            const textAlign = safeTextAlign(node.attrs?.textAlign);
            return `<p${styleAttribute({ 'text-align': textAlign })}>${renderChildren(node)}</p>`;
        }
        case 'heading': {
            const level = Math.min(Math.max(Number(node.attrs?.level || 2), 1), 6);
            const textAlign = safeTextAlign(node.attrs?.textAlign);
            return `<h${level}${styleAttribute({ 'text-align': textAlign })}>${renderChildren(node)}</h${level}>`;
        }
        case 'bulletList':
            return `<ul>${renderChildren(node)}</ul>`;
        case 'taskList':
            return `<ul data-type="taskList">${renderChildren(node)}</ul>`;
        case 'orderedList':
            return `<ol>${renderChildren(node)}</ol>`;
        case 'listItem':
            return `<li>${renderChildren(node)}</li>`;
        case 'taskItem': {
            const checked = Boolean(node.attrs?.checked);
            return `<li data-checked="${checked ? 'true' : 'false'}"><input type="checkbox" disabled${checked ? ' checked' : ''} />${renderChildren(node)}</li>`;
        }
        case 'blockquote':
            return `<blockquote>${renderChildren(node)}</blockquote>`;
        case 'codeBlock':
            return `<pre><code>${escapeHtml((node.content || []).map((item: any) => item?.text || '').join('\n'))}</code></pre>`;
        case 'hardBreak':
            return '<br />';
        case 'horizontalRule':
            return '<hr />';
        case 'image': {
            const src = safeImageSrc(node.attrs?.src);
            if (!src) return '';
            const alt = escapeAttribute(node.attrs?.alt || '');
            const title = node.attrs?.title ? ` title="${escapeAttribute(node.attrs.title)}"` : '';
            return `<img src="${escapeAttribute(src)}" alt="${alt}"${title} />`;
        }
        case 'table':
            return `<table><tbody>${renderChildren(node)}</tbody></table>`;
        case 'tableRow':
            return `<tr>${renderChildren(node)}</tr>`;
        case 'tableHeader':
            return `<th>${renderChildren(node)}</th>`;
        case 'tableCell':
            return `<td>${renderChildren(node)}</td>`;
        default:
            return renderChildren(node);
    }
};

export function renderPublicTiptapHtml(content: unknown): string {
    if (!content || typeof content !== 'object') return '';

    try {
        return renderNode(content);
    } catch {
        return '';
    }
}
