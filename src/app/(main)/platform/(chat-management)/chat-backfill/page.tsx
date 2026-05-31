import AnalyticsBackfill from "@template/platform/admin/AnalyticsBackfill";
import AnswerlatticeConfigNotice from "@template/platform/AnswerlatticeConfigNotice";
import { isAnswerlatticeFirebaseConfigured } from "@lib/firebase/answerlatticeFirebaseClient";

export default function AnalyticsBackfillPage() {
    if (!isAnswerlatticeFirebaseConfigured) {
        return <AnswerlatticeConfigNotice surface="Chat Backfill" />;
    }

    return <AnalyticsBackfill />;
}
