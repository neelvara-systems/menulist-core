const RASTER_IMAGE_DATA_URL_PATTERN = /^data:image\/(?:gif|jpeg|png|webp);base64,[a-z0-9+/]+={0,2}$/i;
const SVG_IMAGE_URL_PATTERN = /(?:^data:image\/svg|\.(?:svg|svgz)(?:[?#]|$))/i;

export const isCreativeEditorRasterDataUrl = (value: string) => (
    RASTER_IMAGE_DATA_URL_PATTERN.test(value.trim())
);

export const isSafeCreativeEditorNetworkImageSource = (value: string, baseOrigin: string) => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    try {
        const url = new URL(trimmed, baseOrigin);
        return (
            (url.protocol === "http:" || url.protocol === "https:")
            && !SVG_IMAGE_URL_PATTERN.test(`${url.pathname}${url.search}`)
        );
    } catch {
        return false;
    }
};
