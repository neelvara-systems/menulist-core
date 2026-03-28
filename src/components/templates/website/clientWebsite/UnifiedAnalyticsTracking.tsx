'use client'
import { StoreDataType } from '@type/platform/store';
import { AnalyticsProvider } from './AnalyticsContext';

interface UnifiedAnalyticsTrackingProps {
    storeDetails?: StoreDataType;
    children?: React.ReactNode;
    projectId?: string;  // Required for project-wise analytics
}

/**
 * Component for unified analytics tracking (Firebase + Google Analytics)
 * This is now a wrapper around AnalyticsProvider to maintain backward compatibility
 */
const UnifiedAnalyticsTracking = ({ storeDetails, children, projectId }: UnifiedAnalyticsTrackingProps) => {
    return (
        <AnalyticsProvider storeDetails={storeDetails} projectId={projectId}>
            {children}
        </AnalyticsProvider>
    )
};

export default UnifiedAnalyticsTracking;


