import { Metadata } from 'next';
import AnswerlatticePageStructuredData from '../../../components/PageStructuredData';
import AnswerlatticeInstallContractPage from '../../InstallContractPage';

export const metadata: Metadata = {
    title: 'Shopify-Style Install',
    description: 'Answerlattice v1 install guidance for Shopify-style script injection.',
    alternates: { canonical: '/install/frameworks/shopify' },
};

export default function Page() {
    return (
        <>
            <AnswerlatticePageStructuredData path="/install/frameworks/shopify" />
            <AnswerlatticeInstallContractPage docKey="shopify" />
        </>
    );
}
