import { Metadata } from 'next';
import ROICalculator from '@template/platform/chatManagement/ROICalculator';

export const metadata: Metadata = {
    title: 'ROI Calculator | Chat Management',
    description: 'Calculate business value and return on investment from AI chat analytics'
};

export default function ROICalculatorPage() {
    return <ROICalculator />;
}
