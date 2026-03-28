
export interface AiFeedback {
    id?: string;
    reasons: any[];
    comments: string;
    answer: string;
    query: string;
    // Session-related fields that will be added by the DAL
    uId?: string;
    tId?: number;
    sId?: number;
    createdOn?: any; // Should be a server timestamp
    modifiedOn?: any; // Should be a server timestamp
}
