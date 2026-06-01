import QRCode from 'qrcode';

export async function renderQr(value: string, errorCorrection: 'M' | 'Q' = 'M'): Promise<string> {
    return QRCode.toDataURL(value, {
        width: 768,
        margin: 4,
        errorCorrectionLevel: errorCorrection,
        color: {
            dark: '#000000',
            light: '#ffffff',
        },
    });
}
