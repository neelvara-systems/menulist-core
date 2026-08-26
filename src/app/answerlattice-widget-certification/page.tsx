import type { Metadata } from 'next';
import Script from 'next/script';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    robots: { follow: false, index: false },
    title: 'Answerlattice local widget certification',
};

export default function AnswerlatticeLocalWidgetCertificationPage() {
    const widgetKey = process.env.NEXT_PUBLIC_ANSWERLATTICE_WIDGET_KEY?.trim();
    if (process.env.NODE_ENV !== 'development' || !widgetKey) notFound();

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
        </main>
    );
}
