import AnimatedVerticalLogo from '@atoms/animatedVerticalLogo';
import AnswerlatticeAnimatedLogo from '@atoms/answerlatticeAnimatedLogo';
import styles from '@/app/page.module.css';

export type BrandedPageLoaderBrand = 'menulist' | 'answerlattice';

function BrandedPageLoader({
    page,
    brand = 'menulist',
}: {
    page?: string;
    brand?: BrandedPageLoaderBrand;
}) {
    const isAnswerlattice = brand === 'answerlattice';
    const brandLabel = isAnswerlattice ? 'Answerlattice' : 'MenuList';

    return (
        <main
            className={`${styles.loadingWrap} ${isAnswerlattice ? styles.loadingWrapAnswerlattice : ''}`.trim()}
            data-loader-source={`server-loader-${page || 'app'}`}
            data-loader-brand={brand}
            aria-label={`${brandLabel} is loading`}
        >
            <div className={`${styles.loadingWatermark} ${isAnswerlattice ? styles.loadingWatermarkAnswerlattice : ''}`.trim()} aria-hidden="true">
                {isAnswerlattice
                    ? <AnswerlatticeAnimatedLogo idPrefix="answerlattice-loader-watermark" />
                    : <AnimatedVerticalLogo showLabel={false} />}
            </div>
            <div className={`${styles.loadingLogo} ${isAnswerlattice ? styles.loadingLogoAnswerlattice : ''}`.trim()} aria-hidden="true">
                {isAnswerlattice
                    ? <AnswerlatticeAnimatedLogo idPrefix="answerlattice-loader-logo" />
                    : <AnimatedVerticalLogo showLabel={false} />}
            </div>
        </main>
    )
}

export default BrandedPageLoader;
