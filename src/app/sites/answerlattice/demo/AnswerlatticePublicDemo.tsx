'use client';

import { useMemo, useState } from 'react';
import AnswerlatticeAssetImage from '../components/AnswerlatticeAssetImage';
import { ANSWERLATTICE_DEMO_SURFACE_ASSETS } from '../answerlatticeWebsiteAssets';

type DemoSurfaceKey = 'billing' | 'onboarding' | 'settings' | 'release';

type DemoSurface = {
    key: DemoSurfaceKey;
    shortLabel: string;
};

const SURFACES: DemoSurface[] = [
    {
        key: 'billing',
        shortLabel: 'Billing',
    },
    {
        key: 'onboarding',
        shortLabel: 'Onboarding',
    },
    {
        key: 'settings',
        shortLabel: 'Team',
    },
    {
        key: 'release',
        shortLabel: 'Release',
    },
];


export default function AnswerlatticePublicDemo() {
    const [surfaceKey, setSurfaceKey] = useState<DemoSurfaceKey>('billing');
    const surface = useMemo(() => SURFACES.find((item) => item.key === surfaceKey) || SURFACES[0], [surfaceKey]);

    return (
        <div className="al-primary-radial-soft-card rounded-[1.75rem] border border-white/[0.08] p-3 shadow-2xl shadow-black/30 sm:p-4">
            <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-2 sm:justify-center">
                {SURFACES.map((item) => {
                    const active = item.key === surfaceKey;
                    return (
                        <button
                            key={item.key}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setSurfaceKey(item.key)}
                            data-answerlattice-event="demo_surface_changed"
                            data-answerlattice-label={item.key}
                            className={`min-w-[8.75rem] rounded-full border px-4 py-2.5 text-left text-sm font-semibold transition sm:min-w-0 sm:text-center ${
                                active
                                    ? 'border-white/25 bg-white/[0.13] text-white shadow-lg shadow-teal-500/10'
                                    : 'border-transparent bg-white/[0.03] text-[#8f8faa] hover:border-white/[0.14] hover:text-white'
                            }`}
                        >
                            {item.shortLabel}
                        </button>
                    );
                })}
            </div>

            <div className="rounded-[1.35rem] border border-white/[0.1] bg-[#101028] p-2 text-white">
                <AnswerlatticeAssetImage
                    asset={ANSWERLATTICE_DEMO_SURFACE_ASSETS[surface.key]}
                    assetSlotId="demo.page-aware-widget"
                    assetRole={surface.key}
                    className="rounded-[1.1rem] border border-white/[0.08]"
                />
            </div>
        </div>
    );
}
