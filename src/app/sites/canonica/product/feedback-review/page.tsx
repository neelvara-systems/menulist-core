import ProductFeatureRoutePage, { buildProductFeatureMetadata } from '../ProductFeatureRoutePage';
import { getCanonicaSupportFeature } from '../../productFeatures';

const feature = getCanonicaSupportFeature('feedback-review');

if (!feature) {
    throw new Error('Canonica Feedback Review feature configuration is missing.');
}

export const metadata = buildProductFeatureMetadata(feature);

export default function CanonicaFeedbackReviewFeaturePage() {
    return <ProductFeatureRoutePage feature={feature} />;
}
