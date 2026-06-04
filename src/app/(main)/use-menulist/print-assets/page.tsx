import { FEATURE_FLAGS } from '@config/features';
import UseMenuList from '@template/main-app/useMenuList';
import { notFound } from 'next/navigation';

export default function PrintAssetsPage() {
    if (!FEATURE_FLAGS.ENABLE_PRINT_ASSETS_ROUTE) {
        notFound();
    }

    return <UseMenuList view="print-assets" />;
}
