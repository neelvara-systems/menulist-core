import * as LuIcons from 'react-icons/lu';
import { normalizeCategoryIcon } from '@data/shared/categoryIconSuggestions';

const CATEGORY_ICON_RASTER_SIZE = 128;
const MAX_CATEGORY_ICON_CACHE_ENTRIES = 64;
const categoryIconDataUrlCache = new Map<string, string>();
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const SUPPORTED_SVG_ELEMENTS = new Set([
    'circle',
    'ellipse',
    'g',
    'line',
    'path',
    'polygon',
    'polyline',
    'rect',
]);
const SVG_ATTRIBUTE_NAMES: Record<string, string> = {
    className: 'class',
    fillRule: 'fill-rule',
    clipRule: 'clip-rule',
    strokeWidth: 'stroke-width',
    strokeLinecap: 'stroke-linecap',
    strokeLinejoin: 'stroke-linejoin',
    strokeMiterlimit: 'stroke-miterlimit',
};

type ReactSvgNode = {
    type?: unknown;
    props?: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getLucideComponent(icon: string): ((props: Record<string, never>) => unknown) | null {
    if (!icon.startsWith('lu:')) return null;
    const iconName = icon.slice(3);
    const candidate = (LuIcons as Record<string, unknown>)[iconName];
    return typeof candidate === 'function'
        ? candidate as (props: Record<string, never>) => unknown
        : null;
}

/** Only returns category icon values that the PDF renderer can actually draw. */
export function normalizePrintableCategoryIcon(value: unknown): string {
    const normalized = normalizeCategoryIcon(value);
    if (!normalized) return '';
    if (normalized.startsWith('emoji:')) return normalized;
    return getLucideComponent(normalized) ? normalized : '';
}

function applySvgAttributes(element: Element, attributes: unknown) {
    if (!isRecord(attributes)) return;

    Object.entries(attributes).forEach(([rawName, rawValue]) => {
        if (
            rawName === 'children'
            || rawName === 'attr'
            || rawName === 'size'
            || rawName === 'title'
            || rawName.startsWith('on')
            || (typeof rawValue !== 'string' && typeof rawValue !== 'number')
        ) {
            return;
        }
        const attributeName = SVG_ATTRIBUTE_NAMES[rawName] || rawName;
        element.setAttribute(attributeName, String(rawValue));
    });
}

function appendReactSvgNodes(parent: Element, node: unknown) {
    if (Array.isArray(node)) {
        node.forEach((child) => appendReactSvgNodes(parent, child));
        return;
    }
    if (!isRecord(node)) return;

    const reactNode = node as ReactSvgNode;
    const props = isRecord(reactNode.props) ? reactNode.props : {};
    if (typeof reactNode.type === 'string' && SUPPORTED_SVG_ELEMENTS.has(reactNode.type)) {
        const childElement = document.createElementNS(SVG_NAMESPACE, reactNode.type);
        applySvgAttributes(childElement, props);
        parent.appendChild(childElement);
        appendReactSvgNodes(childElement, props.children);
        return;
    }

    appendReactSvgNodes(parent, props.children);
}

function buildLucideSvg(icon: string, color: string): SVGSVGElement | null {
    const component = getLucideComponent(icon);
    if (!component || typeof document === 'undefined') return null;

    const rendered = component({});
    if (!isRecord(rendered)) return null;
    const props = isRecord(rendered.props) ? rendered.props : {};
    const attributes = isRecord(props.attr) ? props.attr : {};
    const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
    applySvgAttributes(svg, attributes);
    svg.setAttribute('xmlns', SVG_NAMESPACE);
    svg.setAttribute('viewBox', typeof attributes.viewBox === 'string' ? attributes.viewBox : '0 0 24 24');
    svg.setAttribute('width', String(CATEGORY_ICON_RASTER_SIZE));
    svg.setAttribute('height', String(CATEGORY_ICON_RASTER_SIZE));
    svg.setAttribute('color', color);
    appendReactSvgNodes(svg, props.children);
    return svg.childElementCount > 0 ? svg : null;
}

function canvasToDataUrl(canvas: HTMLCanvasElement): string | null {
    try {
        return canvas.toDataURL('image/png');
    } catch {
        return null;
    }
}

function renderEmojiIcon(icon: string): string | null {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = CATEGORY_ICON_RASTER_SIZE;
    canvas.height = CATEGORY_ICON_RASTER_SIZE;
    const context = canvas.getContext('2d');
    if (!context) return null;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = `92px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(icon.slice('emoji:'.length), canvas.width / 2, canvas.height / 2 + 2);
    return canvasToDataUrl(canvas);
}

async function renderLucideIcon(icon: string, color: string): Promise<string | null> {
    if (typeof document === 'undefined' || typeof Image === 'undefined' || typeof XMLSerializer === 'undefined') {
        return null;
    }
    const svg = buildLucideSvg(icon, color);
    if (!svg) return null;

    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const candidate = new Image();
            candidate.onload = () => resolve(candidate);
            candidate.onerror = () => reject(new Error('Category icon rasterization failed'));
            candidate.src = objectUrl;
        });
        const canvas = document.createElement('canvas');
        canvas.width = CATEGORY_ICON_RASTER_SIZE;
        canvas.height = CATEGORY_ICON_RASTER_SIZE;
        const context = canvas.getContext('2d');
        if (!context) return null;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 10, 10, canvas.width - 20, canvas.height - 20);
        return canvasToDataUrl(canvas);
    } catch {
        return null;
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

/** Rasterizes a canonical category icon for deterministic jsPDF embedding. */
export async function createPrintableCategoryIconDataUrl(value: unknown, color: string): Promise<string | null> {
    const icon = normalizePrintableCategoryIcon(value);
    if (!icon) return null;
    const cacheKey = `${icon}|${color}`;
    const cached = categoryIconDataUrlCache.get(cacheKey);
    if (cached) return cached;

    const dataUrl = icon.startsWith('emoji:')
        ? renderEmojiIcon(icon)
        : await renderLucideIcon(icon, color);
    if (!dataUrl) return null;

    if (categoryIconDataUrlCache.size >= MAX_CATEGORY_ICON_CACHE_ENTRIES) {
        const oldestKey = categoryIconDataUrlCache.keys().next().value;
        if (typeof oldestKey === 'string') categoryIconDataUrlCache.delete(oldestKey);
    }
    categoryIconDataUrlCache.set(cacheKey, dataUrl);
    return dataUrl;
}
