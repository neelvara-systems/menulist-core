type ImageLike = {
    mediaId?: string;
    name?: string;
    size?: number;
    type?: string | null;
    uid?: string;
    url?: string | null;
};

const getImageUrlKind = (url?: string | null) => {
    if (!url) return 'missing';
    if (url.startsWith('data:image/')) return 'data-url';
    if (url.startsWith('https://firebasestorage.googleapis.com/')) return 'firebase-storage';
    return 'external';
};

export function summarizeUploadedImage(image?: ImageLike | null) {
    if (!image) return null;

    return {
        hasUrl: Boolean(image.url),
        mediaId: image.mediaId,
        name: image.name,
        size: image.size,
        type: image.type,
        uid: image.uid,
        urlKind: getImageUrlKind(image.url),
    };
}

export function sanitizeImageGenerationConfigForLogging<T extends Record<string, unknown>>(config?: T | null) {
    if (!config) return config;

    const {
        referanceImage,
        referanceImages,
        promptImages,
        ...rest
    } = config;

    return {
        ...rest,
        ...(referanceImage !== undefined
            ? { referanceImage: summarizeUploadedImage(referanceImage as ImageLike | null) }
            : {}),
        ...(Array.isArray(referanceImages)
            ? {
                referanceImages: {
                    count: referanceImages.length,
                    images: referanceImages.slice(0, 5).map((image) => summarizeUploadedImage(image as ImageLike)),
                },
            }
            : {}),
        ...(Array.isArray(promptImages)
            ? {
                promptImages: promptImages
                    .filter(Boolean)
                    .slice(0, 5)
                    .map((image) => summarizeUploadedImage(image as ImageLike)),
            }
            : {}),
    };
}

export function summarizeImageProviderResponse(response: unknown) {
    const maybeResponse = response as {
        candidates?: Array<{
            content?: {
                parts?: Array<{
                    inlineData?: unknown;
                    text?: string;
                }>;
            };
        }>;
        generatedImages?: unknown[];
        usageMetadata?: unknown;
    } | null;

    const candidates = maybeResponse?.candidates || [];
    const parts = candidates.flatMap((candidate) => candidate.content?.parts || []);

    return {
        candidateCount: candidates.length,
        generatedImageCount: maybeResponse?.generatedImages?.length || 0,
        imagePartCount: parts.filter((part) => Boolean(part.inlineData)).length,
        textPartCount: parts.filter((part) => typeof part.text === 'string').length,
        usageMetadata: maybeResponse?.usageMetadata || null,
    };
}
