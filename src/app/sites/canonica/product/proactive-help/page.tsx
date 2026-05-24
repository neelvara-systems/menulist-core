import ProductFeatureRoutePage, { buildProductFeatureMetadata } from '../ProductFeatureRoutePage';
import { getCanonicaSupportFeature } from '../../productFeatures';

const feature = getCanonicaSupportFeature('proactive-help');

if (!feature) {
    throw new Error('Canonica Proactive Help feature configuration is missing.');
}

export const metadata = buildProductFeatureMetadata(feature);

export default function CanonicaProactiveHelpFeaturePage() {
    return <ProductFeatureRoutePage feature={feature} />;
}
