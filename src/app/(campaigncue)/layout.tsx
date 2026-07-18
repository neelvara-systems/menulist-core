import { AntdRegistry } from "@ant-design/nextjs-registry";
import { FEATURE_FLAGS } from "@config/features";
import { APP_THEME_COLOR } from "@constant/common";
import { SIGNIN_URL } from "@constant/urls";
import { authOptions } from "@lib/auth";
import { isPlatformEntityBlocked } from "@lib/platform/entityBlock";
import {
    CAMPAIGNCUE_APP_INTERNAL_WORKSPACE_PATH,
    CAMPAIGNCUE_WORKSPACE_PATH,
    isCampaignCueProductHostname,
} from "@constant/campaigncue/domains";
import { buildCampaignCueAuthLaunchUrl } from "@constant/campaigncue/routes";
import GlobalKeyboardShortcutsProvider from "@providers/GlobalKeyboardShortcutsProvider";
import LocalisationProvider from "@providers/localisationProvider";
import NetworkStatusProvider from "@providers/NetworkStatusProvider";
import NoSSRProvider from "@providers/noSSRProvider";
import AntdThemeProvider from "@providers/antdThemeProvider";
import { ReduxStoreProvider } from "@providers/reduxProvider";
import type { Metadata } from "next";
import type { Viewport } from "next";
import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { getLocale } from "next-intl/server";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import SessionExpiryMonitor from "@/components/auth/SessionExpiryMonitor";
import OwnerAppUpdatePrompt from "@/components/common/OwnerAppUpdatePrompt";

export const metadata: Metadata = {
    applicationName: "CampaignCue",
    title: {
        default: "CampaignCue Workspace",
        template: "%s | CampaignCue",
    },
    description: "CampaignCue protected owner workspace",
    robots: {
        index: false,
        follow: false,
    },
};

export const viewport: Viewport = {
    themeColor: APP_THEME_COLOR,
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
};

export default async function CampaignCueAppLayout({ children }: { children: ReactNode }) {
    if (!FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_APP_SHELL) {
        notFound();
    }

    const session = await getServerSession(authOptions);

    if (!session) {
        const host = headers().get("host");
        const callbackUrl = isCampaignCueProductHostname(host)
            ? CAMPAIGNCUE_WORKSPACE_PATH
            : CAMPAIGNCUE_APP_INTERNAL_WORKSPACE_PATH;
        redirect(`${buildCampaignCueAuthLaunchUrl(SIGNIN_URL)}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }

    if (
        session.user?.active === false
        || (session.user as any)?.deleted === true
        || session.user?.isVerified === false
        || isPlatformEntityBlocked(session.user)
    ) {
        redirect("/unauthorized");
    }

    const locale = await getLocale();

    return (
        <AntdRegistry>
            <LocalisationProvider locale={locale}>
                <ReduxStoreProvider>
                    <NextAuthSessionProvider
                        refetchInterval={0}
                        refetchOnWindowFocus={false}
                        session={session}
                    >
                        <NoSSRProvider>
                            <AntdThemeProvider>
                                <SessionExpiryMonitor />
                                <OwnerAppUpdatePrompt />
                                <GlobalKeyboardShortcutsProvider>
                                    <NetworkStatusProvider>
                                        {children}
                                    </NetworkStatusProvider>
                                </GlobalKeyboardShortcutsProvider>
                            </AntdThemeProvider>
                        </NoSSRProvider>
                    </NextAuthSessionProvider>
                </ReduxStoreProvider>
            </LocalisationProvider>
        </AntdRegistry>
    );
}
