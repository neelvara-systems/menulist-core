import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
// const fs = require('fs'); 
// import * as fs from 'fs';


// axios.defaults.headers.common.Accept = 'application/json';
// axios.defaults.timeout = 12000;

const getAxiosConfig = (config: AxiosRequestConfig = {}): AxiosRequestConfig => {
    return config;
};

const GET = (path: string, config: AxiosRequestConfig = {}): Promise<AxiosResponse> =>
    axios.get(path, getAxiosConfig(config));

const DELETE = (path: string, config: AxiosRequestConfig = {}): Promise<AxiosResponse> =>
    axios.delete(path, getAxiosConfig(config));

const POST = (path: string, data: any, config: AxiosRequestConfig = {}): Promise<AxiosResponse> =>
    axios.post(path, data, getAxiosConfig(config));

const PUT = (path: string, data: any, config: AxiosRequestConfig = {}): Promise<AxiosResponse> =>
    axios.put(path, data, getAxiosConfig(config));

const PATCH = (path: string, data: any, config: AxiosRequestConfig = {}): Promise<AxiosResponse> =>
    axios.patch(path, data, getAxiosConfig(config));

export const axiosClient = { GET, DELETE, POST, PUT, PATCH };
