import type { CSSProperties } from 'react';
import AnswerlatticeLogoMark from '@atoms/answerlatticeLogoMark';
import styles from './answerlatticeLoaderLogo.module.scss';

export type AnswerlatticeLoaderLogoProps = {
    className?: string;
    idPrefix?: string;
    style?: CSSProperties;
    title?: string;
};

function AnswerlatticeLoaderLogo({
    className = '',
    idPrefix = 'answerlattice-loader-logo',
    style,
    title,
}: AnswerlatticeLoaderLogoProps) {
    return (
        <AnswerlatticeLogoMark
            className={`${styles.logo} ${className}`.trim()}
            height="100%"
            idPrefix={idPrefix}
            pathClassNames={{
                leftStroke: styles.leftStroke,
                overlap: styles.overlap,
                rightStroke: styles.rightStroke,
            }}
            style={style}
            title={title}
            width="100%"
        />
    );
}

export default AnswerlatticeLoaderLogo;
