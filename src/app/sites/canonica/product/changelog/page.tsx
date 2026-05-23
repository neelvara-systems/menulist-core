import ProductFeatureRoutePage, { buildProductFeatureMetadata } from '../ProductFeatureRoutePage';
import { getCanonicaSupportFeature } from '../../productFeatures';

const feature = getCanonicaSupportFeature('changelog');

if (!feature) {
    throw new Error('Canonica Changelog feature configuration is missing.');
}

export const metadata = buildProductFeatureMetadata(feature);

export default function CanonicaChangelogFeaturePage() {
    return <ProductFeatureRoutePage feature={feature} />;
}
