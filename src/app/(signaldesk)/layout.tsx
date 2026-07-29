import { AntdRegistry } from "@ant-design/nextjs-registry";
import { FEATURE_FLAGS } from "@config/features";
import {
    SIGNALDESK_BASE_PATH,
    SIGNALDESK_SHORT_ALIAS_PATH,
} from "@constant/signaldesk/routes";
import { authOptions } from "@lib/auth";
import { resolveCurrentSessionUserDocumentId } from "@lib/auth/currentPlatformUser";
import { isPlatformEntityBlocked } from "@lib/platform/entityBlock";
import { getSignalDeskAccessContext } from "@lib/signaldesk/access";
import LocalisationProvider from "@providers/localisationProvider";
import NetworkStatusProvider from "@providers/NetworkStatusProvider";
import NoSSRProvider from "@providers/noSSRProvider";
import { ReduxStoreProvider } from "@providers/reduxProvider";
import AntdThemeProvider from "@providers/antdThemeProvider";
import type { Metadata, Viewport } from "next";
import { getServerSession } from "next-auth";
import { getLocale } from "next-intl/server";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import SessionExpiryMonitor from "@/components/auth/SessionExpiryMonitor";
import SignalDeskPathProvider from "@/components/signaldesk/SignalDeskPathProvider";
import SignalDeskSessionProvider from "@/components/signaldesk/SignalDeskSessionProvider";

export const metadata: Metadata = {
    applicationName: "MenuList SignalDesk",
    title: {
        default: "MenuList SignalDesk",
        template: "%s | MenuList SignalDesk",
    },
    description: "Private MenuList growth control room",
    robots: {
        index: false,
        follow: false,
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
};

async function getSignalDeskBasePath(): Promise<string> {
    const basePath = (await headers()).get("x-product-base-path");
    return basePath === SIGNALDESK_SHORT_ALIAS_PATH
        ? SIGNALDESK_SHORT_ALIAS_PATH
        : SIGNALDESK_BASE_PATH;
}

function getSignalDeskSigninPath(basePath: string): string {
    return basePath === SIGNALDESK_SHORT_ALIAS_PATH
        ? `${SIGNALDESK_SHORT_ALIAS_PATH}/signin`
        : `${SIGNALDESK_BASE_PATH}/signin`;
}

export default async function SignalDeskLayout({ children }: { children: ReactNode }) {
    if (!FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_APP_SHELL) {
        notFound();
    }

    const basePath = await getSignalDeskBasePath();
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect(`${getSignalDeskSigninPath(basePath)}?callbackUrl=${encodeURIComponent(basePath)}`);
    }

    if (
        !resolveCurrentSessionUserDocumentId(session) ||
        session.user?.active === false
        || session.user?.deleted === true
        || session.user?.isVerified === false
        || isPlatformEntityBlocked(session.user)
    ) {
        redirect("/unauthorized");
    }

    const access = await getSignalDeskAccessContext(session);
    if (!access?.active) {
        redirect("/unauthorized");
    }

    const locale = await getLocale();

    return (
        <AntdRegistry>
            <LocalisationProvider locale={locale}>
                <ReduxStoreProvider>
                    <SignalDeskSessionProvider session={session}>
                        <NoSSRProvider>
                            <AntdThemeProvider>
                                <SessionExpiryMonitor />
                                <NetworkStatusProvider>
                                    <SignalDeskPathProvider basePath={basePath}>
                                        {children}
                                    </SignalDeskPathProvider>
                                </NetworkStatusProvider>
                            </AntdThemeProvider>
                        </NoSSRProvider>
                    </SignalDeskSessionProvider>
                </ReduxStoreProvider>
            </LocalisationProvider>
        </AntdRegistry>
    );
}
