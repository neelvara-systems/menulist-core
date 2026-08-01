import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import type { PreparedMediaImage } from './prepareMediaImage';

export type ItemPhotoCaptureMode = 'topDown' | 'closer';

export type ItemPhotoReadinessStatus = 'ready' | 'needsLight' | 'needsSteady' | 'needsFrame';

export interface ItemPhotoCaptureModeConfig {
    helper: string;
    id: ItemPhotoCaptureMode;
    label: string;
}

export interface ItemPhotoReadinessResult {
    checks: {
        brightness: 'ready' | 'warn';
        framing: 'ready' | 'warn';
        sharpness: 'ready' | 'warn';
    };
    detail: string;
    status: ItemPhotoReadinessStatus;
    title: string;
}

export interface ItemPhotoPreparationContext {
    itemId: string | null;
    revision: number;
}

interface SampledImageStats {
    averageLight: number;
    centerContrast: number;
    overallContrast: number;
    sharpness: number;
}

export const ITEM_PHOTO_CAPTURE_MODES: ItemPhotoCaptureModeConfig[] = [
    {
        helper: 'Keep the item inside the circle.',
        id: 'topDown',
        label: 'Top-down',
    },
    {
        helper: 'Fill the frame with the item.',
        id: 'closer',
        label: 'Closer',
    },
];

export function isItemPhotoPreparationContextCurrent(
    started: ItemPhotoPreparationContext,
    current: ItemPhotoPreparationContext,
): boolean {
    return started.itemId !== null
        && started.itemId === current.itemId
        && started.revision === current.revision;
}

function loadDataUrlImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Could not check photo'));
        image.src = dataUrl;
    });
}

function calculateStdDev(values: number[], average: number): number {
    if (!values.length) return 0;
    const variance = values.reduce((total, value) => total + ((value - average) ** 2), 0) / values.length;
    return Math.sqrt(variance);
}

function sampleImageStats(data: Uint8ClampedArray, width: number, height: number): SampledImageStats {
    const lumaValues: number[] = [];
    const centerValues: number[] = [];
    let totalLight = 0;
    const centerMinX = Math.floor(width * 0.24);
    const centerMaxX = Math.ceil(width * 0.76);
    const centerMinY = Math.floor(height * 0.24);
    const centerMaxY = Math.ceil(height * 0.76);

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const offset = (y * width + x) * 4;
            const luma = (data[offset] * 0.299) + (data[offset + 1] * 0.587) + (data[offset + 2] * 0.114);
            lumaValues.push(luma);
            totalLight += luma;

            if (x >= centerMinX && x <= centerMaxX && y >= centerMinY && y <= centerMaxY) {
                centerValues.push(luma);
            }
        }
    }

    const averageLight = totalLight / Math.max(1, lumaValues.length);
    const centerAverage = centerValues.reduce((total, value) => total + value, 0) / Math.max(1, centerValues.length);
    let laplacianTotal = 0;
    let laplacianTotalSquared = 0;
    let laplacianCount = 0;

    for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
            const index = y * width + x;
            const laplacian = (
                (lumaValues[index] * 4)
                - lumaValues[index - 1]
                - lumaValues[index + 1]
                - lumaValues[index - width]
                - lumaValues[index + width]
            );
            laplacianTotal += laplacian;
            laplacianTotalSquared += laplacian * laplacian;
            laplacianCount += 1;
        }
    }

    const laplacianAverage = laplacianTotal / Math.max(1, laplacianCount);
    const sharpness = (laplacianTotalSquared / Math.max(1, laplacianCount)) - (laplacianAverage ** 2);

    return {
        averageLight,
        centerContrast: calculateStdDev(centerValues, centerAverage),
        overallContrast: calculateStdDev(lumaValues, averageLight),
        sharpness,
    };
}

async function getPreparedImageStats(prepared: PreparedMediaImage): Promise<SampledImageStats | null> {
    if (typeof document === 'undefined') return null;

    const source = prepared.dataUrl || prepared.sourceDataUrl;
    if (!source) return null;

    const image = await loadDataUrlImage(source);
    const scale = Math.min(1, 96 / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(24, Math.round(image.naturalWidth * scale));
    const height = Math.max(24, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) return null;

    ctx.drawImage(image, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    canvas.width = 0;
    canvas.height = 0;
    return sampleImageStats(imageData.data, width, height);
}

function getItemPhotoReadinessLogContext(prepared: PreparedMediaImage) {
    return {
        ...getBoundedRuntimeStringContext('imageType', prepared.imageType),
        ...getBoundedRuntimeStringContext('mimeType', prepared.mimeType),
        hasDataUrl: Boolean(prepared.dataUrl),
        hasSourceDataUrl: Boolean(prepared.sourceDataUrl),
        preparedHeight: prepared.height,
        preparedWidth: prepared.width,
        preparedSizeBytes: prepared.sizeBytes,
    };
}

export async function assessItemPhotoReadiness(prepared: PreparedMediaImage): Promise<ItemPhotoReadinessResult> {
    let stats: SampledImageStats | null = null;

    try {
        stats = await getPreparedImageStats(prepared);
    } catch (error) {
        logRuntimeFailure('item_photo_readiness_stats_failed', error, getItemPhotoReadinessLogContext(prepared));
    }

    if (!stats) {
        return {
            checks: { brightness: 'ready', framing: 'ready', sharpness: 'ready' },
            detail: 'Photo prepared.',
            status: 'ready',
            title: 'Ready to save',
        };
    }

    const brightnessWarn = stats.averageLight < 52 || stats.averageLight > 238;
    const sharpnessWarn = stats.sharpness < 16;
    const framingWarn = stats.overallContrast > 18 && stats.centerContrast < 7;

    if (brightnessWarn) {
        return {
            checks: {
                brightness: 'warn',
                framing: framingWarn ? 'warn' : 'ready',
                sharpness: sharpnessWarn ? 'warn' : 'ready',
            },
            detail: 'Use another photo or move near better light.',
            status: 'needsLight',
            title: 'Move near better light',
        };
    }

    if (sharpnessWarn) {
        return {
            checks: {
                brightness: 'ready',
                framing: framingWarn ? 'warn' : 'ready',
                sharpness: 'warn',
            },
            detail: 'Hold steady and retake.',
            status: 'needsSteady',
            title: 'Hold steady and retake',
        };
    }

    if (framingWarn) {
        return {
            checks: {
                brightness: 'ready',
                framing: 'warn',
                sharpness: 'ready',
            },
            detail: 'Keep the item inside the frame.',
            status: 'needsFrame',
            title: 'Keep the item inside the frame',
        };
    }

    return {
        checks: { brightness: 'ready', framing: 'ready', sharpness: 'ready' },
        detail: 'Photo prepared.',
        status: 'ready',
        title: 'Ready to save',
    };
}

export function buildCapturedItemPhotoName(itemName: string | undefined, mode: ItemPhotoCaptureMode): string {
    const base = (itemName || 'item-photo')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'item-photo';

    return `${base}-${mode}-${Date.now()}.jpg`;
}
