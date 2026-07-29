const imageToBase64 = (image: unknown): string => {
    if (
        typeof HTMLImageElement === 'undefined'
        || typeof document === 'undefined'
        || !(image instanceof HTMLImageElement)
    ) {
        return '';
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return '';

    canvas.width = image.width;
    canvas.height = image.height;
    context.drawImage(image, 0, 0);
    return canvas.toDataURL();
};

export default imageToBase64;
