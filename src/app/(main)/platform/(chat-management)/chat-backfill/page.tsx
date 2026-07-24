import AnalyticsBackfill from "@template/answerlattice/platform/AnalyticsBackfill";
import AnswerlatticeConfigNotice from "@template/platform/AnswerlatticeConfigNotice";
import { isAnswerlatticeFirebaseConfigured } from "@lib/firebase/answerlatticeConfig";

export default function AnalyticsBackfillPage() {
    if (!isAnswerlatticeFirebaseConfigured) {
        return <AnswerlatticeConfigNotice surface="Chat Backfill" />;
    }

    return <AnalyticsBackfill />;
}
