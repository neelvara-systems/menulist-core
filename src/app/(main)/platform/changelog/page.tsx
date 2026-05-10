import ChangelogTemplate from '@template/platform/changelog';
import CanonicaConfigNotice from '@template/platform/CanonicaConfigNotice';
import { isCanonicaFirebaseConfigured } from '@lib/firebase/canonicaFirebaseClient';

function ChangelogPage() {
    if (!isCanonicaFirebaseConfigured) {
        return <CanonicaConfigNotice surface="Changelog Management" />;
    }

    return <ChangelogTemplate />;
}

export default ChangelogPage;
