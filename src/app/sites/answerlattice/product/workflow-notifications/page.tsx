import ProductFeatureRoutePage, { buildProductFeatureMetadata } from '../ProductFeatureRoutePage';
import { getAnswerlatticeSupportFeature } from '../../productFeatures';

const feature = getAnswerlatticeSupportFeature('workflow-notifications');

if (!feature) {
    throw new Error('Answerlattice Workflow Notifications feature configuration is missing.');
}

export const metadata = buildProductFeatureMetadata(feature);

export default function AnswerlatticeWorkflowNotificationsFeaturePage() {
    return <ProductFeatureRoutePage feature={feature} />;
}
