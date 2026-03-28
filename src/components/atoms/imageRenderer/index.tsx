import { APP_NAME } from '@constant/common'
import Image from 'next/image'
import { memo } from 'react'

function ImageRenderer({ src, width = 300, height = 300, styles = {} }: any) {
    return (
        <Image loading='lazy' style={{ ...styles }} className={styles.nextImageElement} src={src} width={width} height={height} alt={APP_NAME} />
    )
}

export default memo(ImageRenderer)