import { axiosClient } from "@axiosClient/axiosClient";
import { logAuthFailure } from "@lib/auth/authDiagnostics";

const getAxiosResponseData = (error: any) => error?.response?.data ?? error;
const getAxiosResponseStatus = (error: any): number | undefined => {
    const status = Number(error?.response?.status);
    return Number.isFinite(status) ? status : undefined;
};

export const getUserByCredentials = (userDetails: any) => {
    return new Promise((res, rej) => {
        axiosClient.POST(`/api/user/login`, userDetails)
            .then((response) => {
                res(response.data);
            }).catch(function (error) {
                logAuthFailure('internal_user_login_failed', error, {
                    responseStatus: getAxiosResponseStatus(error),
                });
                rej(getAxiosResponseData(error));
            });
    })
}

export const getUserByToken = () => {
    return new Promise((res, rej) => {
        axiosClient.GET(`/api/user/userByToken`)
            .then((response) => {
                res(response.data);
            }).catch(function (error) {
                logAuthFailure('internal_user_token_lookup_failed', error, {
                    responseStatus: getAxiosResponseStatus(error),
                });
                rej(error);
            });
    })
}
