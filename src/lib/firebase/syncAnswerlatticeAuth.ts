import { signInWithCustomToken } from 'firebase/auth';
import { answerlatticeAuth, shouldUseSharedAnswerlatticeFirebase } from './answerlatticeFirebaseClient';

export async function syncAnswerlatticeAuthWithCustomToken(answerlatticeCustomToken?: string | null): Promise<boolean> {
    if (shouldUseSharedAnswerlatticeFirebase || !answerlatticeCustomToken || !answerlatticeAuth) {
        return false;
    }

    await signInWithCustomToken(answerlatticeAuth, answerlatticeCustomToken);
    return true;
}
