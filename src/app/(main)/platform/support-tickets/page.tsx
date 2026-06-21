import SupportTickets from "@template/platform/supportTickets"
import AnswerlatticeConfigNotice from "@template/platform/AnswerlatticeConfigNotice"
import { isAnswerlatticeFirebaseConfigured } from "@lib/firebase/answerlatticeConfig"

function page() {
    if (!isAnswerlatticeFirebaseConfigured) {
        return <AnswerlatticeConfigNotice surface="Support Tickets" />
    }

    return (
        <SupportTickets />
    )
}

export default page
