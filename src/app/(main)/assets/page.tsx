import { FEATURE_FLAGS } from '@config/features';
import PrintableAssetTemplatesRoute from '@template/main-app/printableAssetTemplates/PrintableAssetTemplatesRoute';
import { notFound } from 'next/navigation';

export default function AssetsPage() {
    if (!FEATURE_FLAGS.ENABLE_PRINTABLE_ASSET_TEMPLATES) {
        notFound();
    }

    return <PrintableAssetTemplatesRoute />;
}
