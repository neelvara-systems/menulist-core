import { Metadata } from 'next';
import AnswerlatticePageStructuredData from '../../../components/PageStructuredData';
import AnswerlatticeInstallContractPage from '../../InstallContractPage';

export const metadata: Metadata = {
    title: 'Webflow Install',
    description: 'Answerlattice v1 install guidance for Webflow custom-code installs.',
    alternates: { canonical: '/install/frameworks/webflow' },
};

export default function Page() {
    return (
        <>
            <AnswerlatticePageStructuredData path="/install/frameworks/webflow" />
            <AnswerlatticeInstallContractPage docKey="webflow" />
        </>
    );
}
