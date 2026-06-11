import AnimatedVerticalLogo from '@atoms/animatedVerticalLogo';
import AnswerlatticeLoaderLogo from '@atoms/answerlatticeLoaderLogo';
import CampaignCueLoaderLogo from '@atoms/campaignCueLoaderLogo';
import styles from '@/app/page.module.css';

export type BrandedPageLoaderBrand = 'menulist' | 'answerlattice' | 'campaigncue';

function BrandedPageLoader({
    page,
    brand = 'menulist',
}: {
    page?: string;
    brand?: BrandedPageLoaderBrand;
}) {
    const isAnswerlattice = brand === 'answerlattice';
    const isCampaignCue = brand === 'campaigncue';
    const brandLabel = isAnswerlattice ? 'Answerlattice' : isCampaignCue ? 'CampaignCue' : 'MenuList';
    const loadingWrapClassName = [
        styles.loadingWrap,
        isAnswerlattice ? styles.loadingWrapAnswerlattice : '',
        isCampaignCue ? styles.loadingWrapCampaigncue : '',
    ].filter(Boolean).join(' ');
    const loadingWatermarkClassName = [
        styles.loadingWatermark,
        isAnswerlattice ? styles.loadingWatermarkAnswerlattice : '',
        isCampaignCue ? styles.loadingWatermarkCampaigncue : '',
    ].filter(Boolean).join(' ');
    const loadingLogoClassName = [
        styles.loadingLogo,
        isAnswerlattice ? styles.loadingLogoAnswerlattice : '',
        isCampaignCue ? styles.loadingLogoCampaigncue : '',
    ].filter(Boolean).join(' ');
    const logo = isAnswerlattice
        ? <AnswerlatticeLoaderLogo idPrefix="answerlattice-loader-logo" />
        : isCampaignCue
            ? <CampaignCueLoaderLogo idPrefix="campaigncue-loader-logo" />
            : <AnimatedVerticalLogo showLabel={false} />;
    const watermarkLogo = isAnswerlattice
        ? <AnswerlatticeLoaderLogo idPrefix="answerlattice-loader-watermark" />
        : isCampaignCue
            ? <CampaignCueLoaderLogo idPrefix="campaigncue-loader-watermark" />
            : <AnimatedVerticalLogo showLabel={false} />;

    return (
        <main
            className={loadingWrapClassName}
            data-loader-source={`server-loader-${page || 'app'}`}
            data-loader-brand={brand}
            aria-label={`${brandLabel} is loading`}
        >
            <div className={loadingWatermarkClassName} aria-hidden="true">
                {watermarkLogo}
            </div>
            <div className={loadingLogoClassName} aria-hidden="true">
                {logo}
            </div>
        </main>
    )
}

export default BrandedPageLoader;
