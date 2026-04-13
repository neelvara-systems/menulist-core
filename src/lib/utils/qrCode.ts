import QRCode from 'qrcode';

export interface QrCodeOptions {
    width?: number;
    margin?: number;
    darkColor?: string;
    lightColor?: string;
}

export async function generateQrCodeDataUrl(
    value: string,
    options?: QrCodeOptions
): Promise<string> {
    return await QRCode.toDataURL(value, {
        width: options?.width || 1024,
        margin: options?.margin || 2,
        color: {
            dark: options?.darkColor || '#000000',
            light: options?.lightColor || '#FFFFFF',
        },
        errorCorrectionLevel: 'H',
    });
}

export function downloadQrCode(dataUrl: string, filename: string): void {
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function buildQrCodeFilename(label: string, suffix = 'qr'): string {
    const sanitized = label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return `${sanitized}-${suffix}`;
}
