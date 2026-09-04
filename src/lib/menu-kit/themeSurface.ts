import {
    drawPrintableThemeArtwork,
    loadPrintableThemeArtwork,
    type PrintableThemeArtwork,
    type PrintableThemeArtworkFrame,
} from '@lib/printable-asset-templates/themeArtwork';
import { normalizePrintableTemplateFamilyId } from '@lib/printable-asset-templates/templateFamilies';
import { resolvePrintableTemplateBrandTokens } from '@lib/printable-asset-templates/templateStyles';
import type { MenuKitBrandTokens } from './brandTokens';
import type { MenuKitInput } from './types';

export type MenuKitThemeSurface = {
    artwork: PrintableThemeArtwork;
    brand: MenuKitBrandTokens;
    templateFamilyId: string;
};

export async function loadMenuKitThemeSurface(
    input: Pick<MenuKitInput, 'brandColor' | 'templateFamilyId'>,
): Promise<MenuKitThemeSurface> {
    const templateFamilyId = normalizePrintableTemplateFamilyId(input.templateFamilyId);
    const [artwork] = await Promise.all([
        loadPrintableThemeArtwork(templateFamilyId),
    ]);

    return {
        artwork,
        brand: resolvePrintableTemplateBrandTokens(input.brandColor, templateFamilyId),
        templateFamilyId,
    };
}

function drawCoverImage(
    ctx: CanvasRenderingContext2D,
    artwork: NonNullable<PrintableThemeArtwork['page']>,
    frame: PrintableThemeArtworkFrame,
): void {
    const scale = Math.max(
        frame.width / Math.max(1, artwork.width),
        frame.height / Math.max(1, artwork.height),
    );
    const width = artwork.width * scale;
    const height = artwork.height * scale;
    ctx.drawImage(
        artwork.element,
        frame.x + (frame.width - width) / 2,
        frame.y + (frame.height - height) / 2,
        width,
        height,
    );
}

/**
 * Paint a Menu Kit surface from the singular resolved parent theme. Page art
 * uses aspect-preserving cover placement; corner/rail families retain their
 * governed contained placement. Callers add their own content-safe panel.
 */
export function drawMenuKitThemeBackground(
    ctx: CanvasRenderingContext2D,
    surface: MenuKitThemeSurface,
    frame: PrintableThemeArtworkFrame,
    options: { artworkOpacity?: number } = {},
): void {
    ctx.save();
    ctx.fillStyle = surface.brand.paper;
    ctx.fillRect(frame.x, frame.y, frame.width, frame.height);
    ctx.beginPath();
    ctx.rect(frame.x, frame.y, frame.width, frame.height);
    ctx.clip();

    if (surface.artwork.page) {
        ctx.globalAlpha = options.artworkOpacity ?? 0.82;
        drawCoverImage(ctx, surface.artwork.page, frame);
    } else {
        drawPrintableThemeArtwork(ctx, surface.artwork, frame, {
            cornerOpacity: options.artworkOpacity ?? 0.50,
            railOpacity: Math.min(options.artworkOpacity ?? 0.38, 0.42),
            templateFamilyId: surface.templateFamilyId,
        });
    }
    ctx.restore();
}
