'use client';

import { FEATURE_FLAGS } from "@config/features";
import OnboardingWizard from "@template/main-app/reseller/OnboardingWizard";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { Spin, Flex } from "antd";

export default function ResellerOnboardPage() {
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

    const platformRole = (session as any)?.platformRole;
    if (platformRole !== 'RESELLER' && platformRole !== 'PLATFORM') {
        redirect('/dashboard');
    }

    return <OnboardingWizard />;
}
