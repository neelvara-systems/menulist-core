import ProductFeatureRoutePage, { buildProductFeatureMetadata } from '../ProductFeatureRoutePage';
import { getAnswerlatticeSupportFeature } from '../../productFeatures';

const feature = getAnswerlatticeSupportFeature('feedback-review');

if (!feature) {
    throw new Error('Answerlattice Feedback Review feature configuration is missing.');
}

export const metadata = buildProductFeatureMetadata(feature);

export default function AnswerlatticeFeedbackReviewFeaturePage() {
    return <ProductFeatureRoutePage feature={feature} />;
}
