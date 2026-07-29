'use client';

import { useMemo, useState } from 'react';
import PublicImageViewer from '@/components/shared/media/PublicImageViewer';
import { normalizeOBPPublicPhotoUrls } from '@lib/obp/publicPhotos';
import styles from './obp.module.scss';

interface OBPPhotoStripProps {
    closePreviewLabel: string;
    direction?: 'ltr' | 'rtl';
    language?: string;
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
    direction,
    language,
    nextPhotoLabel,
    photoLabelTemplate,
    photoPositionTemplate,
    previousPhotoLabel,
    previewLabel,
    photos,
    storeName,
}: OBPPhotoStripProps) {
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);
    const galleryPhotos = normalizeOBPPublicPhotoUrls(photos);
    const visiblePhotos = galleryPhotos.slice(0, 3);
    const formatPhotoLabel = (index: number) => photoLabelTemplate.replace('{index}', String(index));
    const viewerImages = useMemo(() => galleryPhotos.map((url, index) => ({
        alt: `${storeName} ${formatPhotoLabel(index + 1)}`,
        url,
    })), [galleryPhotos, photoLabelTemplate, storeName]);

    if (galleryPhotos.length === 0) return null;

    return (
        <>
            <div className={styles.photoStrip}>
                {visiblePhotos.map((url, index) => (
                    <button
                        aria-label={`${storeName} ${formatPhotoLabel(index + 1)}`}
                        className={styles.photoButton}
                        key={url}
                        onClick={() => {
                            setPreviewIndex(index);
                        }}
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
            <PublicImageViewer
                closeLabel={closePreviewLabel}
                direction={direction}
                images={viewerImages}
                initialIndex={previewIndex || 0}
                language={language}
                nextLabel={nextPhotoLabel}
                onClose={() => setPreviewIndex(null)}
                onIndexChange={setPreviewIndex}
                open={previewIndex !== null}
                positionLabelTemplate={photoPositionTemplate}
                previousLabel={previousPhotoLabel}
                title={`${storeName} ${previewLabel}`}
            />
        </>
    );
}
