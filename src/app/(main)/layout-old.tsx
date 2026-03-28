import getActiveSession from "@lib/auth/getActiveSession";
import { redirect } from "next/navigation";

const WithLayout = async ({ children }) => {

    const session = await getActiveSession();
    if (!Boolean(session)) {
        redirect("/signin")
    }

    return (
        <>
            {children}
        </>
    )
}

export default WithLayout