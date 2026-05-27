import { Metadata } from 'next';
import CanonicaPageStructuredData from '../../../components/PageStructuredData';
import CanonicaInstallContractPage from '../../InstallContractPage';

export const metadata: Metadata = {
    title: 'Plain HTML Install',
    description: 'Canonica v1 script-tag install guidance for static or server-rendered products.',
    alternates: { canonical: '/install/frameworks/plain-html' },
};

export default function Page() {
    return (
        <>
            <CanonicaPageStructuredData path="/install/frameworks/plain-html" />
            <CanonicaInstallContractPage docKey="plain-html" />
        </>
    );
}
