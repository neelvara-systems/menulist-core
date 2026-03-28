import LoginUserType from "@type/loginUser";

const getActiveSession = async () => {
    let session: any = null;
    if (typeof window === 'undefined') {
        // Server-side
        const { getServerSession: sessionGetter } = await import("next-auth");
        const { authOptions } = await import(".")
        session = await sessionGetter(authOptions);
    } else {
        // Client-side
        const { getSession: sessionGetter } = await import('next-auth/react');
        session = await sessionGetter();
    }
    const sessionWithType: LoginUserType = session;
    return sessionWithType;
};

export default getActiveSession;