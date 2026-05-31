import { getSafeUiErrorMessage } from '@lib/errors/uiErrorMessages';

export function getAnswerlatticeUiErrorMessage(error: unknown, fallback: string): string {
    return getSafeUiErrorMessage(error, fallback);
}
