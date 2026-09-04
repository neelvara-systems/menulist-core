import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import {
    buildPrintableGiftCertificateOverlaySvg,
    getPrintableGiftCertificateOverlayPath,
} from '../../src/lib/printable-asset-templates/giftCertificateArtwork';
import { PRINTABLE_THEME_FAMILY_IDS } from '../../src/lib/printable-asset-templates/templateFamilies';
import { resolvePrintableTemplateBrandTokens } from '../../src/lib/printable-asset-templates/templateStyles';

async function main() {
    for (const themeId of PRINTABLE_THEME_FAMILY_IDS) {
        const tokens = resolvePrintableTemplateBrandTokens(undefined, themeId);
        const publicPath = getPrintableGiftCertificateOverlayPath(themeId);
        const outputPath = path.resolve(process.cwd(), `public${publicPath}`);
        await mkdir(path.dirname(outputPath), { recursive: true });
        await sharp(Buffer.from(buildPrintableGiftCertificateOverlaySvg({
            accent: tokens.accent,
            border: tokens.border,
            highlight: tokens.softAccent,
        })))
            .png({ compressionLevel: 9 })
            .toFile(outputPath);
        process.stdout.write(`${themeId} -> ${publicPath}\n`);
    }
    process.stdout.write(`Generated ${PRINTABLE_THEME_FAMILY_IDS.length} governed Gift Certificate overlays.\n`);
}

void main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exitCode = 1;
});
