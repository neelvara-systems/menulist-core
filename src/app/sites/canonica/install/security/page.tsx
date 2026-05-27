import { Metadata } from 'next';
import CanonicaPageStructuredData from '../../components/PageStructuredData';
import CanonicaInstallContractPage from '../InstallContractPage';

export const metadata: Metadata = {
    title: 'Install Security Rules',
    description: 'Canonica v1 safe context, forbidden fields, allowed origins, and blocked route guidance.',
    alternates: { canonical: '/install/security' },
};

export default function Page() {
    return (
        <>
            <CanonicaPageStructuredData path="/install/security" />
            <CanonicaInstallContractPage docKey="security" />
        </>
    );
}
