import { Metadata } from 'next';
import CanonicaPageStructuredData from '../../components/PageStructuredData';
import CanonicaInstallContractPage from '../InstallContractPage';

export const metadata: Metadata = {
    title: 'AI Agent Install Packet',
    description: 'Copyable Canonica v1 install packet for Codex, Claude Code, Cursor, Windsurf, and other coding agents.',
    alternates: { canonical: '/install/ai-agent' },
};

export default function Page() {
    return (
        <>
            <CanonicaPageStructuredData path="/install/ai-agent" />
            <CanonicaInstallContractPage docKey="ai-agent" />
        </>
    );
}
