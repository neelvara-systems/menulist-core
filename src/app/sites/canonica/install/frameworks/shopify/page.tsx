import { Metadata } from 'next';
import CanonicaPageStructuredData from '../../../components/PageStructuredData';
import CanonicaInstallContractPage from '../../InstallContractPage';

export const metadata: Metadata = {
    title: 'Shopify-Style Install',
    description: 'Canonica v1 install guidance for Shopify-style script injection.',
    alternates: { canonical: '/install/frameworks/shopify' },
};

export default function Page() {
    return (
        <>
            <CanonicaPageStructuredData path="/install/frameworks/shopify" />
            <CanonicaInstallContractPage docKey="shopify" />
        </>
    );
}
