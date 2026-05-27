import ProductFeatureRoutePage, { buildProductFeatureMetadata } from '../ProductFeatureRoutePage';
import { getCanonicaSupportFeature } from '../../productFeatures';

const feature = getCanonicaSupportFeature('support-board');

if (!feature) {
    throw new Error('Canonica Support Board feature configuration is missing.');
}

export const metadata = buildProductFeatureMetadata(feature);

export default function CanonicaSupportBoardFeaturePage() {
    return <ProductFeatureRoutePage feature={feature} />;
}
