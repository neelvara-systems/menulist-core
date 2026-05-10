import CanonicaConfigNotice from "@template/platform/CanonicaConfigNotice";
import ChatInsightsTemplate from "@template/platform/chatManagement/ChatInsights";
import { isCanonicaFirebaseConfigured } from "@lib/firebase/canonicaFirebaseClient";

export default function InsightsPage() {
    if (!isCanonicaFirebaseConfigured) {
        return <CanonicaConfigNotice surface="Chat Insights" />;
    }

    return <ChatInsightsTemplate />;
}
