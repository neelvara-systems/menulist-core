import type { MenuCardGeneratedArtifact } from '../models/exportTypes';
import { shareBrowserFile, type BrowserFileShareResult } from '../../export/browserFileShare';

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

export async function shareMenuCardArtifact(
    artifact: MenuCardGeneratedArtifact | { blob: Blob; filename: string },
    title: string,
): Promise<BrowserFileShareResult> {
    return shareBrowserFile({
        blob: artifact.blob,
        filename: artifact.filename,
        title,
    });
}
