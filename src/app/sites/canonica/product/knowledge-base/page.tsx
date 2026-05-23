import ProductFeatureRoutePage, { buildProductFeatureMetadata } from '../ProductFeatureRoutePage';
import { getCanonicaSupportFeature } from '../../productFeatures';

const feature = getCanonicaSupportFeature('knowledge-base');

if (!feature) {
    throw new Error('Canonica Knowledge Base feature configuration is missing.');
}

export const metadata = buildProductFeatureMetadata(feature);

export default function CanonicaKnowledgeBaseFeaturePage() {
    return <ProductFeatureRoutePage feature={feature} />;
}
