import CanonicaConfigNotice from "@template/platform/CanonicaConfigNotice";
import ChatManagementTemplate from "@template/platform/chatManagement";
import { isCanonicaFirebaseConfigured } from "@lib/firebase/canonicaFirebaseClient";

export default function ChatManagementPage() {
    if (!isCanonicaFirebaseConfigured) {
        return <CanonicaConfigNotice surface="Chat Management" />;
    }

    return <ChatManagementTemplate />;
}
