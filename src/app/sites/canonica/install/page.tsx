import { Metadata } from 'next';
import CanonicaPageStructuredData from '../components/PageStructuredData';
import CanonicaInstallContractPage from './InstallContractPage';

export const metadata: Metadata = {
    title: 'Install Canonica with your AI coding agent',
    description: 'Copy the Canonica agent packet, install the v1 widget once, pass safe page context, block sensitive routes, and verify the integration.',
    alternates: { canonical: '/install' },
};

export default function CanonicaInstallPage() {
    return (
        <>
            <CanonicaPageStructuredData path="/install" />
            <CanonicaInstallContractPage docKey="overview" />
        </>
    );
}
