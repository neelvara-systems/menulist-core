import WidgetClient from './WidgetClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    robots: { index: false, follow: false, nocache: true },
    referrer: 'no-referrer',
};

interface WidgetPageProps {
    params: { apiKey: string };
}

export default function WidgetPage({ params }: WidgetPageProps) {
    return <WidgetClient apiKey={params.apiKey} />;
}
