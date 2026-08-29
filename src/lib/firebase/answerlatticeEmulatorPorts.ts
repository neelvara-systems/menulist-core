export type AnswerlatticeEmulatorPorts = {
    auth: number;
    firestore: number;
    functions: number;
    storage: number;
};

type AnswerlatticeEmulatorPortInput = {
    auth?: string;
    firestore?: string;
    functions?: string;
    storage?: string;
};

const parsePort = (value: string | undefined, fallback: number, service: string): number => {
    const normalized = String(value || '').trim();
    if (!normalized) return fallback;
    if (!/^\d{1,5}$/.test(normalized)) {
        throw new Error(`Invalid Answerlattice ${service} emulator port.`);
    }
    const port = Number(normalized);
    if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
        throw new Error(`Invalid Answerlattice ${service} emulator port.`);
    }
    return port;
};

export const resolveAnswerlatticeEmulatorPorts = (
    input: AnswerlatticeEmulatorPortInput,
): AnswerlatticeEmulatorPorts => ({
    auth: parsePort(input.auth, 9099, 'Auth'),
    firestore: parsePort(input.firestore, 8080, 'Firestore'),
    functions: parsePort(input.functions, 5001, 'Functions'),
    storage: parsePort(input.storage, 9199, 'Storage'),
});

export const buildAnswerlatticeEmulatorConnectSources = (
    ports: AnswerlatticeEmulatorPorts,
): string[] => Object.values(ports).flatMap((port) => [
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`,
]);

export const normalizeAnswerlatticeFirestoreEmulatorHost = (
    value: string | undefined,
): string | null => {
    const normalized = String(value || '').trim();
    if (!normalized) return null;
    const match = /^(127\.0\.0\.1|localhost|\[::1\]):(\d{1,5})$/.exec(normalized);
    if (!match) throw new Error('Invalid Answerlattice Firestore emulator host.');
    const port = Number(match[2]);
    if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
        throw new Error('Invalid Answerlattice Firestore emulator host.');
    }
    return normalized;
};
