export function formatWebhookSecretPreview(secret?: string): string {
    if (!secret) return '';
    if (secret.length <= 18) return `${secret.slice(0, 6)}...`;

    return `${secret.slice(0, 12)}...${secret.slice(-6)}`;
}
