'use client'

import MobileShareScreen from './MobileShareScreen';

interface MobilePrintAssetsScreenProps {
    onBack: () => void;
    onOpenDesignEditor?: () => void;
    onOpenPrintMenu?: () => void;
}

export default function MobilePrintAssetsScreen({
    onBack,
    onOpenDesignEditor,
    onOpenPrintMenu,
}: MobilePrintAssetsScreenProps) {
    return (
        <MobileShareScreen
            mode="printAssets"
            onBack={onBack}
            onOpenDesignEditor={onOpenDesignEditor}
            onOpenPrintMenu={onOpenPrintMenu}
        />
    );
}
