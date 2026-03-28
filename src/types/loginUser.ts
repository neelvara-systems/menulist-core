import { UserDataType } from "./platform/user";


interface LoginUserType {
    user: UserDataType,
    tId: number,
    sId: number,
    uId: string,
    role: string,
    platformRole: string,
    expires: Date
}

export default LoginUserType;