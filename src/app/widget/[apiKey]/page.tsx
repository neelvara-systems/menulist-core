import WidgetClient from './WidgetClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    robots: { index: false, follow: false, nocache: true },
    referrer: 'no-referrer',
};

interface WidgetPageProps {
    params: Promise<{ apiKey: string }>;
}

export default async function WidgetPage(props: WidgetPageProps) {
    const params = await props.params;
    return <WidgetClient key={params.apiKey} apiKey={params.apiKey} />;
}
