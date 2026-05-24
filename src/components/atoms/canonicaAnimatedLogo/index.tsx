import styles from './canonicaAnimatedLogo.module.scss';
import CanonicaLogoMark from '@atoms/canonicaLogoMark';

type CanonicaAnimatedLogoProps = {
    className?: string;
    idPrefix?: string;
};

function CanonicaAnimatedLogo({
    className = '',
    idPrefix = 'canonica-animated-logo',
}: CanonicaAnimatedLogoProps) {
    return (
        <CanonicaLogoMark
            className={`${styles.logo} ${className}`.trim()}
            height="100%"
            idPrefix={idPrefix}
            width="100%"
        />
    );
}

export default CanonicaAnimatedLogo;
