import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

export default function CanonicaInstallAliasPage() {
    const basePath = getBasePath();
    redirect(`${basePath}/install`);
}
