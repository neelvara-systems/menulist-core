import type { MenuCardGeneratedArtifact } from '../models/exportTypes';

export function downloadMenuCardArtifact(artifact: MenuCardGeneratedArtifact | { blob: Blob; filename: string }): void {
    const url = URL.createObjectURL(artifact.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = artifact.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export async function shareMenuCardArtifact(artifact: MenuCardGeneratedArtifact | { blob: Blob; filename: string }, title: string): Promise<boolean> {
    if (!navigator.share || !navigator.canShare) return false;
    const file = new File([artifact.blob], artifact.filename, { type: artifact.blob.type || 'application/pdf' });
    const shareData = { files: [file], title };
    if (!navigator.canShare(shareData)) return false;
    await navigator.share(shareData);
    return true;
}
