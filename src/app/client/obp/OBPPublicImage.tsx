'use client';

import {
    useEffect,
    useRef,
    useState,
    type ImgHTMLAttributes,
    type ReactNode,
} from 'react';

interface OBPPublicImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'onError' | 'src'> {
    alt: string;
    fallback?: ReactNode;
    src: string;
    wrapperClassName?: string;
}

export default function OBPPublicImage({
    alt,
    fallback = null,
    src,
    wrapperClassName,
    ...imageProps
}: OBPPublicImageProps) {
    const [failedSrc, setFailedSrc] = useState('');
    const imageRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        const image = imageRef.current;
        if (image?.complete && image.naturalWidth === 0) {
            setFailedSrc(src);
        }
    }, [src]);

    if (!src || failedSrc === src) return fallback;

    const image = (
        <img
            {...imageProps}
            alt={alt}
            ref={imageRef}
            src={src}
            onError={() => setFailedSrc(src)}
        />
    );

    return wrapperClassName
        ? <div className={wrapperClassName}>{image}</div>
        : image;
}
