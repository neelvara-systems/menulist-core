'use client';

import { FEATURE_FLAGS } from "@config/features";
import ResellerManagement from "@template/main-app/reseller/ResellerManagement";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { Spin, Flex } from "antd";

/**
 * Reseller Management Page — Platform Admin Only
 * 
 * This page is ONLY for the founder/platform admin to manage reseller profiles.
 * Resellers themselves access /reseller (not /reseller/manage).
 * Protected by PLATFORM role checks on the page and backing APIs.
 */
export default function ResellerManagePage() {
    const { data: session, status } = useSession();

    if (status === 'loading') {
        return (
            <Flex justify="center" align="center" style={{ minHeight: '100vh' }}>
                <Spin size="large" />
            </Flex>
        );
    }

    if (!FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD) {
        redirect('/dashboard');
    }

    const platformRole = session?.platformRole || session?.user?.platformRole;
    if (platformRole !== 'PLATFORM') {
        // The parent reseller layout already admits only PLATFORM or RESELLER.
        // A non-platform account reaching this client boundary is therefore a
        // reseller and should return to its own dashboard, not the owner shell.
        redirect('/reseller');
    }

    return <ResellerManagement />;
}
