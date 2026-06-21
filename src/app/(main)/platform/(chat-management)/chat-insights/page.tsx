import AnswerlatticeConfigNotice from "@template/platform/AnswerlatticeConfigNotice";
import ChatInsightsTemplate from "@template/platform/chatManagement/ChatInsights";
import { isAnswerlatticeFirebaseConfigured } from "@lib/firebase/answerlatticeConfig";

export default function InsightsPage() {
    if (!isAnswerlatticeFirebaseConfigured) {
        return <AnswerlatticeConfigNotice surface="Chat Insights" />;
    }

    return <ChatInsightsTemplate />;
}
