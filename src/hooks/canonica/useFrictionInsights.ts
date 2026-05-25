/**
 * Canonica — Product Friction Intelligence Hook
 * 
 * SWR hook for GovernanceHub Friction tab.
 * Fetches friction snapshot (nightly) + weekly AI insight in parallel.
 * 
 * Feature-flagged: ENABLE_CANONICA_FRICTION_INTELLIGENCE
 * @see __docs__/canonica/product-friction-intelligence/
 */

import { FEATURE_FLAGS } from '@config/features';
import { getFrictionInsight, getFrictionSnapshot } from '@database/canonica/frictionStats';
import { getCanonicaUiErrorMessage } from '@lib/canonica/uiErrors';
import { CanonicaFrictionInsight, CanonicaFrictionSnapshot } from '@type/canonica';
import { useEffect, useState } from 'react';

interface UseFrictionInsightsReturn {
    snapshot: CanonicaFrictionSnapshot | null;
    insight: CanonicaFrictionInsight | null;
    loading: boolean;
    error: string | null;
    refresh: () => void;
}

export function useFrictionInsights(tId: number, sId: number): UseFrictionInsightsReturn {
    const [snapshot, setSnapshot] = useState<CanonicaFrictionSnapshot | null>(null);
    const [insight, setInsight] = useState<CanonicaFrictionInsight | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        if (!FEATURE_FLAGS.ENABLE_CANONICA_FRICTION_INTELLIGENCE || !tId || !sId) {
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);

        Promise.all([
            getFrictionSnapshot(tId, sId),
            getFrictionInsight(tId, sId),
        ])
            .then(([snapshotData, insightData]) => {
                if (cancelled) return;
                setSnapshot(snapshotData);
                setInsight(insightData);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(getCanonicaUiErrorMessage(err, 'Could not load friction data'));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [tId, sId, refreshKey]);

    const refresh = () => setRefreshKey(k => k + 1);

    return { snapshot, insight, loading, error, refresh };
}
