import { axiosClient } from "@axiosClient/axiosClient";
import { logAuthFailure } from "@lib/auth/authDiagnostics";
import { getBoundedErrorNumberAtPath, getUnknownObjectValueAtPath } from '@lib/monitoring/boundedLogContext';

const getAxiosResponseData = (error: unknown): unknown => (
    getUnknownObjectValueAtPath(error, ['response', 'data']) ?? error
);
const getAxiosResponseStatus = (error: unknown): number | undefined => (
    getBoundedErrorNumberAtPath(error, ['response', 'status'])
);

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
