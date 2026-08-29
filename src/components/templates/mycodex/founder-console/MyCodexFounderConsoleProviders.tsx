import type { Session } from 'next-auth';
import { getLocale } from 'next-intl/server';
import LocalisationProvider from '@providers/localisationProvider';
import NetworkStatusProvider from '@providers/NetworkStatusProvider';
import NoSSRProvider from '@providers/noSSRProvider';
import SessionProvider from '@providers/sessionProvider';
import AntdThemeProvider from '@providers/antdThemeProvider';

interface MyCodexFounderConsoleProvidersProps {
    children: React.ReactNode;
    session: Session;
}

export default async function MyCodexFounderConsoleProviders({
    children,
    session,
}: MyCodexFounderConsoleProvidersProps) {
    const locale = await getLocale();

    return (
        <LocalisationProvider locale={locale}>
            <SessionProvider session={session}>
                <NoSSRProvider>
                    <AntdThemeProvider>
                        <NetworkStatusProvider>{children}</NetworkStatusProvider>
                    </AntdThemeProvider>
                </NoSSRProvider>
            </SessionProvider>
        </LocalisationProvider>
    );
}
