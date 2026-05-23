import ProductFeatureRoutePage, { buildProductFeatureMetadata } from '../ProductFeatureRoutePage';
import { getCanonicaSupportFeature } from '../../productFeatures';

const feature = getCanonicaSupportFeature('faq-management');

if (!feature) {
    throw new Error('Canonica FAQ Management feature configuration is missing.');
}

export const metadata = buildProductFeatureMetadata(feature);

export default function CanonicaFaqManagementFeaturePage() {
    return <ProductFeatureRoutePage feature={feature} />;
}
