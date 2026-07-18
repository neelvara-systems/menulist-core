import { AntdRegistry } from "@ant-design/nextjs-registry";
import { FEATURE_FLAGS } from "@config/features";
import {
    SIGNALDESK_BASE_PATH,
    SIGNALDESK_MENULIST_DIGITAL_ALIAS_PATH,
} from "@constant/signaldesk/routes";
import { authOptions } from "@lib/auth";
import { isPlatformEntityBlocked } from "@lib/platform/entityBlock";
import { getSignalDeskAccessContext } from "@lib/signaldesk/access";
import AntdThemeProvider from "@providers/antdThemeProvider";
import LocalisationProvider from "@providers/localisationProvider";
import NoSSRProvider from "@providers/noSSRProvider";
import { ReduxStoreProvider } from "@providers/reduxProvider";
import type { Metadata, Viewport } from "next";
import { getServerSession } from "next-auth";
import { getLocale } from "next-intl/server";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import SignalDeskSessionProvider from "@/components/signaldesk/SignalDeskSessionProvider";

export const metadata: Metadata = {
    applicationName: "MenuList SignalDesk",
    title: "Sign in | MenuList SignalDesk",
    description: "Private MenuList SignalDesk authentication",
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

function getSignalDeskBasePath(): string {
    return headers().get("x-product-base-path") === SIGNALDESK_MENULIST_DIGITAL_ALIAS_PATH
        ? SIGNALDESK_MENULIST_DIGITAL_ALIAS_PATH
        : SIGNALDESK_BASE_PATH;
}

export default async function SignalDeskSigninLayout({ children }: { children: ReactNode }) {
    if (!FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_APP_SHELL) {
        notFound();
    }

    const session = await getServerSession(authOptions);
    if (session) {
        if (
            session.user?.active === false
            || (session.user as any)?.deleted === true
            || session.user?.isVerified === false
            || isPlatformEntityBlocked(session.user)
        ) {
            redirect("/unauthorized");
        }

        const access = await getSignalDeskAccessContext(session);
        redirect(access?.active ? getSignalDeskBasePath() : "/unauthorized");
    }

    const locale = await getLocale();

    return (
        <AntdRegistry>
            <LocalisationProvider locale={locale}>
                <ReduxStoreProvider>
                    <SignalDeskSessionProvider session={null}>
                        <NoSSRProvider>
                            <AntdThemeProvider>{children}</AntdThemeProvider>
                        </NoSSRProvider>
                    </SignalDeskSessionProvider>
                </ReduxStoreProvider>
            </LocalisationProvider>
        </AntdRegistry>
    );
}
