import ProductFeatureRoutePage, { buildProductFeatureMetadata } from '../ProductFeatureRoutePage';
import { getAnswerlatticeSupportFeature } from '../../productFeatures';

const feature = getAnswerlatticeSupportFeature('proactive-help');

if (!feature) {
    throw new Error('AnswerLattice Proactive Help feature configuration is missing.');
}

export const metadata = buildProductFeatureMetadata(feature);

export default function AnswerlatticeProactiveHelpFeaturePage() {
    return <ProductFeatureRoutePage feature={feature} />;
}
