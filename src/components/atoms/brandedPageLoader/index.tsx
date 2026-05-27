import AnimatedVerticalLogo from '@atoms/animatedVerticalLogo';
import CanonicaAnimatedLogo from '@atoms/canonicaAnimatedLogo';
import styles from '@/app/page.module.css';

export type BrandedPageLoaderBrand = 'menulist' | 'canonica';

function BrandedPageLoader({
    page,
    brand = 'menulist',
}: {
    page?: string;
    brand?: BrandedPageLoaderBrand;
}) {
    const isCanonica = brand === 'canonica';
    const brandLabel = isCanonica ? 'Canonica' : 'MenuList';

    return (
        <main
            className={`${styles.loadingWrap} ${isCanonica ? styles.loadingWrapCanonica : ''}`.trim()}
            data-loader-source={`server-loader-${page || 'app'}`}
            data-loader-brand={brand}
            aria-label={`${brandLabel} is loading`}
        >
            <div className={`${styles.loadingWatermark} ${isCanonica ? styles.loadingWatermarkCanonica : ''}`.trim()} aria-hidden="true">
                {isCanonica
                    ? <CanonicaAnimatedLogo idPrefix="canonica-loader-watermark" />
                    : <AnimatedVerticalLogo showLabel={false} />}
            </div>
            <div className={`${styles.loadingLogo} ${isCanonica ? styles.loadingLogoCanonica : ''}`.trim()} aria-hidden="true">
                {isCanonica
                    ? <CanonicaAnimatedLogo idPrefix="canonica-loader-logo" />
                    : <AnimatedVerticalLogo showLabel={false} />}
            </div>
        </main>
    )
}

export default BrandedPageLoader;
