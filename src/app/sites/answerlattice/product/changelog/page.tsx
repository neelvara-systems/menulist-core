import ProductFeatureRoutePage, { buildProductFeatureMetadata } from '../ProductFeatureRoutePage';
import { getAnswerlatticeSupportFeature } from '../../productFeatures';

const feature = getAnswerlatticeSupportFeature('changelog');

if (!feature) {
    throw new Error('Answerlattice Changelog feature configuration is missing.');
}

export const metadata = buildProductFeatureMetadata(feature);

export default function AnswerlatticeChangelogFeaturePage() {
    return <ProductFeatureRoutePage feature={feature} />;
}
