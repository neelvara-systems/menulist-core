'use client';

import { FEATURE_FLAGS } from '@config/features';
import {
    copyAnswerlatticeSupportTextToClipboard,
    hasAnswerlatticeSupportClipboardWrite,
    hasAnswerlatticeSupportCopyFallback,
} from '@lib/answerlattice/supportClipboard';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import {
    Alert,
    Button,
    Card,
    Col,
    Flex,
    Input,
    Modal,
    Popconfirm,
    Row,
    Space,
    Tag,
    Typography,
    message,
} from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LuCopy, LuExternalLink, LuKeyRound, LuPlus, LuRefreshCw, LuShieldCheck, LuTrash2 } from 'react-icons/lu';

const { Paragraph, Text } = Typography;
const RESPONSE_MAX_BYTES = 64 * 1024;
const ACTION_BUTTON_STYLE = { minHeight: 44 };
const PRIVATE_KEY_PKCS8_PATTERN = /^MC4CAQAwBQYDK2VwBCIEI[A-Za-z0-9+/]{43}$/;
const PUBLIC_KEY_SPKI_PATTERN = /^MCowBQYDK2VwAyEA[A-Za-z0-9+/]{43}=$/;
const KEY_ID_PATTERN = /^alk_[A-Za-z0-9]{20}$/;
const WIDGET_SECURITY_COPY_FAILURE_CODES = {
    unavailable: 'answerlattice_widget_security_copy_unavailable',
    fallbackFailed: 'answerlattice_widget_security_copy_fallback_failed',
} as const;

type WidgetSecurityResponse = {
    verifiedContext: {
        enabled: boolean;
        algorithm: 'Ed25519';
        keyId: string;
        createdAt: string;
        rotatedAt?: string | null;
        publicKeySpki: string;
    } | null;
    evidenceAllowedHosts: string[];
    privateKeyPkcs8?: string;
    privateKeyShownOnce?: boolean;
    error?: string;
};

const isCanonicalIsoTimestamp = (value: unknown): value is string => {
    if (typeof value !== 'string' || value.length < 20 || value.length > 40) return false;
    const millis = Date.parse(value);
    return Number.isFinite(millis) && new Date(millis).toISOString() === value;
};

const isCanonicalEvidenceHost = (value: unknown): value is string => {
    if (typeof value !== 'string' || value.length < 1 || value.length > 253 || value !== value.toLowerCase()) return false;
    try {
        const parsed = new URL(`https://${value}`);
        return parsed.hostname === value
            && !parsed.username
            && !parsed.password
            && !parsed.port
            && parsed.pathname === '/'
            && !parsed.search
            && !parsed.hash;
    } catch {
        return false;
    }
};

const isWidgetSecurityResponse = (value: unknown): value is WidgetSecurityResponse => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const response = value as Record<string, unknown>;
    const verifiedContext = response.verifiedContext as Record<string, unknown> | null;
    return Array.isArray(response.evidenceAllowedHosts)
        && response.evidenceAllowedHosts.length <= 10
        && response.evidenceAllowedHosts.every(isCanonicalEvidenceHost)
        && new Set(response.evidenceAllowedHosts).size === response.evidenceAllowedHosts.length
        && (response.verifiedContext === null || (
            Boolean(verifiedContext)
            && typeof verifiedContext === 'object'
            && verifiedContext.enabled === true
            && verifiedContext.algorithm === 'Ed25519'
            && typeof verifiedContext.keyId === 'string'
            && KEY_ID_PATTERN.test(verifiedContext.keyId)
            && isCanonicalIsoTimestamp(verifiedContext.createdAt)
            && (verifiedContext.rotatedAt === null || verifiedContext.rotatedAt === undefined || isCanonicalIsoTimestamp(verifiedContext.rotatedAt))
            && typeof verifiedContext.publicKeySpki === 'string'
            && PUBLIC_KEY_SPKI_PATTERN.test(verifiedContext.publicKeySpki)
        ))
        && (response.privateKeyPkcs8 === undefined || (
            typeof response.privateKeyPkcs8 === 'string'
            && PRIVATE_KEY_PKCS8_PATTERN.test(response.privateKeyPkcs8)
            && response.privateKeyShownOnce === true
        ))
        && (response.privateKeyShownOnce === undefined || response.privateKeyShownOnce === true);
};

const getError = (payload: unknown, fallback: string) => {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return fallback;
    const error = (payload as Record<string, unknown>).error;
    return typeof error === 'string' && error.length > 0 && error.length <= 160 ? error : fallback;
};

