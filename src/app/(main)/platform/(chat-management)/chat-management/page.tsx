import AnswerlatticeConfigNotice from "@template/platform/AnswerlatticeConfigNotice";
import ChatManagementTemplate from "@template/platform/chatManagement";
import { isAnswerlatticeFirebaseConfigured } from "@lib/firebase/answerlatticeConfig";

export default function ChatManagementPage() {
    if (!isAnswerlatticeFirebaseConfigured) {
        return <AnswerlatticeConfigNotice surface="Chat Management" />;
    }

    return <ChatManagementTemplate />;
}
