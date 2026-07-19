/**
 * Answerlattice — Product Friction Intelligence Hook
 * 
 * SWR hook for GovernanceHub Friction tab.
 * Fetches friction snapshot (nightly) + weekly AI insight in parallel.
 * 
 * Feature-flagged: ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE
 * @see __docs__/answerlattice/product-friction-intelligence/
 */

import { FEATURE_FLAGS } from '@config/features';
import { getFrictionInsight, getFrictionSnapshot } from '@database/answerlattice/frictionStats';
import { AnswerlatticeFrictionInsight, AnswerlatticeFrictionSnapshot } from '@type/answerlattice';
import { useEffect, useState } from 'react';

const ANSWERLATTICE_FRICTION_DATA_LOAD_FAILED = 'Could not load friction data';

interface UseFrictionInsightsReturn {
    snapshot: AnswerlatticeFrictionSnapshot | null;
    insight: AnswerlatticeFrictionInsight | null;
    loading: boolean;
    error: string | null;
    refresh: () => void;
}

export function useFrictionInsights(tId: number, sId: number): UseFrictionInsightsReturn {
    const [snapshot, setSnapshot] = useState<AnswerlatticeFrictionSnapshot | null>(null);
    const [insight, setInsight] = useState<AnswerlatticeFrictionInsight | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE || !tId || !sId) {
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);

        Promise.allSettled([
            getFrictionSnapshot(tId, sId),
            getFrictionInsight(tId, sId),
        ])
            .then(([snapshotResult, insightResult]) => {
                if (cancelled) return;
                if (snapshotResult.status === 'rejected') {
                    setError(ANSWERLATTICE_FRICTION_DATA_LOAD_FAILED);
                    setSnapshot(null);
                } else {
                    setSnapshot(snapshotResult.value);
                }
                setInsight(insightResult.status === 'fulfilled' ? insightResult.value : null);
            })
            .catch(() => {
                if (cancelled) return;
                setError(ANSWERLATTICE_FRICTION_DATA_LOAD_FAILED);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [tId, sId, refreshKey]);

    const refresh = () => setRefreshKey(k => k + 1);

    return { snapshot, insight, loading, error, refresh };
}
