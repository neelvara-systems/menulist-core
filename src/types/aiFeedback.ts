
export interface AiFeedback {
    id?: string;
    reasons: unknown[];
    comments: string;
    answer: string;
    query: string;
    // Session-related fields that will be added by the DAL
    uId?: string;
    tId?: number;
    sId?: number;
    createdOn?: unknown;
    modifiedOn?: unknown;
}
