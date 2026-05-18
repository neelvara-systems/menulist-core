import { UserDataType } from "./platform/user";
import type { ProductId } from "@constant/product";


interface LoginUserType {
    user: UserDataType,
    tId: number,
    sId: number,
    uId: string,
    pId?: ProductId,
    role: string,
    platformRole: string,
    expires: Date
}

export default LoginUserType;
