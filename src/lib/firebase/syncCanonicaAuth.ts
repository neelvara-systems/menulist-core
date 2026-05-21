import { signInWithCustomToken } from 'firebase/auth';
import { canonicaAuth, shouldUseSharedCanonicaFirebase } from './canonicaFirebaseClient';

export async function syncCanonicaAuthWithCustomToken(canonicaCustomToken?: string | null): Promise<boolean> {
    if (shouldUseSharedCanonicaFirebase || !canonicaCustomToken || !canonicaAuth) {
        return false;
    }

    await signInWithCustomToken(canonicaAuth, canonicaCustomToken);
    return true;
}
