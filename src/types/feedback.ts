import { Timestamp } from 'firebase/firestore';

export interface Feedback {
    id?: string;
    sId: string; //storeId comes from requestBodyComposer in DAL
    tId: string; //tenantId comes from requestBodyComposer in DAL
    uId: string; //userId comes from requestBodyComposer in DAL
    type: 'general' | 'feature_usage' | 'feature_request';
    rating?: number;
    comment?: string;
    featureComment?: string;
    featureIssues?: string[];
    featureRequest?: string; // For user's own new feature request
    votedPopularRequests?: { feature: string; interested: boolean }[]; // For voting on existing popular requests
    createdOn: Timestamp; //comes from requestBodyComposer in DAL
}
