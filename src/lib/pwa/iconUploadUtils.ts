/**
 * Customer App icon upload helpers.
 *
 * Goal: avoid blocking owners on strict square-image requirements.
 * We accept normal rectangular logos and normalize them into a square PNG
 * before upload.
 */

export interface PreparedIconResult {
    file: File;
    wasAdjusted: boolean;
}

const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const OUTPUT_SIZE = 1024;

function fileNameToPng(name: string): string {
    const dot = name.lastIndexOf('.');
    const base = dot > 0 ? name.slice(0, dot) : name;
    return `${base}-pwa-icon.png`;
}

async function loadImage(file: File): Promise<HTMLImageElement> {
    return await new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Could not read image'));
        };
        img.src = url;
    });
}

/**
 * Prepare an uploaded icon file for PWA usage:
 * - validates basic constraints
 * - converts to square PNG (centered on white background)
 */
export async function preparePWAIconFile(file: File): Promise<PreparedIconResult> {
    if (!file.type.startsWith('image/')) {
        throw new Error('Only image files are allowed');
    }
    if (file.size > MAX_INPUT_BYTES) {
        throw new Error('Icon file must be 10MB or smaller');
    }

    const img = await loadImage(file);
    if (!img.width || !img.height) {
        throw new Error('Could not read image dimensions');
    }

    // Extremely small assets look poor as app icons even after resizing.
    if (Math.min(img.width, img.height) < 128) {
        throw new Error('Image is too small. Use at least 128×128');
    }

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not prepare icon canvas');

    // White background keeps icons clean across light/dark OS surfaces.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    // Keep the original aspect ratio and center the image with safe padding.
    const safeBox = Math.round(OUTPUT_SIZE * 0.84);
    const scale = Math.min(safeBox / img.width, safeBox / img.height);
    const drawW = Math.round(img.width * scale);
    const drawH = Math.round(img.height * scale);
    const dx = Math.round((OUTPUT_SIZE - drawW) / 2);
    const dy = Math.round((OUTPUT_SIZE - drawH) / 2);
    ctx.drawImage(img, dx, dy, drawW, drawH);

    const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png', 0.95),
    );
    if (!blob) throw new Error('Could not generate icon image');

    const outFile = new File([blob], fileNameToPng(file.name), { type: 'image/png' });
    return {
        file: outFile,
        wasAdjusted: img.width !== img.height || file.type !== 'image/png',
    };
}

