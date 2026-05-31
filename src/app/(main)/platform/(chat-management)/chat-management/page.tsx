import AnswerlatticeConfigNotice from "@template/platform/AnswerlatticeConfigNotice";
import ChatManagementTemplate from "@template/platform/chatManagement";
import { isAnswerlatticeFirebaseConfigured } from "@lib/firebase/answerlatticeFirebaseClient";

export default function ChatManagementPage() {
    if (!isAnswerlatticeFirebaseConfigured) {
        return <AnswerlatticeConfigNotice surface="Chat Management" />;
    }

    return <ChatManagementTemplate />;
}
