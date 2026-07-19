import type { Metadata } from 'next';
import WidgetEmbedClient from './WidgetEmbedClient';

export const metadata: Metadata = {
    robots: { index: false, follow: false, nocache: true },
    referrer: 'no-referrer',
};

export default function WidgetEmbedPage() {
    return <WidgetEmbedClient />;
}
