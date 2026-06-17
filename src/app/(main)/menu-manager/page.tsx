import { FEATURE_FLAGS } from '@config/features';
import AiMenuManagerRoute from '@template/main-app/aiMenuManager/AiMenuManagerRoute';
import { notFound } from 'next/navigation';

export default function MenuManagerPage() {
    if (!FEATURE_FLAGS.ENABLE_AI_MENU_MANAGER) {
        notFound();
    }

    return <AiMenuManagerRoute />;
}
