export type MenuListEmulatorPorts = {
    auth: number;
    firestore: number;
    storage: number;
};

type MenuListEmulatorPortInput = {
    auth?: string;
    firestore?: string;
    storage?: string;
};

const parsePort = (value: string | undefined, fallback: number, service: string): number => {
    const normalized = String(value || '').trim();
    if (!normalized) return fallback;
    if (!/^\d{1,5}$/.test(normalized)) {
        throw new Error(`Invalid MenuList ${service} emulator port.`);
    }
    const port = Number(normalized);
    if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
        throw new Error(`Invalid MenuList ${service} emulator port.`);
    }
    return port;
};

export const resolveMenuListEmulatorPorts = (
    input: MenuListEmulatorPortInput,
): MenuListEmulatorPorts => ({
    auth: parsePort(input.auth, 9099, 'Auth'),
    firestore: parsePort(input.firestore, 8080, 'Firestore'),
    storage: parsePort(input.storage, 9199, 'Storage'),
});

export const buildMenuListEmulatorConnectSources = (
    ports: MenuListEmulatorPorts,
): string[] => Object.values(ports).flatMap((port) => [
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`,
]);
