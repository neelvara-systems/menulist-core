import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
    'a',
    'blockquote',
    'br',
    'code',
    'em',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'img',
    'li',
    'ol',
    'p',
    'pre',
    's',
    'strong',
    'table',
    'tbody',
    'td',
    'th',
    'thead',
    'tr',
    'u',
    'ul',
];

const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'target', 'rel', 'colspan', 'rowspan'];

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
    if (href.startsWith('/') || href.startsWith('#')) return href;
    if (/^(https?:|mailto:|tel:)/i.test(href)) return href;
    return '';
};

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
        case 'paragraph':
            return `<p>${renderChildren(node)}</p>`;
        case 'heading': {
            const level = Math.min(Math.max(Number(node.attrs?.level || 2), 1), 6);
            return `<h${level}>${renderChildren(node)}</h${level}>`;
        }
        case 'bulletList':
        case 'taskList':
            return `<ul>${renderChildren(node)}</ul>`;
        case 'orderedList':
            return `<ol>${renderChildren(node)}</ol>`;
        case 'listItem':
        case 'taskItem':
            return `<li>${renderChildren(node)}</li>`;
        case 'blockquote':
            return `<blockquote>${renderChildren(node)}</blockquote>`;
        case 'codeBlock':
            return `<pre><code>${escapeHtml((node.content || []).map((item: any) => item?.text || '').join('\n'))}</code></pre>`;
        case 'hardBreak':
            return '<br />';
        case 'horizontalRule':
            return '<hr />';
        case 'image': {
            const src = safeHref(node.attrs?.src);
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
        const html = renderNode(content);
        return DOMPurify.sanitize(html, {
            ALLOWED_TAGS,
            ALLOWED_ATTR,
        });
    } catch {
        return '';
    }
}
