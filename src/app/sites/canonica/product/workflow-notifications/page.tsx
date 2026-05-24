import ProductFeatureRoutePage, { buildProductFeatureMetadata } from '../ProductFeatureRoutePage';
import { getCanonicaSupportFeature } from '../../productFeatures';

const feature = getCanonicaSupportFeature('workflow-notifications');

if (!feature) {
    throw new Error('Canonica Workflow Notifications feature configuration is missing.');
}

export const metadata = buildProductFeatureMetadata(feature);

export default function CanonicaWorkflowNotificationsFeaturePage() {
    return <ProductFeatureRoutePage feature={feature} />;
}
