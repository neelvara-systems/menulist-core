import ProductFeatureRoutePage, { buildProductFeatureMetadata } from '../ProductFeatureRoutePage';
import { getAnswerlatticeSupportFeature } from '../../productFeatures';

const feature = getAnswerlatticeSupportFeature('knowledge-base');

if (!feature) {
    throw new Error('Answerlattice Knowledge Base feature configuration is missing.');
}

export const metadata = buildProductFeatureMetadata(feature);

export default function AnswerlatticeKnowledgeBaseFeaturePage() {
    return <ProductFeatureRoutePage feature={feature} />;
}
