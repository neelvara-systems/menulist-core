import { FEATURE_FLAGS } from '@config/features';
import PrintableAssetTemplatesRoute from '@template/main-app/printableAssetTemplates/PrintableAssetTemplatesRoute';
import UseMenuList from '@template/main-app/useMenuList';
import { notFound } from 'next/navigation';

export default function PrintAssetsPage() {
    if (!FEATURE_FLAGS.ENABLE_PRINT_ASSETS_ROUTE && !FEATURE_FLAGS.ENABLE_PRINTABLE_ASSET_TEMPLATES) {
        notFound();
    }

    if (FEATURE_FLAGS.ENABLE_PRINTABLE_ASSET_TEMPLATES) {
        return <PrintableAssetTemplatesRoute />;
    }

    return <UseMenuList view="print-assets" />;
}
