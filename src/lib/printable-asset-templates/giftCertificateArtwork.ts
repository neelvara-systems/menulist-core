import type { PrintableTemplateFamilyId } from './types';
import { getPrintableLibraryIconSymbolMarkup } from './printableIconArtwork';

export const PRINTABLE_GIFT_CERTIFICATE_OVERLAY_WIDTH = 1748;
export const PRINTABLE_GIFT_CERTIFICATE_OVERLAY_HEIGHT = 826;

export function getPrintableGiftCertificateOverlayPath(
    templateFamilyId: PrintableTemplateFamilyId,
): string {
    return `/images/printable-themes/${templateFamilyId}/gift-certificate-wrap-overlay.png`;
}

export function buildPrintableGiftCertificateOverlaySvg(tokens: {
    accent: string;
    border: string;
    highlight: string;
}): string {
    const { accent, border, highlight } = tokens;
    const giftSymbol = getPrintableLibraryIconSymbolMarkup('koboyo-gift', 'gift-certificate-purpose-art');
    return [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${PRINTABLE_GIFT_CERTIFICATE_OVERLAY_WIDTH}" height="${PRINTABLE_GIFT_CERTIFICATE_OVERLAY_HEIGHT}" viewBox="0 0 ${PRINTABLE_GIFT_CERTIFICATE_OVERLAY_WIDTH} ${PRINTABLE_GIFT_CERTIFICATE_OVERLAY_HEIGHT}" fill="none" data-icon-library="koboyo" data-purpose-art="gift">`,
        `<defs>${giftSymbol}</defs>`,
        `<path d="M-90-12H1838V132C1284 72 692 62-90 148Z" fill="${accent}" fill-opacity="0.10"/>`,
        `<path d="M-82 18H1830V72C1254 42 646 45-82 104Z" fill="${highlight}" fill-opacity="0.12"/>`,
        `<circle cx="1638" cy="58" r="238" fill="${border}" fill-opacity="0.055"/>`,
        `<circle cx="62" cy="790" r="226" fill="${accent}" fill-opacity="0.045"/>`,
        `<g color="${accent}" opacity="0.24" transform="translate(1484 -10) rotate(9 142 152)"><use href="#gift-certificate-purpose-art" width="284" height="304"/></g>`,
        `<g color="${border}" opacity="0.16" transform="translate(-72 614) rotate(-8 124 132)"><use href="#gift-certificate-purpose-art" width="248" height="265"/></g>`,
        '</svg>',
    ].join('');
}
