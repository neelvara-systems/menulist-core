'use client';

import { FEATURE_FLAGS } from "@config/features";
import ResellerDashboard from "@template/main-app/reseller/ResellerDashboard";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { Spin, Flex } from "antd";

export default function ResellerPage() {
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
    if (platformRole !== 'RESELLER' && platformRole !== 'PLATFORM') {
        redirect('/dashboard');
    }

    return <ResellerDashboard />;
}
