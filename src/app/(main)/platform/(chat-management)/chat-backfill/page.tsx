import AnalyticsBackfill from "@template/platform/admin/AnalyticsBackfill";
import CanonicaConfigNotice from "@template/platform/CanonicaConfigNotice";
import { isCanonicaFirebaseConfigured } from "@lib/firebase/canonicaFirebaseClient";

export default function AnalyticsBackfillPage() {
    if (!isCanonicaFirebaseConfigured) {
        return <CanonicaConfigNotice surface="Chat Backfill" />;
    }

    return <AnalyticsBackfill />;
}
