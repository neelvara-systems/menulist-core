import { redirect } from 'next/navigation';
import { FEATURE_FLAGS } from '@config/features';
import PastActivityScreen from "@template/main-app/today/PastActivity";

export default function PastActivityPage() {
    if (!FEATURE_FLAGS.ENABLE_PAST_ACTIVITY_HISTORY) {
        redirect('/today');
    }

    return <PastActivityScreen />;
}
