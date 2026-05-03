'use client';

import { useState } from 'react';
import styles from './obp.module.scss';

interface OBPPhotoStripProps {
    photos: string[];
    storeName: string;
}

export default function OBPPhotoStrip({ photos, storeName }: OBPPhotoStripProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const visiblePhotos = photos.filter(Boolean).slice(0, 3);
    if (visiblePhotos.length === 0) return null;

    return (
        <>
            <div className={styles.photoStrip}>
                {visiblePhotos.map((url, index) => (
                    <button
                        aria-label={`${storeName} photo ${index + 1}`}
                        className={styles.photoButton}
                        key={url}
                        onClick={() => setPreviewUrl(url)}
                        type="button"
                    >
                        <img
                            src={url}
                            alt={`${storeName} photo ${index + 1}`}
                            loading="lazy"
                        />
                    </button>
                ))}
            </div>
            {previewUrl ? (
                <button
                    aria-label="Close image preview"
                    className={styles.photoPreviewBackdrop}
                    onClick={() => setPreviewUrl(null)}
                    type="button"
                >
                    <img src={previewUrl} alt={`${storeName} preview`} />
                </button>
            ) : null}
        </>
    );
}
