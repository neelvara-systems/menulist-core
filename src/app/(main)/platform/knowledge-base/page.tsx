import CanonicaConfigNotice from "@template/platform/CanonicaConfigNotice";
import PlatformKnowledgeBase from "@template/platform/knowledgeBase";
import { isCanonicaFirebaseConfigured } from "@lib/firebase/canonicaFirebaseClient";

export default function KnowledgeBasePage() {
    if (!isCanonicaFirebaseConfigured) {
        return <CanonicaConfigNotice surface="Knowledge Base" />;
    }

    return <PlatformKnowledgeBase />;
}
