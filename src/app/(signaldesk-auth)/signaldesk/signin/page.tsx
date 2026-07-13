import SignalDeskSignin from "@/components/signaldesk/SignalDeskSignin";
import type { Metadata } from "next";
import { Suspense } from "react";
import ServerSidePageLoader from "src/app/loading";

export const metadata: Metadata = {
    title: "Sign in | MenuList SignalDesk",
    description: "Sign in to the private MenuList SignalDesk control room.",
    robots: {
        index: false,
        follow: false,
    },
};

export default function SignalDeskSigninPage() {
    return (
        <Suspense fallback={<ServerSidePageLoader page="SignalDesk sign in" />}>
            <SignalDeskSignin />
        </Suspense>
    );
}
