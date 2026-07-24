import SignalDeskWorkspace from "@/components/signaldesk/SignalDeskWorkspace";
import { FEATURE_FLAGS } from "@config/features";
import { notFound } from "next/navigation";

export default function SignalDeskContentPage() {
    if (!FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_CONTENT_DISTRIBUTION_RAIL) notFound();
    return <SignalDeskWorkspace activeSection="content" />;
}
