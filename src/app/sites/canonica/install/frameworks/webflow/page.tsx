import { Metadata } from 'next';
import CanonicaPageStructuredData from '../../../components/PageStructuredData';
import CanonicaInstallContractPage from '../../InstallContractPage';

export const metadata: Metadata = {
    title: 'Webflow Install',
    description: 'Canonica v1 install guidance for Webflow custom-code installs.',
    alternates: { canonical: '/install/frameworks/webflow' },
};

export default function Page() {
    return (
        <>
            <CanonicaPageStructuredData path="/install/frameworks/webflow" />
            <CanonicaInstallContractPage docKey="webflow" />
        </>
    );
}
