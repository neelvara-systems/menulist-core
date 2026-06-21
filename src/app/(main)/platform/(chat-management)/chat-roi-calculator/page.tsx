import { Metadata } from 'next';
import ROICalculator from '@template/platform/chatManagement/ROICalculator';
import AnswerlatticeConfigNotice from '@template/platform/AnswerlatticeConfigNotice';
import { isAnswerlatticeFirebaseConfigured } from '@lib/firebase/answerlatticeConfig';

export const metadata: Metadata = {
    title: 'ROI Calculator | Chat Management',
    description: 'Calculate business value and return on investment from AI chat analytics'
};

export default function ROICalculatorPage() {
    if (!isAnswerlatticeFirebaseConfigured) {
        return <AnswerlatticeConfigNotice surface="Chat ROI Calculator" />;
    }

    return <ROICalculator />;
}
