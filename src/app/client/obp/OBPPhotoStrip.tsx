'use client';

import { useState } from 'react';
import { LuChevronLeft, LuChevronRight, LuX } from 'react-icons/lu';
import styles from './obp.module.scss';

interface OBPPhotoStripProps {
    closePreviewLabel: string;
    nextPhotoLabel: string;
    photoLabelTemplate: string;
    photoPositionTemplate: string;
    previousPhotoLabel: string;
    previewLabel: string;
    photos: string[];
    storeName: string;
}

export default function OBPPhotoStrip({
    closePreviewLabel,
    nextPhotoLabel,
    photoLabelTemplate,
    photoPositionTemplate,
    previousPhotoLabel,
    previewLabel,
    photos,
    storeName,
}: OBPPhotoStripProps) {
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);
    const galleryPhotos = photos.filter(Boolean);
    const visiblePhotos = galleryPhotos.slice(0, 3);
    if (galleryPhotos.length === 0) return null;
    const formatPhotoLabel = (index: number) => photoLabelTemplate.replace('{index}', String(index));
    const formatPhotoPosition = (index: number) => photoPositionTemplate
        .replace('{index}', String(index))
        .replace('{total}', String(galleryPhotos.length));
    const previewUrl = previewIndex !== null ? galleryPhotos[previewIndex] : null;
    const canNavigate = galleryPhotos.length > 1;
    const showPreviousPhoto = () => setPreviewIndex((current) => {
        if (current === null) return current;
        return current === 0 ? galleryPhotos.length - 1 : current - 1;
    });
    const showNextPhoto = () => setPreviewIndex((current) => {
        if (current === null) return current;
        return current === galleryPhotos.length - 1 ? 0 : current + 1;
    });

    return (
        <>
            <div className={styles.photoStrip}>
                {visiblePhotos.map((url, index) => (
                    <button
                        aria-label={`${storeName} ${formatPhotoLabel(index + 1)}`}
                        className={styles.photoButton}
                        key={url}
                        onClick={() => setPreviewIndex(index)}
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
                <div
                    aria-label={`${storeName} ${previewLabel}`}
                    className={styles.photoPreviewBackdrop}
                    onClick={() => setPreviewIndex(null)}
                    role="dialog"
                >
                    <div className={styles.photoPreviewFrame} onClick={(event) => event.stopPropagation()}>
                        <button
                            aria-label={closePreviewLabel}
                            className={`${styles.photoPreviewControl} ${styles.photoPreviewClose}`}
                            onClick={() => setPreviewIndex(null)}
                            type="button"
                        >
                            <LuX aria-hidden="true" size={18} />
                        </button>
                        {canNavigate ? (
                            <button
                                aria-label={previousPhotoLabel}
                                className={`${styles.photoPreviewControl} ${styles.photoPreviewPrev}`}
                                onClick={showPreviousPhoto}
                                type="button"
                            >
                                <LuChevronLeft aria-hidden="true" size={22} />
                            </button>
                        ) : null}
                        <img src={previewUrl} alt={`${storeName} ${formatPhotoLabel((previewIndex || 0) + 1)}`} />
                        {canNavigate ? (
                            <button
                                aria-label={nextPhotoLabel}
                                className={`${styles.photoPreviewControl} ${styles.photoPreviewNext}`}
                                onClick={showNextPhoto}
                                type="button"
                            >
                                <LuChevronRight aria-hidden="true" size={22} />
                            </button>
                        ) : null}
                        {previewIndex !== null ? (
                            <div className={styles.photoPreviewCounter}>
                                {formatPhotoPosition(previewIndex + 1)}
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </>
    );
}
