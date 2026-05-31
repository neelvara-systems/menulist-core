import { Metadata } from 'next';
import AnswerlatticePageStructuredData from '../../../components/PageStructuredData';
import AnswerlatticeInstallContractPage from '../../InstallContractPage';

export const metadata: Metadata = {
    title: 'Plain HTML Install',
    description: 'Answerlattice v1 script-tag install guidance for static or server-rendered products.',
    alternates: { canonical: '/install/frameworks/plain-html' },
};

export default function Page() {
    return (
        <>
            <AnswerlatticePageStructuredData path="/install/frameworks/plain-html" />
            <AnswerlatticeInstallContractPage docKey="plain-html" />
        </>
    );
}
