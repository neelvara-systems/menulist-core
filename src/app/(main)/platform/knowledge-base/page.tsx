import AnswerlatticeConfigNotice from "@template/platform/AnswerlatticeConfigNotice";
import PlatformKnowledgeBase from "@template/platform/knowledgeBase";
import { isAnswerlatticeFirebaseConfigured } from "@lib/firebase/answerlatticeFirebaseClient";

export default function KnowledgeBasePage() {
    if (!isAnswerlatticeFirebaseConfigured) {
        return <AnswerlatticeConfigNotice surface="Knowledge Base" />;
    }

    return <PlatformKnowledgeBase />;
}
