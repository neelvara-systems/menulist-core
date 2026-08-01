import QRCode from 'qrcode';
import { normalizeMenuCardQrDestination } from '../source/buildQrDestination';

export async function renderQr(value: string, errorCorrection: 'M' | 'Q' = 'M'): Promise<string> {
    const destination = normalizeMenuCardQrDestination(value);
    if (!destination) {
        throw new Error('Invalid QR destination URL');
    }

    return QRCode.toDataURL(destination, {
        width: 768,
        margin: 4,
        errorCorrectionLevel: errorCorrection,
        color: {
            dark: '#000000',
            light: '#ffffff',
        },
    });
}
