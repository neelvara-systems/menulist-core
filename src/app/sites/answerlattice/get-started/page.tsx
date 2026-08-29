import { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
    title: 'Request Early Access',
    description: 'AnswerLattice is currently available through controlled early access. Request a product-fit review without creating an account or payment.',
    robots: { index: false, follow: true },
};

async function getBasePath(): Promise<string> {
    try {
        const h = await headers();
        const aliasBasePath = h.get('x-product-base-path') || '';
        if (aliasBasePath) return aliasBasePath;
        const host = h.get('host') || '';
        return h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))
            ? '/__answerlattice'
            : '';
    } catch {
        return '';
    }
}

export default async function AnswerlatticeGetStartedRedirect() {
    const basePath = await getBasePath();
    redirect(`${basePath}/early-access`);
}
