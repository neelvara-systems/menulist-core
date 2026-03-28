/**
 * Image Loader for Menu Kit
 *
 * Loads store logos from URLs for rendering in PDF (jsPDF) and PNG (canvas) templates.
 * Handles CORS, loading errors, and format conversion gracefully.
 *
 * @see __docs__/menu-kit/menu-kit_impl.md
 */

/**
 * Pre-loaded logo images ready for rendering in templates.
 * Loaded once in menuKitGenerator, passed to all templates.
 */
export interface PreloadedLogo {
    /** HTMLImageElement for canvas-based templates */
    element: HTMLImageElement;
    /** Data URL (PNG) for jsPDF-based templates */
    dataUrl: string;
    /** Natural width of the loaded image */
    width: number;
    /** Natural height of the loaded image */
    height: number;
}

/**
 * Load a logo image from URL and prepare it for both jsPDF and canvas rendering.
 * Returns null if the image fails to load (graceful fallback — templates skip logo).
 *
 * @param url - Firebase Storage URL or any accessible image URL
 * @param maxSize - Maximum dimension (width or height) to scale down to. Default 200px.
 */
export async function loadLogo(url: string, maxSize = 200): Promise<PreloadedLogo | null> {
    if (!url) return null;

    try {
        const element = await loadImageElement(url);
        if (!element) return null;

        // Scale to fit within maxSize while preserving aspect ratio
        let { naturalWidth: w, naturalHeight: h } = element;
        if (w > maxSize || h > maxSize) {
            const scale = maxSize / Math.max(w, h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
        }

        // Convert to data URL for jsPDF
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(element, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/png');

        return { element, dataUrl, width: w, height: h };
    } catch {
        return null;
    }
}

/**
 * Load an image element from URL with CORS support and timeout.
 */
function loadImageElement(url: string, timeoutMs = 5000): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        const timer = setTimeout(() => {
            img.src = '';
            resolve(null);
        }, timeoutMs);

        img.onload = () => {
            clearTimeout(timer);
            resolve(img);
        };
        img.onerror = () => {
            clearTimeout(timer);
            resolve(null);
        };

        img.src = url;
    });
}
