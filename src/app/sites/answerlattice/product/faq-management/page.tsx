import ProductFeatureRoutePage, { buildProductFeatureMetadata } from '../ProductFeatureRoutePage';
import { getAnswerlatticeSupportFeature } from '../../productFeatures';

const feature = getAnswerlatticeSupportFeature('faq-management');

if (!feature) {
    throw new Error('Answerlattice FAQ Management feature configuration is missing.');
}

export const metadata = buildProductFeatureMetadata(feature);

export default function AnswerlatticeFaqManagementFeaturePage() {
    return <ProductFeatureRoutePage feature={feature} />;
}
