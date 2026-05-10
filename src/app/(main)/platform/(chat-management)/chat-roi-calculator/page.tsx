import { Metadata } from 'next';
import ROICalculator from '@template/platform/chatManagement/ROICalculator';
import CanonicaConfigNotice from '@template/platform/CanonicaConfigNotice';
import { isCanonicaFirebaseConfigured } from '@lib/firebase/canonicaFirebaseClient';

export const metadata: Metadata = {
    title: 'ROI Calculator | Chat Management',
    description: 'Calculate business value and return on investment from AI chat analytics'
};

export default function ROICalculatorPage() {
    if (!isCanonicaFirebaseConfigured) {
        return <CanonicaConfigNotice surface="Chat ROI Calculator" />;
    }

    return <ROICalculator />;
}
