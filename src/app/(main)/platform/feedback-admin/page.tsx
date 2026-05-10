import FeedbackAdminTemplate from '@template/platform/feedbackAdmin';
import CanonicaConfigNotice from '@template/platform/CanonicaConfigNotice';
import { isCanonicaFirebaseConfigured } from '@lib/firebase/canonicaFirebaseClient';

function FeedbackAdminPage() {
    if (!isCanonicaFirebaseConfigured) {
        return <CanonicaConfigNotice surface="Feedback Admin" />;
    }

    return <FeedbackAdminTemplate />;
}

export default FeedbackAdminPage;
