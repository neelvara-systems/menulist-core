import { getSafeUiErrorMessage } from '@lib/errors/uiErrorMessages';

export function getCanonicaUiErrorMessage(error: unknown, fallback: string): string {
    return getSafeUiErrorMessage(error, fallback);
}
