export interface BaseDocument {
    id: string;
    createdOn: unknown;
    modifiedOn: unknown;
    sId: string; // session id
    tId: string; // tenant id
    uId: string; // user id
}
