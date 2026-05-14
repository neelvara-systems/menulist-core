export const resolveProjectImageUrl = (projectImage: unknown): string | null => {
    if (typeof projectImage !== 'string') return null;

    const trimmed = projectImage.trim();
    return trimmed.length > 0 ? trimmed : null;
};
