import { notFound } from 'next/navigation';
import MyCodexFounderConsoleHome from '@/components/templates/mycodex/founder-console/MyCodexFounderConsoleHome';
import MyCodexFounderConsoleSurfaceView from '@/components/templates/mycodex/founder-console/MyCodexFounderConsoleSurface';
import {
    MyCodexFounderConsoleProductIndex,
    MyCodexFounderConsoleSettings,
    MyCodexFounderConsoleSurfaceIndex,
} from '@/components/templates/mycodex/founder-console/MyCodexFounderConsoleIndex';
import {
    getMyCodexFounderConsoleSurface,
    getMyCodexFounderConsoleVisibleSurfaces,
} from '@lib/mycodex/founderConsoleCatalog';
import { requirePlatformAdminRouteAccess } from '@lib/auth/platformRouteGuard';

export const dynamic = 'force-dynamic';

interface MyCodexOperationsPageProps {
    params: Promise<{ surface?: string[] }>;
}

export default async function MyCodexOperationsPage({ params }: MyCodexOperationsPageProps) {
    // Nested layouts can remain mounted during client navigation. Re-check the
    // current persisted operator record for every operational page request so
    // a revoked role cannot continue moving between console surfaces.
    await requirePlatformAdminRouteAccess();
    const segments = (await params).surface || [];
    const includeDevelopment = process.env.NODE_ENV !== 'production';
    const surfaces = getMyCodexFounderConsoleVisibleSurfaces({ includeDevelopment });

    if (segments.length === 0) return <MyCodexFounderConsoleHome />;

    if (segments.length === 1 && segments[0] === 'products') {
        return <MyCodexFounderConsoleProductIndex products={{
            menulist: surfaces.filter((surface) => surface.product === 'menulist'),
            answerlattice: surfaces.filter((surface) => surface.product === 'answerlattice'),
        }} />;
    }

    if (segments.length === 2 && segments[0] === 'products' && (segments[1] === 'menulist' || segments[1] === 'answerlattice')) {
        const product = segments[1];
        return <MyCodexFounderConsoleSurfaceIndex
            description={product === 'menulist'
                ? 'Customer truth, stores, people, messaging, and platform operations.'
                : 'Access, knowledge, support, governance, conversations, and widget operations.'}
            surfaces={surfaces.filter((surface) => surface.product === product)}
            title={product === 'menulist' ? 'MenuList' : 'Answerlattice'}
        />;
    }

    if (segments.length === 1 && segments[0] === 'systems') {
        return <MyCodexFounderConsoleSurfaceIndex
            description="Portfolio and product systems that need operational verification, not constant watching."
            surfaces={surfaces.filter((surface) => surface.group === 'system' || surface.product === 'shared')}
            title="Systems"
        />;
    }

    if (segments.length === 1 && segments[0] === 'settings') return <MyCodexFounderConsoleSettings />;

    if (segments.length === 2 && segments[0] === 'surface') {
        const surface = getMyCodexFounderConsoleSurface(segments[1], { includeDevelopment });
        if (!surface) notFound();
        return (
            <div className="mycodex-founder-surface-page">
                <div className="mycodex-founder-surface-heading">
                    <span>{surface.product === 'shared' ? 'Portfolio' : surface.product === 'menulist' ? 'MenuList' : 'Answerlattice'}</span>
                    <h1>{surface.title}</h1>
                    <p>{surface.description}</p>
                </div>
                <MyCodexFounderConsoleSurfaceView surface={surface} />
            </div>
        );
    }

    notFound();
}
