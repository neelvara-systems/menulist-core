"use client";

import { SessionProvider } from "next-auth/react";
import React from "react";

interface WebsiteAuthProviderProps {
    children: React.ReactNode;
}

export default function WebsiteAuthProvider({ children }: WebsiteAuthProviderProps) {
    return <SessionProvider>{children}</SessionProvider>;
}