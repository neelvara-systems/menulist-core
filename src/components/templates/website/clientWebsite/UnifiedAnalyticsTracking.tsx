'use client'
import { StoreDataType } from '@type/platform/store';
import { AnalyticsProvider } from './AnalyticsContext';

interface UnifiedAnalyticsTrackingProps {
    storeDetails?: StoreDataType;
    children?: React.ReactNode;
    projectId?: string;  // Required for project-wise analytics
    // T5-N-01: R5 Layer resolution analytics — 'layer1' for claimed-slug match,
    // 'layer2' for /menu universal alias fallback.
    menuResolutionLayer?: 'layer1' | 'layer2';
}

/**
 * Component for unified analytics tracking (Firebase + Google Analytics)
 * This is now a wrapper around AnalyticsProvider to maintain backward compatibility
 */
const UnifiedAnalyticsTracking = ({ storeDetails, children, projectId, menuResolutionLayer }: UnifiedAnalyticsTrackingProps) => {
    return (
        <AnalyticsProvider storeDetails={storeDetails} projectId={projectId} menuResolutionLayer={menuResolutionLayer}>
            {children}
        </AnalyticsProvider>
    )
};

export default UnifiedAnalyticsTracking;


