import type { ReactNode } from 'react';
import { FEATURE_FLAGS } from '@config/features';
import { authOptions } from '@lib/auth';
import { notFound } from 'next/navigation';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import MyCodexFounderConsoleProviders from '@/components/templates/mycodex/founder-console/MyCodexFounderConsoleProviders';
import MyCodexFounderConsoleShell from '@/components/templates/mycodex/founder-console/MyCodexFounderConsoleShell';

export default async function MyCodexOperationsLayout({ children }: { children: ReactNode }) {
    if (!FEATURE_FLAGS.ENABLE_MYCODEX_FOUNDER_CONSOLE) notFound();

    // The parent MyCodex layout already performs the current persisted-role
    // read. Reuse the admitted NextAuth session here so a single navigation
    // does not pay for the same authorization document twice.
    const session = await getServerSession(authOptions);
    if (!session) redirect('/signin?callbackUrl=%2F__mycodex%2Foperations');

    return (
        <MyCodexFounderConsoleProviders session={session}>
            <MyCodexFounderConsoleShell>{children}</MyCodexFounderConsoleShell>
        </MyCodexFounderConsoleProviders>
    );
}
