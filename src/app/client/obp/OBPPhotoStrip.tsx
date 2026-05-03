'use client';

import { useState } from 'react';
import styles from './obp.module.scss';

interface OBPPhotoStripProps {
    closePreviewLabel: string;
    photoLabelTemplate: string;
    previewLabel: string;
    photos: string[];
    storeName: string;
}

export default function OBPPhotoStrip({
    closePreviewLabel,
    photoLabelTemplate,
    previewLabel,
    photos,
    storeName,
}: OBPPhotoStripProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const visiblePhotos = photos.filter(Boolean).slice(0, 3);
    if (visiblePhotos.length === 0) return null;
    const formatPhotoLabel = (index: number) => photoLabelTemplate.replace('{index}', String(index));

    return (
        <>
            <div className={styles.photoStrip}>
                {visiblePhotos.map((url, index) => (
                    <button
                        aria-label={`${storeName} ${formatPhotoLabel(index + 1)}`}
                        className={styles.photoButton}
                        key={url}
                        onClick={() => setPreviewUrl(url)}
                        type="button"
                    >
                        <img
                            src={url}
                            alt={`${storeName} ${formatPhotoLabel(index + 1)}`}
                            loading="lazy"
                        />
                    </button>
                ))}
            </div>
            {previewUrl ? (
                <button
                    aria-label={closePreviewLabel}
                    className={styles.photoPreviewBackdrop}
                    onClick={() => setPreviewUrl(null)}
                    type="button"
                >
                    <img src={previewUrl} alt={`${storeName} ${previewLabel}`} />
                </button>
            ) : null}
        </>
    );
}
