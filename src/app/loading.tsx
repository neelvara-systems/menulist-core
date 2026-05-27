import AnimatedVerticalLogo from '@atoms/animatedVerticalLogo';
import CanonicaAnimatedLogo from '@atoms/canonicaAnimatedLogo';
import { headers } from 'next/headers';
import styles from './page.module.css';

export type ServerSidePageLoaderBrand = 'menulist' | 'canonica';

function getRequestLoaderBrand(): ServerSidePageLoaderBrand {
    try {
        const h = headers();
        return h.get('x-product-id') === 'canonica' ? 'canonica' : 'menulist';
    } catch {
        return 'menulist';
    }
}

function ServerSidePageLoader({
    page,
    brand,
}: {
    page?: string;
    brand?: ServerSidePageLoaderBrand;
}) {
    const resolvedBrand = brand || getRequestLoaderBrand();
    const isCanonica = resolvedBrand === 'canonica';
    const brandLabel = isCanonica ? 'Canonica' : 'MenuList';

    return (
        <main
            className={`${styles.loadingWrap} ${isCanonica ? styles.loadingWrapCanonica : ''}`.trim()}
            data-loader-source={`server-loader-${page || 'app'}`}
            data-loader-brand={resolvedBrand}
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

export default ServerSidePageLoader
