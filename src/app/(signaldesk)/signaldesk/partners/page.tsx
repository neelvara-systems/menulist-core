import SignalDeskWorkspace from "@/components/signaldesk/SignalDeskWorkspace";
import { FEATURE_FLAGS } from "@config/features";
import { notFound } from "next/navigation";

export default function SignalDeskPartnersPage() {
    if (!FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_TRUST_PARTNER_RAIL) notFound();
    return <SignalDeskWorkspace activeSection="partners" />;
}
