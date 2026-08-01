const escapeHtml = (value: unknown) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeAttribute = (value: unknown) => escapeHtml(value).replace(/`/g, '&#96;');

const PUBLIC_CONTENT_BASE_URL = 'https://answerlattice.invalid';
const UNSAFE_URL_CHARACTERS = /[\u0000-\u001f\u007f\\]/;
const PUBLIC_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const PUBLIC_IMAGE_PROTOCOLS = new Set(['http:', 'https:']);

const isSafeRootRelativeUrl = (value: string): boolean => {
    if (!value.startsWith('/') || value.startsWith('//') || UNSAFE_URL_CHARACTERS.test(value)) {
        return false;
    }

    try {
        return new URL(value, PUBLIC_CONTENT_BASE_URL).origin === PUBLIC_CONTENT_BASE_URL;
    } catch {
        return false;
    }
};

const parseCredentialFreeAbsoluteUrl = (
    value: string,
    allowedProtocols: ReadonlySet<string>,
): URL | null => {
    if (UNSAFE_URL_CHARACTERS.test(value)) return null;

    try {
        const parsed = new URL(value);
        if (
            !allowedProtocols.has(parsed.protocol)
            || parsed.username
            || parsed.password
        ) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
};

const safeHref = (value: unknown) => {
    const href = String(value || '').trim();
    if (!href) return '';
    if (href.startsWith('#') && !UNSAFE_URL_CHARACTERS.test(href)) return href;
    if (isSafeRootRelativeUrl(href)) return href;

    return parseCredentialFreeAbsoluteUrl(href, PUBLIC_LINK_PROTOCOLS)?.href || '';
};

const safeImageSrc = (value: unknown) => {
    const src = String(value || '').trim();
    if (!src) return '';
    if (isSafeRootRelativeUrl(src)) return src;

    return parseCredentialFreeAbsoluteUrl(src, PUBLIC_IMAGE_PROTOCOLS)?.href || '';
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

export interface AnswerlatticePublicArticleOutlineNode {
    id: string;
    text: string;
    level: number;
    children: AnswerlatticePublicArticleOutlineNode[];
}

export interface AnswerlatticeRenderedPublicArticle {
    safeHtml: string;
    outline: AnswerlatticePublicArticleOutlineNode[];
}

const MAX_PUBLIC_ARTICLE_HEADINGS = 40;
const MAX_PUBLIC_ARTICLE_HEADING_CHARS = 160;

const normalizePublicHeadingLevel = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(Math.max(Math.trunc(parsed), 1), 6) : 2;
};

const getPublicNodeText = (node: unknown): string => {
    if (!node || typeof node !== 'object') return '';
    const record = node as Record<string, any>;
    const ownText = record.type === 'text' && typeof record.text === 'string' ? record.text : '';
    const childText = Array.isArray(record.content)
        ? record.content.map(getPublicNodeText).join(' ')
        : '';
    return `${ownText} ${childText}`.replace(/\s+/g, ' ').trim();
};

const getPublicHeadingIdBase = (text: string) => (
    text
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80)
        || 'topic'
);

export function buildAnswerlatticePublicArticleOutline(
    content: unknown,
): AnswerlatticePublicArticleOutlineNode[] {
    if (!content || typeof content !== 'object') return [];

    const flat: AnswerlatticePublicArticleOutlineNode[] = [];
    const idCounts = new Map<string, number>();
    const visit = (node: unknown) => {
        if (flat.length >= MAX_PUBLIC_ARTICLE_HEADINGS || !node || typeof node !== 'object') return;
        const record = node as Record<string, any>;
        if (record.type === 'heading') {
            const text = getPublicNodeText(record).slice(0, MAX_PUBLIC_ARTICLE_HEADING_CHARS) || 'Untitled section';
            const base = getPublicHeadingIdBase(text);
            const occurrence = (idCounts.get(base) || 0) + 1;
            idCounts.set(base, occurrence);
            flat.push({
                id: `topic-${base}${occurrence > 1 ? `-${occurrence}` : ''}`,
                text,
                level: normalizePublicHeadingLevel(record.attrs?.level),
                children: [],
            });
        }
        if (Array.isArray(record.content)) record.content.forEach(visit);
    };
    visit(content);

    const roots: AnswerlatticePublicArticleOutlineNode[] = [];
    const stack: AnswerlatticePublicArticleOutlineNode[] = [];
    for (const heading of flat) {
        while (stack.length && stack[stack.length - 1].level >= heading.level) stack.pop();
        const parent = stack[stack.length - 1];
        if (parent) parent.children.push(heading);
        else roots.push(heading);
        stack.push(heading);
    }
    return roots;
}

const flattenPublicArticleOutline = (
    outline: AnswerlatticePublicArticleOutlineNode[],
): AnswerlatticePublicArticleOutlineNode[] => (
    outline.flatMap(node => [node, ...flattenPublicArticleOutline(node.children)])
);

/**
 * Adds deterministic IDs only to heading tags emitted by the fixed sanitizer
 * above. The source remains sanitized TipTap JSON; arbitrary HTML is never
 * accepted or parsed.
 */
const addPublicHeadingAnchors = (
    safeHtml: string,
    outline: AnswerlatticePublicArticleOutlineNode[],
): string => {
    const headings = flattenPublicArticleOutline(outline);
    let headingIndex = 0;
    return safeHtml.replace(/<h([1-6])([^>]*)>/g, (match, level: string, attributes: string) => {
        const heading = headings[headingIndex];
        headingIndex += 1;
        if (!heading) return match;
        return `<h${level} id="${escapeAttribute(heading.id)}"${attributes}>`;
    });
};

export function renderPublicTiptapArticle(content: unknown): AnswerlatticeRenderedPublicArticle {
    const outline = buildAnswerlatticePublicArticleOutline(content);
    const safeHtml = renderPublicTiptapHtml(content);
    return {
        safeHtml: addPublicHeadingAnchors(safeHtml, outline),
        outline,
    };
}
