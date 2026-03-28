import WidgetClient from './WidgetClient';

interface WidgetPageProps {
    params: { apiKey: string };
}

export default function WidgetPage({ params }: WidgetPageProps) {
    return <WidgetClient apiKey={params.apiKey} />;
}
