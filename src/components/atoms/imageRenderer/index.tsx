import { APP_NAME } from '@constant/common'
import Image from 'next/image'
import type { ImageProps } from 'next/image'
import { memo, type CSSProperties } from 'react'

interface ImageRendererProps {
    src: ImageProps['src'];
    width?: number;
    height?: number;
    style?: CSSProperties;
    className?: string;
    alt?: string;
}

function ImageRenderer({ src, width = 300, height = 300, style, className, alt = APP_NAME }: ImageRendererProps) {
    return (
        <Image loading='lazy' style={style} className={className} src={src} width={width} height={height} alt={alt} />
    )
}

export default memo(ImageRenderer)
