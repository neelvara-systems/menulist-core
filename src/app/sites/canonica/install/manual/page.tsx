import { Metadata } from 'next';
import CanonicaPageStructuredData from '../../components/PageStructuredData';
import CanonicaInstallContractPage from '../InstallContractPage';

export const metadata: Metadata = {
    title: 'Manual Widget Install',
    description: 'Human-readable Canonica v1 widget install steps.',
    alternates: { canonical: '/install/manual' },
};

export default function Page() {
    return (
        <>
            <CanonicaPageStructuredData path="/install/manual" />
            <CanonicaInstallContractPage docKey="manual" />
        </>
    );
}
