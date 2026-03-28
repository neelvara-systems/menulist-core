import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
// const fs = require('fs'); 
// import * as fs from 'fs';


// axios.defaults.headers.common.Accept = 'application/json';
// axios.defaults.timeout = 12000;

const getHttpHeaders = (headers: any = {}): AxiosRequestConfig => {
    return headers;
};

const GET = (path: string, headers: any = {}): Promise<AxiosResponse> =>
    axios.get(path, getHttpHeaders(headers));

const DELETE = (path: string, headers: any = {}): Promise<AxiosResponse> =>
    axios.delete(path, getHttpHeaders(headers));

const POST = (path: string, data: any, headers: any = {}): Promise<AxiosResponse> =>
    axios.post(path, data, getHttpHeaders(headers));

const PUT = (path: string, data: any, headers: any = {}): Promise<AxiosResponse> =>
    axios.put(path, data, getHttpHeaders(headers));

const PATCH = (path: string, data: any, headers: any = {}): Promise<AxiosResponse> =>
    axios.post(path, data, getHttpHeaders(headers));

export const axiosClient = { GET, DELETE, POST, PUT, PATCH };
