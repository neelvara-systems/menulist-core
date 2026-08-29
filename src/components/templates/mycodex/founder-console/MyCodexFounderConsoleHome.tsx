'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuActivity, LuAlertTriangle, LuArrowRight, LuRefreshCw, LuShieldCheck } from 'react-icons/lu';
import { getOpsControlRoomSnapshot } from '@database/ops';
import type { OpsControlRoomSnapshot } from '@lib/ops/types';
import {
    MYCODEX_FOUNDER_CONSOLE_BASE_PATH,
    getMyCodexFounderConsoleVisibleSurfaces,
} from '@lib/mycodex/founderConsoleCatalog';

type HomeState =
    | { status: 'loading'; snapshot: null }
    | { status: 'ready'; snapshot: OpsControlRoomSnapshot; loadedAt: number }
    | { status: 'error'; snapshot: null };

export default function MyCodexFounderConsoleHome() {
    const [state, setState] = useState<HomeState>({ status: 'loading', snapshot: null });
    const requestRef = useRef(0);

    const load = useCallback(async () => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setState({ status: 'error', snapshot: null });
            return;
        }
        const requestId = requestRef.current + 1;
        requestRef.current = requestId;
        setState({ status: 'loading', snapshot: null });
        try {
            const snapshot = await getOpsControlRoomSnapshot();
            if (requestRef.current === requestId) setState({ status: 'ready', snapshot, loadedAt: Date.now() });
        } catch {
            if (requestRef.current === requestId) setState({ status: 'error', snapshot: null });
        }
    }, []);

    useEffect(() => {
        void load();
        return () => { requestRef.current += 1; };
    }, [load]);

    const prioritySurfaces = useMemo(() => getMyCodexFounderConsoleVisibleSurfaces({
        includeDevelopment: process.env.NODE_ENV !== 'production',
    }).filter((surface) => surface.mobilePriority).slice(0, 6), []);

    const attentionCount = state.status === 'ready'
        ? state.snapshot.alerts.filter((alert) => !alert.acknowledged && alert.severity !== 'info').length
            + state.snapshot.integrity.noPublish60d
        : null;

    return (
        <div className="mycodex-founder-page">
            <div className="mycodex-founder-page-heading">
                <div>
                    <span className="mycodex-founder-eyebrow">Private operating view</span>
                    <h1>Today</h1>
                    <p>Start with what needs attention. Open deeper tools only when a decision is required.</p>
                </div>
                <button disabled={state.status === 'loading'} onClick={() => void load()} type="button">
                    <LuRefreshCw className={state.status === 'loading' ? 'is-spinning' : ''} size={17} /> Refresh
                </button>
            </div>

            {state.status === 'error' ? (
                <section className="mycodex-founder-state is-error" role="alert">
                    <LuAlertTriangle size={24} />
                    <div><strong>Current operations are unavailable</strong><p>No healthy status is inferred. Check your connection and retry.</p></div>
                    <button onClick={() => void load()} type="button">Try again</button>
                </section>
            ) : null}

            <section className="mycodex-founder-metrics" aria-busy={state.status === 'loading'}>
                <article>
                    <LuShieldCheck size={21} />
                    <span>Safety mode</span>
                    <strong>{state.status === 'ready' ? (state.snapshot.systemState.safeModeActive ? 'Enabled' : 'Normal') : 'Checking'}</strong>
                </article>
                <article>
                    <LuAlertTriangle size={21} />
                    <span>Needs attention</span>
                    <strong>{attentionCount ?? 'Checking'}</strong>
                </article>
                <article>
                    <LuActivity size={21} />
                    <span>Active stores · 7 days</span>
                    <strong>{state.status === 'ready' ? state.snapshot.adoption.activeStores7d : 'Checking'}</strong>
                </article>
                <article>
                    <LuActivity size={21} />
                    <span>New stores · 24 hours</span>
                    <strong>{state.status === 'ready' ? state.snapshot.adoption.newStores24h : 'Checking'}</strong>
                </article>
            </section>
            <p className="mycodex-founder-last-checked">
                {state.status === 'ready'
                    ? `Last checked ${new Date(state.loadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Waiting for current operational evidence'}
            </p>

            <section className="mycodex-founder-section">
                <div className="mycodex-founder-section-heading"><div><h2>Open next</h2><p>Frequent tools across both products.</p></div></div>
                <div className="mycodex-founder-surface-grid">
                    {prioritySurfaces.map((surface) => (
                        <Link href={`${MYCODEX_FOUNDER_CONSOLE_BASE_PATH}/surface/${surface.key}`} key={surface.key}>
                            <span>{surface.product === 'shared' ? 'Portfolio' : surface.product === 'menulist' ? 'MenuList' : 'Answerlattice'}</span>
                            <strong>{surface.title}</strong>
                            <p>{surface.description}</p>
                            <LuArrowRight size={18} />
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
}