export default function WidgetSecurityControls({ isMobile }: { isMobile: boolean }) {
    const [data, setData] = useState<WidgetSecurityResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [rotating, setRotating] = useState(false);
    const [savingHosts, setSavingHosts] = useState(false);
    const [privateKey, setPrivateKey] = useState<string | null>(null);
    const [newHost, setNewHost] = useState('');
    const [hosts, setHosts] = useState<string[]>([]);
    const keyMutationInFlightRef = useRef(false);
    const hostSaveInFlightRef = useRef(false);

    const load = useCallback(async () => {
        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_VERIFIED_CONTEXT && !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_EXTERNAL_EVIDENCE_LINKS) return;
        setLoading(true);
        try {
            const response = await fetch('/api/answerlattice/widget-security', {
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
            });
            const payload = await readJsonResponseWithLimit<unknown>(response, RESPONSE_MAX_BYTES);
            if (!response.ok || !isWidgetSecurityResponse(payload)) throw new Error(getError(payload, 'Could not load widget security controls.'));
            setData(payload);
            setHosts(payload.evidenceAllowedHosts);
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not load widget security controls.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const rotateKey = useCallback(async () => {
        if (keyMutationInFlightRef.current) return;
        keyMutationInFlightRef.current = true;
        setRotating(true);
        try {
            const response = await fetch('/api/answerlattice/widget-security', {
                method: 'POST',
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
            });
            const payload = await readJsonResponseWithLimit<unknown>(response, RESPONSE_MAX_BYTES);
            if (
                !response.ok
                || !isWidgetSecurityResponse(payload)
                || payload.privateKeyShownOnce !== true
                || typeof payload.privateKeyPkcs8 !== 'string'
                || !PRIVATE_KEY_PKCS8_PATTERN.test(payload.privateKeyPkcs8)
            ) {
                throw new Error(getError(payload, 'Could not create the signing key.'));
            }
            const { privateKeyPkcs8, ...publicResponse } = payload;
            setData(publicResponse);
            setPrivateKey(privateKeyPkcs8);
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not create the signing key.');
        } finally {
            keyMutationInFlightRef.current = false;
            setRotating(false);
        }
    }, []);

    const disableKey = useCallback(async () => {
        if (keyMutationInFlightRef.current) return;
        keyMutationInFlightRef.current = true;
        setRotating(true);
        try {
            const response = await fetch('/api/answerlattice/widget-security', {
                method: 'DELETE',
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
            });
            const payload = await readJsonResponseWithLimit<unknown>(response, RESPONSE_MAX_BYTES);
            if (!response.ok || !isWidgetSecurityResponse(payload)) throw new Error(getError(payload, 'Could not disable verified context.'));
            setData(payload);
            setPrivateKey(null);
            message.success('Verified visitor context disabled.');
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not disable verified context.');
        } finally {
            keyMutationInFlightRef.current = false;
            setRotating(false);
        }
    }, []);

    const saveHosts = useCallback(async (nextHosts: string[]) => {
        if (hostSaveInFlightRef.current) return;
        hostSaveInFlightRef.current = true;
        setSavingHosts(true);
        try {
            const response = await fetch('/api/answerlattice/widget-security', {
                method: 'PUT',
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ evidenceAllowedHosts: nextHosts }),
            });
            const payload = await readJsonResponseWithLimit<unknown>(response, RESPONSE_MAX_BYTES);
            if (!response.ok || !isWidgetSecurityResponse(payload)) throw new Error(getError(payload, 'Could not save evidence hosts.'));
            setData(payload);
            setHosts(payload.evidenceAllowedHosts);
            message.success('Evidence hosts saved.');
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not save evidence hosts.');
        } finally {
            hostSaveInFlightRef.current = false;
            setSavingHosts(false);
        }
    }, []);

    const addHost = useCallback(() => {
        if (hostSaveInFlightRef.current) {
            message.info('Wait for the current evidence host change to finish.');
            return;
        }
        const raw = newHost.trim().toLowerCase();
        if (!raw || hosts.includes(raw)) return;
        if (!isCanonicalEvidenceHost(raw)) {
            message.error('Use an exact HTTPS hostname without a path, port, or credentials.');
            return;
        }
        const next = [...hosts, raw].slice(0, 10);
        setNewHost('');
        void saveHosts(next);
    }, [hosts, newHost, saveHosts]);

    const copyValue = useCallback(async (value: string, label: string) => {
        try {
            await copyAnswerlatticeSupportTextToClipboard(value, WIDGET_SECURITY_COPY_FAILURE_CODES);
            message.success(`${label} copied.`);
        } catch {
            message.error('Clipboard is not available.');
        }
    }, []);

    const canCopy = hasAnswerlatticeSupportClipboardWrite() || hasAnswerlatticeSupportCopyFallback();

    return (
        <>
            <Row gutter={[16, 16]}>
                {FEATURE_FLAGS.ENABLE_ANSWERLATTICE_VERIFIED_CONTEXT && (
                    <Col xs={24} lg={12}>
                        <Card title={<Flex align="center" gap={8}><LuShieldCheck size={16} /> Verified Visitor Context</Flex>} loading={loading} style={{ height: '100%' }}>
                            <Flex vertical gap={12}>
                                <Paragraph type="secondary" style={{ margin: 0 }}>
                                    Sign short-lived visitor claims on your server so plan and role context cannot be changed in browser code. Answerlattice stores only the public verification key.
                                </Paragraph>
                                {data?.verifiedContext ? (
                                    <>
                                        <Space wrap>
                                            <Tag color="green">Enabled</Tag>
                                            <Tag>{data.verifiedContext.algorithm}</Tag>
                                            <Text code>{data.verifiedContext.keyId}</Text>
                                        </Space>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            Rotated {new Date(data.verifiedContext.rotatedAt || data.verifiedContext.createdAt).toLocaleString()}
                                        </Text>
                                        <Flex gap={8} vertical={isMobile}>
                                            <Popconfirm
                                                title="Rotate the signing key?"
                                                description="Tokens signed by the old private key will stop verifying."
                                                onConfirm={rotateKey}
                                                okButtonProps={{ style: ACTION_BUTTON_STYLE }}
                                                cancelButtonProps={{ style: ACTION_BUTTON_STYLE }}
                                            >
                                                <Button icon={<LuRefreshCw />} loading={rotating} style={ACTION_BUTTON_STYLE}>Rotate key</Button>
                                            </Popconfirm>
                                            <Popconfirm
                                                title="Disable verified context?"
                                                onConfirm={disableKey}
                                                okButtonProps={{ danger: true, style: ACTION_BUTTON_STYLE }}
                                                cancelButtonProps={{ style: ACTION_BUTTON_STYLE }}
                                            >
                                                <Button danger icon={<LuTrash2 />} loading={rotating} style={ACTION_BUTTON_STYLE}>Disable</Button>
                                            </Popconfirm>
                                        </Flex>
                                    </>
                                ) : (
                                    <Button type="primary" icon={<LuKeyRound />} onClick={rotateKey} loading={rotating} style={ACTION_BUTTON_STYLE}>
                                        Create signing key
                                    </Button>
                                )}
                                <Alert type="warning" showIcon message="Never put the private key in browser code" description="Store it in your product backend environment. Generate a token for the signed-in user with a maximum 10-minute lifetime, then call identifySigned(token)." />
                            </Flex>
                        </Card>
                    </Col>
                )}

                {FEATURE_FLAGS.ENABLE_ANSWERLATTICE_EXTERNAL_EVIDENCE_LINKS && (
                    <Col xs={24} lg={12}>
                        <Card title={<Flex align="center" gap={8}><LuExternalLink size={16} /> Debug Evidence Hosts</Flex>} loading={loading} style={{ height: '100%' }}>
                            <Flex vertical gap={12}>
                                <Paragraph type="secondary" style={{ margin: 0 }}>
                                    Allow exact HTTPS hosts for optional error, replay, or trace links. Answerlattice stores the URL with the widget question and never fetches the external page.
                                </Paragraph>
                                <Flex gap={8} vertical={isMobile}>
                                    <Input value={newHost} onChange={event => setNewHost(event.target.value)} onPressEnter={addHost} placeholder="errors.example.com" maxLength={253} style={ACTION_BUTTON_STYLE} />
                                    <Button icon={<LuPlus />} onClick={addHost} loading={savingHosts} style={ACTION_BUTTON_STYLE}>Add host</Button>
                                </Flex>
                                {hosts.length > 0 ? (
                                    <Space size={[6, 6]} wrap>
                                        {hosts.map(host => (
                                            <Tag key={host} closable onClose={event => { event.preventDefault(); void saveHosts(hosts.filter(item => item !== host)); }}>{host}</Tag>
                                        ))}
                                    </Space>
                                ) : (
                                    <Alert type="info" message="No external evidence links are accepted until a host is allowed." />
                                )}
                            </Flex>
                        </Card>
                    </Col>
                )}
            </Row>

            <Modal
                title="Private signing key"
                open={Boolean(privateKey)}
                onCancel={() => setPrivateKey(null)}
                footer={<Button type="primary" onClick={() => setPrivateKey(null)} style={ACTION_BUTTON_STYLE}>I stored the key</Button>}
                width={720}
                destroyOnClose
            >
                <Alert type="warning" showIcon message="Shown once" description="Answerlattice does not store this private key and cannot show it again." style={{ marginBottom: 14 }} />
                <Input.TextArea value={privateKey || ''} readOnly rows={5} style={{ fontFamily: 'monospace', fontSize: 12 }} />
                <Space wrap style={{ marginTop: 10 }}>
                    <Button icon={<LuCopy />} disabled={!canCopy || !privateKey} onClick={() => privateKey && copyValue(privateKey, 'Private key')} style={ACTION_BUTTON_STYLE}>Copy private key</Button>
                    <Text code>ANSWERLATTICE_WIDGET_SIGNING_KEY</Text>
                </Space>
                <Paragraph type="secondary" style={{ marginTop: 14 }}>
                    Import this base64 PKCS#8 key on your server, sign an EdDSA JWT with audience <Text code>answerlattice-widget</Text>, include <Text code>sub</Text>, <Text code>iat</Text>, and <Text code>exp</Text>, and set the header <Text code>kid</Text> to {data?.verifiedContext?.keyId || 'the current key ID'}.
                </Paragraph>
            </Modal>
        </>
    );
}
