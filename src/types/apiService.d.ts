
interface AXIOS_API_RESPONSE_TYPE<TData = unknown> {
    status: number;
    data: TData;
    message: string;
    apiStatus: boolean;
}

export default AXIOS_API_RESPONSE_TYPE;
