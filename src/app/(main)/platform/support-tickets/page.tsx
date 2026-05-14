import SupportTickets from "@template/platform/supportTickets"
import CanonicaConfigNotice from "@template/platform/CanonicaConfigNotice"
import { isCanonicaFirebaseConfigured } from "@lib/firebase/canonicaFirebaseClient"

function page() {
    if (!isCanonicaFirebaseConfigured) {
        return <CanonicaConfigNotice surface="Support Tickets" />
    }

    return (
        <SupportTickets />
    )
}

export default page
