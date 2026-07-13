"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export default function SignalDeskSessionProvider({
    children,
    session,
}: {
    children: ReactNode;
    session: Session | null;
}) {
    return (
        <SessionProvider
            refetchInterval={0}
            refetchOnWindowFocus={false}
            session={session}
        >
            {children}
        </SessionProvider>
    );
}
