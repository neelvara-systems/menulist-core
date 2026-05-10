import KBGenerationTemplate from '@template/platform/KBGeneration'
import CanonicaConfigNotice from '@template/platform/CanonicaConfigNotice'
import { isCanonicaFirebaseConfigured } from '@lib/firebase/canonicaFirebaseClient'

function page() {
    if (!isCanonicaFirebaseConfigured) {
        return <CanonicaConfigNotice surface="KB Generation" />
    }

    return (
        <KBGenerationTemplate />
    )
}

export default page
