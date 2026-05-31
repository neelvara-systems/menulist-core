import ProductFeatureRoutePage, { buildProductFeatureMetadata } from '../ProductFeatureRoutePage';
import { getAnswerlatticeSupportFeature } from '../../productFeatures';

const feature = getAnswerlatticeSupportFeature('support-board');

if (!feature) {
    throw new Error('Answerlattice Support Board feature configuration is missing.');
}

export const metadata = buildProductFeatureMetadata(feature);

export default function AnswerlatticeSupportBoardFeaturePage() {
    return <ProductFeatureRoutePage feature={feature} />;
}
