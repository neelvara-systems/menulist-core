'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { PlatformInternalScreenKey } from '@/components/mobile/screens/MobilePlatformInternalScreen';
import type { MyCodexFounderConsoleSurface } from '@lib/mycodex/founderConsoleCatalog';
import { MYCODEX_FOUNDER_CONSOLE_BASE_PATH } from '@lib/mycodex/founderConsoleCatalog';

const PlatformInternalScreen = dynamic(() => import('@/components/mobile/screens/MobilePlatformInternalScreen'), { ssr: false });
const MobileOpsControlRoomScreen = dynamic(() => import('@/components/mobile/screens/MobileOpsControlRoomScreen'), { ssr: false });
const MobileSchedulerMonitorScreen = dynamic(() => import('@/components/mobile/screens/MobileSchedulerMonitorScreen'), { ssr: false });
const MobileExtractionMonitorScreen = dynamic(() => import('@/components/mobile/screens/MobileExtractionMonitorScreen'), { ssr: false });
const TestSentryPage = dynamic(() => import('@/components/pages/TestSentryPage'), { ssr: false });

const DESKTOP_SCREEN_KEYS: Record<'mobile-ops' | 'mobile-scheduler' | 'mobile-extraction', PlatformInternalScreenKey> = {
    'mobile-ops': 'opsControlRoom',
    'mobile-scheduler': 'schedulerMonitor',
    'mobile-extraction': 'extractionMonitor',
};

function useIsPhone(): boolean | null {
    const [isPhone, setIsPhone] = useState<boolean | null>(null);
    useEffect(() => {
        const query = window.matchMedia('(max-width: 767px)');
        const update = () => setIsPhone(query.matches);
        update();
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);
    return isPhone;
}

export default function MyCodexFounderConsoleSurfaceView({ surface }: { surface: MyCodexFounderConsoleSurface }) {
    const router = useRouter();
    const isPhone = useIsPhone();
    const backPath = surface.product === 'shared'
        ? `${MYCODEX_FOUNDER_CONSOLE_BASE_PATH}/systems`
        : `${MYCODEX_FOUNDER_CONSOLE_BASE_PATH}/products/${surface.product}`;
    const onBack = () => router.push(backPath);

    if (surface.renderer === 'sentry') return <TestSentryPage />;
    if (isPhone === null) return <div className="mycodex-founder-loading">Loading {surface.title}…</div>;

    if (isPhone && surface.renderer === 'mobile-ops') return <MobileOpsControlRoomScreen onBack={onBack} />;
    if (isPhone && surface.renderer === 'mobile-scheduler') return <MobileSchedulerMonitorScreen onBack={onBack} />;
    if (isPhone && surface.renderer === 'mobile-extraction') return <MobileExtractionMonitorScreen onBack={onBack} />;

    const screen = surface.renderer === 'platform-internal'
        ? surface.screenKey as PlatformInternalScreenKey
        : DESKTOP_SCREEN_KEYS[surface.renderer];

    return (
        <div className="mycodex-founder-embedded-surface" data-product={surface.product}>
            <PlatformInternalScreen
                allowDesktopEscape={false}
                onBack={onBack}
                screen={screen}
                showHeader={false}
            />
        </div>
    );
}
