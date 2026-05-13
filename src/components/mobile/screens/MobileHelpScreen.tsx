'use client'

import MobileCanonicaClientScreen from './MobileCanonicaClientScreen';

interface MobileHelpScreenProps {
    onBack: () => void;
}

export default function MobileHelpScreen({ onBack }: MobileHelpScreenProps) {
    return <MobileCanonicaClientScreen initialView="help" onBack={onBack} />;
}
