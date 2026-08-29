'use client';

import Script from 'next/script';
import { useState, type FormEvent } from 'react';

export default function AnswerlatticeLocalWidgetCertificationClient() {
    const [pendingWidgetKey, setPendingWidgetKey] = useState('');
    const [widgetKey, setWidgetKey] = useState('');

    const loadWidget = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setWidgetKey(pendingWidgetKey.trim());
        setPendingWidgetKey('');
    };

    return (
        <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px', fontFamily: 'system-ui, sans-serif' }}>
            <h1>MenuList owner support certification</h1>
            <p>
                This local-only page proves the installed Answerlattice widget against the disposable Firebase emulator workspace.
            </p>
            <section aria-label="Current product context" style={{ marginTop: 32 }}>
                <h2>Menu editor</h2>
                <p>Ask how to review imported menu content before publishing it.</p>
            </section>
            {!widgetKey ? (
                <form onSubmit={loadWidget} style={{ display: 'grid', gap: 12, marginTop: 32 }}>
                    <label htmlFor="answerlattice-local-widget-key">Disposable local widget key</label>
                    <input
                        autoComplete="off"
                        id="answerlattice-local-widget-key"
                        onChange={(event) => setPendingWidgetKey(event.target.value)}
                        spellCheck={false}
                        type="password"
                        value={pendingWidgetKey}
                    />
                    <button disabled={!pendingWidgetKey.trim()} type="submit">Load widget</button>
                    <p>This value stays only in this page&apos;s memory and is cleared by reload or navigation.</p>
                </form>
            ) : (
                <Script
                    id="answerlattice-local-certification-widget"
                    src="/widget/v1/answerlattice-widget.js"
                    strategy="afterInteractive"
                    data-answerlattice-key={widgetKey}
                    data-context-key="menulist_owner_editor"
                    data-feature="projects"
                    data-page="editor"
                    data-workflow="review_menu_before_publish"
                    data-user-role="owner"
                    data-entity-hints="menu,project,public_menu,owner_review"
                />
            )}
        </main>
    );
}
