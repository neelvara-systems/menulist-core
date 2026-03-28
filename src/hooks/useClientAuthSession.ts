import LoginUserType from "@type/loginUser";
import { useSession } from "next-auth/react";

//used only for pure react components
export function useClientAuthSession() {
    const { data, status }: any = useSession();
    
    // Return null while loading to prevent using undefined session
    if (status === 'loading') {
        return null;
    }
    
    const sessionWithType: LoginUserType = data;
    return sessionWithType;
}

// useSession() == {
//     "data": {
//         "user": {
//             "name": "Garudkar Dnyaneshwar",
//             "email": "garudkardnyaneshwar@gmail.com",
//             "image": "https://lh3.googleusercontent.com/a/ACg8ocKuO3UBIWlel46UxuI7fui1ye0pN8kwnSBHWVivEOd-3m8=s96-c",
//             "id": "EAI4884"
//         },
//         "expires": "2024-08-06T18:51:09.355Z",
//         "tId": 0,
//         "sId": 0,
//         "role": "PLATFORM",
//         "uId": "EAI4884"
//     },
//     "status": "authenticated"
// }