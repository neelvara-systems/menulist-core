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
import {
    AnswerlatticeFrictionInsightsLoadState,
    EMPTY_ANSWERLATTICE_FRICTION_INSIGHTS_STATE,
    getAnswerlatticeFrictionScopeKey,
    projectFrictionInsightsStateForScope,
} from './frictionInsightsScopeState';

const ANSWERLATTICE_FRICTION_DATA_LOAD_FAILED = 'Could not load friction data';

interface UseFrictionInsightsReturn {
    snapshot: AnswerlatticeFrictionSnapshot | null;
    insight: AnswerlatticeFrictionInsight | null;
    loading: boolean;
    error: string | null;
    refresh: () => void;
}

export function useFrictionInsights(tId: number, sId: number): UseFrictionInsightsReturn {
    const [state, setState] = useState<AnswerlatticeFrictionInsightsLoadState>(
        EMPTY_ANSWERLATTICE_FRICTION_INSIGHTS_STATE,
    );
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const scopeKey = FEATURE_FLAGS.ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE
            ? getAnswerlatticeFrictionScopeKey(tId, sId)
            : null;
        if (!scopeKey) {
            setState(EMPTY_ANSWERLATTICE_FRICTION_INSIGHTS_STATE);
            return;
        }

        let cancelled = false;
        setState({ scopeKey, snapshot: null, insight: null, loading: true, error: null });

        Promise.allSettled([
            getFrictionSnapshot(tId, sId),
            getFrictionInsight(tId, sId),
        ])
            .then(([snapshotResult, insightResult]) => {
                if (cancelled) return;
                setState({
                    scopeKey,
                    snapshot: snapshotResult.status === 'fulfilled' ? snapshotResult.value : null,
                    insight: insightResult.status === 'fulfilled' ? insightResult.value : null,
                    loading: false,
                    error: snapshotResult.status === 'rejected'
                        ? ANSWERLATTICE_FRICTION_DATA_LOAD_FAILED
                        : null,
                });
            })
            .catch(() => {
                if (cancelled) return;
                setState({
                    scopeKey,
                    snapshot: null,
                    insight: null,
                    loading: false,
                    error: ANSWERLATTICE_FRICTION_DATA_LOAD_FAILED,
                });
            });

        return () => { cancelled = true; };
    }, [tId, sId, refreshKey]);

    const refresh = () => {
        const scopeKey = FEATURE_FLAGS.ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE
            ? getAnswerlatticeFrictionScopeKey(tId, sId)
            : null;
        if (!scopeKey) return;
        setState({ scopeKey, snapshot: null, insight: null, loading: true, error: null });
        setRefreshKey(k => k + 1);
    };
    const visibleState = FEATURE_FLAGS.ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE
        ? projectFrictionInsightsStateForScope(state, tId, sId)
        : { snapshot: null, insight: null, loading: false, error: null };

    return { ...visibleState, refresh };
}
