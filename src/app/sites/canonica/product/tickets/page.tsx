import ProductFeatureRoutePage, { buildProductFeatureMetadata } from '../ProductFeatureRoutePage';
import { getCanonicaSupportFeature } from '../../productFeatures';

const feature = getCanonicaSupportFeature('tickets');

if (!feature) {
    throw new Error('Canonica Tickets feature configuration is missing.');
}

export const metadata = buildProductFeatureMetadata(feature);

export default function CanonicaTicketsFeaturePage() {
    return <ProductFeatureRoutePage feature={feature} />;
}
