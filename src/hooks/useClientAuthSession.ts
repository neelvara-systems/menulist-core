import LoginUserType from "@type/loginUser";
import { getCanonicaScopedSession, isCanonicaRuntimeRoute } from "@lib/canonica/sessionScope";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

//used only for pure react components
export function useClientAuthSession() {
    const { data, status }: any = useSession();
    const pathname = usePathname();
    
    // Return null while loading to prevent using undefined session
    if (status === 'loading') {
        return null;
    }
    
    const hostname = typeof window === 'undefined' ? undefined : window.location.hostname;
    const sessionWithType: LoginUserType = isCanonicaRuntimeRoute(pathname, hostname)
        ? getCanonicaScopedSession(data)
        : data;
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
