export interface BaseDocument {
    id: string;
    createdOn: any;
    modifiedOn: any;
    sId: string; // session id
    tId: string; // tenant id
    uId: string; // user id
}
