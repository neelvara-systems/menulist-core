import ProductFeatureRoutePage, { buildProductFeatureMetadata } from '../ProductFeatureRoutePage';
import { getCanonicaSupportFeature } from '../../productFeatures';

const feature = getCanonicaSupportFeature('knowledge-intake');

if (!feature) {
    throw new Error('Canonica Knowledge Intake feature configuration is missing.');
}

export const metadata = buildProductFeatureMetadata(feature);

export default function CanonicaKnowledgeIntakeFeaturePage() {
    return <ProductFeatureRoutePage feature={feature} />;
}
