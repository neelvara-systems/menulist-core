import SignalDeskWorkspace from "@/components/signaldesk/SignalDeskWorkspace";
import { FEATURE_FLAGS } from "@config/features";
import { notFound } from "next/navigation";

export default function SignalDeskOpportunitiesPage() {
    if (!FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_OPERATING_LAYER) notFound();
    return <SignalDeskWorkspace activeSection="mission" />;
}
