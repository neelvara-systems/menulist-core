import ProductFeatureRoutePage, { buildProductFeatureMetadata } from '../ProductFeatureRoutePage';
import { getAnswerlatticeSupportFeature } from '../../productFeatures';

const feature = getAnswerlatticeSupportFeature('knowledge-intake');

if (!feature) {
    throw new Error('Answerlattice Knowledge Intake feature configuration is missing.');
}

export const metadata = buildProductFeatureMetadata(feature);

export default function AnswerlatticeKnowledgeIntakeFeaturePage() {
    return <ProductFeatureRoutePage feature={feature} />;
}
