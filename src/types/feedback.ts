import { Timestamp } from 'firebase/firestore';

export interface Feedback {
    id?: string;
    pId?: string; // Canonica ownership is injected by canonicaRequestBodyComposer in DAL
    sId: string | number; // store/workspace ID comes from requestBodyComposer in DAL
    tId: string | number; // tenant ID comes from requestBodyComposer in DAL
    uId: string; // user ID comes from requestBodyComposer in DAL
    type: 'general' | 'feature_usage' | 'feature_requests' | 'feature_request';
    rating?: number;
    comment?: string;
    featureComment?: string;
    featureIssues?: string[];
    featureRequest?: string; // For user's own new feature request
    votedPopularRequests?: { feature: string; interested: boolean }[]; // For voting on existing popular requests
    contextKey?: string | null; // Optional Canonica product surface key for sorting/triage
    surfaceId?: string | null;
    surfaceLabel?: string | null;
    surfaceAssignedBy?: string | null;
    surfaceAssignedAt?: Timestamp | null;
    createdOn: Timestamp; //comes from requestBodyComposer in DAL
}
