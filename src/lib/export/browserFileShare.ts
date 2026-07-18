export type BrowserFileShareResult = 'shared' | 'unsupported' | 'cancelled';

type ShareBrowserFileInput = {
    blob: Blob;
    filename: string;
    title: string;
};

export async function shareBrowserFile({
    blob,
    filename,
    title,
}: ShareBrowserFileInput): Promise<BrowserFileShareResult> {
    if (
        typeof navigator === 'undefined'
        || typeof navigator.share !== 'function'
        || typeof navigator.canShare !== 'function'
        || typeof File === 'undefined'
    ) {
        return 'unsupported';
    }

    const file = new File([blob], filename, {
        type: blob.type || 'application/octet-stream',
    });
    const shareData: ShareData = { files: [file], title };
    if (!navigator.canShare(shareData)) return 'unsupported';

    try {
        await navigator.share(shareData);
        return 'shared';
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            return 'cancelled';
        }
        throw error;
    }
}
