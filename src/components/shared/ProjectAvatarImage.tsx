'use client'

import { resolveProjectImageUrl } from '@lib/image/projectImageDisplay';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

interface ProjectAvatarImageProps {
    alt?: string;
    children: ReactNode;
    className?: string;
    projectImage?: unknown;
    style?: CSSProperties;
}

export function ProjectAvatarImage({
    alt = '',
    children,
    className,
    projectImage,
    style,
}: ProjectAvatarImageProps) {
    const imageUrl = resolveProjectImageUrl(projectImage);
    const [hasImageError, setHasImageError] = useState(false);

    useEffect(() => {
        setHasImageError(false);
    }, [imageUrl]);

    if (!imageUrl || hasImageError) {
        return <>{children}</>;
    }

    return (
        <img
            alt={alt}
            className={className}
            onError={() => setHasImageError(true)}
            src={imageUrl}
            style={{ height: '100%', objectFit: 'cover', width: '100%', ...style }}
        />
    );
}
