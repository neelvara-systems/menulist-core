import styles from './answerlatticeAnimatedLogo.module.scss';
import AnswerlatticeLogoMark from '@atoms/answerlatticeLogoMark';

type AnswerlatticeAnimatedLogoProps = {
    className?: string;
    idPrefix?: string;
};

function AnswerlatticeAnimatedLogo({
    className = '',
    idPrefix = 'answerlattice-animated-logo',
}: AnswerlatticeAnimatedLogoProps) {
    return (
        <AnswerlatticeLogoMark
            className={`${styles.logo} ${className}`.trim()}
            height="100%"
            idPrefix={idPrefix}
            width="100%"
        />
    );
}

export default AnswerlatticeAnimatedLogo;
