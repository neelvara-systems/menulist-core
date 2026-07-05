const SMTP_MIN_PORT = 1;
const SMTP_MAX_PORT = 65535;

export interface SmtpConfig {
    host: string;
    pass: string;
    port: number;
    secure: boolean;
    user: string;
}

export function parseSmtpPort(rawPort: string | undefined): number | null {
    const normalizedPort = String(rawPort ?? '').trim();
    if (!/^\d+$/.test(normalizedPort)) return null;

    const port = Number(normalizedPort);
    return Number.isSafeInteger(port) && port >= SMTP_MIN_PORT && port <= SMTP_MAX_PORT
        ? port
        : null;
}

export function getSmtpConfigFromEnv(env: NodeJS.ProcessEnv = process.env): SmtpConfig | null {
    const host = String(env.SMTP_HOST || '').trim();
    const port = parseSmtpPort(env.SMTP_PORT);
    const user = String(env.SMTP_USER || '').trim();
    const pass = String(env.SMTP_PASS || '');

    if (!host || port === null || !user || pass.trim().length === 0) {
        return null;
    }

    return {
        host,
        pass,
        port,
        secure: port === 465,
        user,
    };
}

export function isSmtpConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
    return getSmtpConfigFromEnv(env) !== null;
}
