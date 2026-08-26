/**
 * POS Sync Tab — Business Settings
 *
 * Store-level external sync configuration.
 * Sections: Owner explanation, Status Header, Config, Test Connection, Delivery Status, Updates sent.
 * Silent when healthy. Visible only when broken.
 *
 * @see __docs__/pos-webhook-sync/pos-webhook-sync_spec.md (UI Design)
 * @see __docs__/pos-webhook-sync/pos-webhook-sync_impl.md §5
 */

import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import {
    parsePosDeliveryHistoryEntry,
    type PosDeliveryHistoryEntry,
} from "@lib/posSync/deliveryHistory";
import { logPosSyncSecretRotationAudit } from "@lib/posSync/secretAudit";
import { formatWebhookSecretPreview } from "@lib/posSync/secretDisplay";
import { requestPosSyncSecret } from "@lib/posSync/secretResponse";
import {
    isPosSyncTestResponse,
    isSuccessfulPosSyncTestResponse,
    POS_SYNC_TEST_REQUEST_POLICY,
    POS_SYNC_TEST_RESPONSE_JSON_MAX_BYTES,
    type PosSyncTestResponse,
} from "@lib/posSync/testResponse";
import { validatePosSyncWebhookUrl } from "@lib/posSync/webhookUrl";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";
import { createLatestRequestGuard } from "@lib/runtime/latestRequestGuard";
import { getBoundedBusinessSettingsStringContext, logBusinessSettingsFailure } from "../utils/businessSettingsDiagnostics";
import { formatDateTime } from "@util/dateTime";
import {
    App,
    Alert,
    Badge,
    Button,
    Card,
    Collapse,
    Divider,
    Flex,
    Input,
    Modal,
    Space,
    Switch,
    Table,
    Tag,
    Tooltip,
    Typography,
    theme,
} from "antd";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { useSession } from "next-auth/react";
import { useFormatter, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from "react";
import {
    LuArrowRight,
    LuCheck,
    LuCopy,
    LuDownload,
    LuEye,
    LuEyeOff,
    LuRefreshCw,
    LuSend,
    LuShield,
    LuWifi,
    LuWifiOff,
    LuX,
} from "react-icons/lu";

const { Title, Text } = Typography;
const REGENERATE_SECRET_CONFIRMATION = 'REGENERATE';
const PROVIDER_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POS_SYNC_TEST_FAILED_MESSAGE = 'Could not reach connected system';
const DESKTOP_POS_SYNC_COPY_UNAVAILABLE = 'desktop_pos_sync_copy_unavailable';
const DESKTOP_POS_SYNC_COPY_FALLBACK_FAILED = 'desktop_pos_sync_copy_fallback_failed';

interface PosSyncTabProps {
    scrollRef?: React.RefObject<HTMLDivElement | null>;
    storeDetails?: any;
    onStoreStateUpdate?: (updates: Record<string, any>) => void;
    onStoreUpdate?: (updates: Record<string, any>) => void | Promise<void>;
}

function createPosSyncStatusError(failureCode: string, status?: number): Error & { code: string; status?: number } {
    return Object.assign(new Error(failureCode), {
        code: failureCode,
        status,
    });
}

function buildPosSyncLogContext(
    action: string,
    storeId?: unknown,
    tenantId?: unknown,
    extra: Record<string, boolean | number | string | null | undefined> = {},
) {
    return {
        action,
        ...getBoundedBusinessSettingsStringContext('storeId', storeId),
        ...getBoundedBusinessSettingsStringContext('tenantId', tenantId),
        ...extra,
    };
}

const hasDesktopPosSyncClipboardWrite = (): boolean => (
    typeof navigator !== 'undefined'
    && Boolean(navigator.clipboard)
    && typeof navigator.clipboard.writeText === 'function'
);

const hasDesktopPosSyncCopyFallback = (): boolean => (
    typeof document !== 'undefined'
    && typeof document.createElement === 'function'
    && typeof document.execCommand === 'function'
    && Boolean(document.body)
);

const copyDesktopPosSyncText = async (value: string): Promise<void> => {
    let clipboardWriteError: unknown;

    if (hasDesktopPosSyncClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(value);
            return;
        } catch (error) {
            clipboardWriteError = error;
            // Continue to the acknowledged textarea fallback before showing failure copy.
        }
    }

    if (!hasDesktopPosSyncCopyFallback()) {
        throw clipboardWriteError || new Error(DESKTOP_POS_SYNC_COPY_UNAVAILABLE);
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
        const copied = document.execCommand('copy');
        if (!copied) {
            throw new Error(DESKTOP_POS_SYNC_COPY_FALLBACK_FAILED);
        }
    } finally {
        document.body.removeChild(textarea);
    }
};

async function readDesktopPosSyncTestResponse(
    response: Response,
    storeId?: unknown,
    tenantId?: unknown,
): Promise<PosSyncTestResponse | null> {
    let payload: unknown;
    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            POS_SYNC_TEST_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logBusinessSettingsFailure(
            'desktop_pos_sync_test_response_parse_failed',
            error,
            buildPosSyncLogContext('test_connection', storeId, tenantId, {
                maxBytes: POS_SYNC_TEST_RESPONSE_JSON_MAX_BYTES,
                responseOk: response.ok,
                responseStatus: response.status,
            }),
        );
        return null;
    }

    if (!isPosSyncTestResponse(payload)) {
        logBusinessSettingsFailure(
            'desktop_pos_sync_test_response_invalid',
            createPosSyncStatusError('desktop_pos_sync_test_response_invalid', response.status),
            buildPosSyncLogContext('test_connection', storeId, tenantId, {
                maxBytes: POS_SYNC_TEST_RESPONSE_JSON_MAX_BYTES,
                responseOk: response.ok,
                responseStatus: response.status,
            }),
        );
        return null;
    }

    return payload;
}

const PosSyncTab: React.FC<PosSyncTabProps> = ({
    scrollRef,
    storeDetails,
    onStoreStateUpdate,
    onStoreUpdate,
}) => {
    const { message: messageApi } = App.useApp();
    const t = useTranslations('PosSync');
    const formatter = useFormatter();
    const { token } = theme.useToken();
    const { data: session } = useSession();
    const posSync = storeDetails?.posSync;
    const storeId = storeDetails?.storeId;
    const tenantId = storeDetails?.tenantId;
    const posSyncScopeKey = `${String(tenantId ?? '')}:${String(storeId ?? '')}`;
    const posSyncScopeKeyRef = useRef(posSyncScopeKey);
    posSyncScopeKeyRef.current = posSyncScopeKey;
    const componentActiveRef = useRef(true);
    const deliveryHistoryRequestGuardRef = useRef<ReturnType<typeof createLatestRequestGuard> | null>(null);
    if (!deliveryHistoryRequestGuardRef.current) {
        deliveryHistoryRequestGuardRef.current = createLatestRequestGuard();
    }
    const connectionTestRequestGuardRef = useRef<ReturnType<typeof createLatestRequestGuard> | null>(null);
    if (!connectionTestRequestGuardRef.current) {
        connectionTestRequestGuardRef.current = createLatestRequestGuard();
    }

    const [enabled, setEnabled] = useState(posSync?.enabled ?? false);
    const [webhookUrl, setWebhookUrl] = useState(posSync?.webhookUrl ?? '');
    const [webhookSecret, setWebhookSecret] = useState('');
    const [secretLoading, setSecretLoading] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [deliveryEntries, setDeliveryEntries] = useState<PosDeliveryHistoryEntry[]>([]);
    const [deliveryEntriesScopeKey, setDeliveryEntriesScopeKey] = useState('');
    const [loadingEntries, setLoadingEntries] = useState(false);
    const [secretVisible, setSecretVisible] = useState(false);
    const [regenerateSecretModalOpen, setRegenerateSecretModalOpen] = useState(false);
    const [regenerateSecretConfirmationText, setRegenerateSecretConfirmationText] = useState('');
    const [regeneratingSecret, setRegeneratingSecret] = useState(false);
    const [providerEmail, setProviderEmail] = useState('');
    const [sendingInstructions, setSendingInstructions] = useState(false);

    const visibleDeliveryEntries = deliveryEntriesScopeKey === posSyncScopeKey
        ? deliveryEntries
        : [];

    useEffect(() => {
        componentActiveRef.current = true;
        return () => {
            componentActiveRef.current = false;
        };
    }, []);

    const status = posSync?.status || 'disabled';
    const lastSentAt = posSync?.lastSentAt;
    const menuVersion = posSync?.menuVersion || 0;
    const trustBullets = [
        t('trustBullet1'),
        t('trustBullet2'),
        t('trustBullet3'),
        t('trustBullet4'),
    ];
    const useCases = [
        t('whoUse1'),
        t('whoUse2'),
        t('whoUse3'),
    ];

    const fetchDeliveryHistory = useCallback(async () => {
        if (!storeId || !tenantId) return;
        const requestScopeKey = `${String(tenantId)}:${String(storeId)}`;
        const requestId = deliveryHistoryRequestGuardRef.current!.begin();
        setLoadingEntries(true);
        try {
            const logsRef = collection(
                firebaseClient,
                DB_COLLECTIONS.STORES,
                String(storeId),
                DB_COLLECTIONS.POS_DELIVERY_LOGS,
            );
            const q = query(logsRef, orderBy('sentAt', 'desc'), limit(20));
            const snapshot = await getDocs(q);
            if (
                !deliveryHistoryRequestGuardRef.current!.isCurrent(requestId)
                || posSyncScopeKeyRef.current !== requestScopeKey
            ) {
                return;
            }
            const entries = snapshot.docs
                .map(document => parsePosDeliveryHistoryEntry(document.id, document.data()))
                .filter((entry): entry is PosDeliveryHistoryEntry => entry !== null);
            const rejectedEntryCount = snapshot.size - entries.length;
            if (rejectedEntryCount > 0) {
                logBusinessSettingsFailure(
                    'desktop_pos_sync_delivery_history_invalid_rows',
                    new Error('Invalid POS delivery history rows were rejected'),
                    buildPosSyncLogContext('load_delivery_history', storeId, tenantId, {
                        rejectedEntryCount,
                        requestedLimit: 20,
                    }),
                );
            }
            setDeliveryEntries(entries);
            setDeliveryEntriesScopeKey(requestScopeKey);
        } catch (error) {
            if (
                !deliveryHistoryRequestGuardRef.current!.isCurrent(requestId)
                || posSyncScopeKeyRef.current !== requestScopeKey
            ) {
                return;
            }
            logBusinessSettingsFailure(
                'desktop_pos_sync_delivery_history_load_failed',
                error,
                buildPosSyncLogContext('load_delivery_history', storeId, tenantId, {
                    enabled,
                    requestedLimit: 20,
                    ...getBoundedBusinessSettingsStringContext('status', status),
                }),
            );
        } finally {
            if (
                deliveryHistoryRequestGuardRef.current!.isCurrent(requestId)
                && posSyncScopeKeyRef.current === requestScopeKey
            ) {
                setLoadingEntries(false);
            }
        }
    }, [enabled, status, storeId, tenantId]);

    useEffect(() => {
        if (enabled && storeId) {
            fetchDeliveryHistory();
        } else {
            deliveryHistoryRequestGuardRef.current!.invalidate();
            setDeliveryEntries([]);
            setDeliveryEntriesScopeKey('');
            setLoadingEntries(false);
        }
        return () => {
            deliveryHistoryRequestGuardRef.current!.invalidate();
        };
    }, [enabled, storeId, fetchDeliveryHistory]);

    useEffect(() => () => {
        connectionTestRequestGuardRef.current!.invalidate();
    }, [posSyncScopeKey]);

    useEffect(() => {
        let active = true;
        setWebhookSecret('');
        setSecretVisible(false);
        if (!storeId || !tenantId) return () => { active = false; };

        setSecretLoading(true);
        requestPosSyncSecret({ action: 'read', storeId, tenantId })
            .then((result) => {
                if (active) {
                    setWebhookSecret(result.secret);
                    onStoreStateUpdate?.({
                        'posSync.secretVersion': result.version,
                        'posSync.webhookSecret': undefined,
                    });
                }
            })
            .catch((error: unknown) => {
                if (!active) return;
                if ((error as { status?: unknown })?.status === 404) return;
                logBusinessSettingsFailure(
                    'desktop_pos_sync_secret_load_failed',
                    error,
                    buildPosSyncLogContext('load_secret', storeId, tenantId),
                );
            })
            .finally(() => {
                if (active) setSecretLoading(false);
            });

        return () => { active = false; };
    }, [onStoreStateUpdate, storeId, tenantId]);

    const handleToggle = useCallback(async (checked: boolean) => {
        const requestScopeKey = `${String(tenantId ?? '')}:${String(storeId ?? '')}`;
        const previousEnabled = enabled;
        const previousWebhookSecret = webhookSecret;
        let ensuredSecret = webhookSecret;
        setEnabled(checked);

        const updates: Record<string, any> = {
            'posSync.enabled': checked,
            'posSync.status': checked ? 'healthy' : 'disabled',
            'posSync.consecutiveFailures': 0,
        };

        if (checked && !webhookSecret) {
            setSecretLoading(true);
            try {
                const result = await requestPosSyncSecret({ action: 'ensure', storeId, tenantId });
                ensuredSecret = result.secret;
                if (
                    componentActiveRef.current
                    && posSyncScopeKeyRef.current === requestScopeKey
                ) {
                    setWebhookSecret(result.secret);
                    onStoreStateUpdate?.({
                        'posSync.secretVersion': result.version,
                        'posSync.webhookSecret': undefined,
                    });
                }
            } catch (error) {
                logBusinessSettingsFailure(
                    'desktop_pos_sync_secret_ensure_failed',
                    error,
                    buildPosSyncLogContext('ensure_secret', storeId, tenantId),
                );
                if (
                    componentActiveRef.current
                    && posSyncScopeKeyRef.current === requestScopeKey
                ) {
                    setEnabled(previousEnabled);
                    messageApi.error('Could not prepare the verification secret. Try again.');
                }
                return;
            } finally {
                if (
                    componentActiveRef.current
                    && posSyncScopeKeyRef.current === requestScopeKey
                ) {
                    setSecretLoading(false);
                }
            }
            updates['posSync.menuVersion'] = 0;
            updates['posSync.lastStatus'] = 'never_sent';
            updates['posSync.lastError'] = '';
            updates['posSync.instructionsSentCount'] = 0;
            updates['posSync.instructionsSentDate'] = '';
        }

        try {
            if (!onStoreUpdate) {
                throw createPosSyncStatusError('desktop_pos_sync_settings_missing_store_update_handler');
            }
            await Promise.resolve(onStoreUpdate(updates));
        } catch (error) {
            logBusinessSettingsFailure(
                'desktop_pos_sync_toggle_save_failed',
                error,
                buildPosSyncLogContext('toggle_sync', storeId, tenantId, {
                    enabled: checked,
                    previousEnabled,
                    generatedSecret: !previousWebhookSecret && Boolean(ensuredSecret),
                    generatedSecretLength: !previousWebhookSecret ? ensuredSecret.length : 0,
                    previousWebhookSecretLength: previousWebhookSecret.length,
                }),
            );
            if (
                componentActiveRef.current
                && posSyncScopeKeyRef.current === requestScopeKey
            ) {
                setEnabled(previousEnabled);
                if (!ensuredSecret) setWebhookSecret(previousWebhookSecret);
                messageApi.error('Failed to save external sync settings.');
            }
        }
    }, [enabled, webhookSecret, onStoreUpdate, storeId, tenantId]);

    const handleSaveUrl = useCallback(async () => {
        if (!webhookUrl.trim()) return;
        const requestScopeKey = `${String(tenantId ?? '')}:${String(storeId ?? '')}`;
        const validation = validatePosSyncWebhookUrl(webhookUrl);
        if (!validation.valid || !validation.normalizedUrl) {
            messageApi.error(validation.error || 'Please enter a valid URL');
            return;
        }
        try {
            if (!onStoreUpdate) {
                throw createPosSyncStatusError('desktop_pos_sync_settings_missing_store_update_handler');
            }
            await Promise.resolve(onStoreUpdate({
                'posSync.webhookUrl': validation.normalizedUrl,
                'posSync.status': enabled ? 'healthy' : 'disabled',
                'posSync.lastError': '',
                'posSync.consecutiveFailures': 0,
            }));
            if (
                componentActiveRef.current
                && posSyncScopeKeyRef.current === requestScopeKey
            ) {
                setWebhookUrl(validation.normalizedUrl);
                messageApi.success('Provider connection URL saved');
            }
        } catch (error) {
            logBusinessSettingsFailure(
                'desktop_pos_sync_url_save_failed',
                error,
                buildPosSyncLogContext('save_provider_url', storeId, tenantId, {
                    webhookUrlLength: validation.normalizedUrl.length,
                    previousWebhookUrlLength: webhookUrl.trim().length,
                }),
            );
            if (
                componentActiveRef.current
                && posSyncScopeKeyRef.current === requestScopeKey
            ) {
                messageApi.error('Failed to save external sync settings.');
            }
        }
    }, [enabled, webhookUrl, onStoreUpdate, storeId, tenantId]);

    const handleTest = useCallback(async () => {
        if (!storeId || !tenantId) return;
        const requestScopeKey = `${String(tenantId)}:${String(storeId)}`;
        const requestId = connectionTestRequestGuardRef.current!.begin();
        setIsTesting(true);
        setTestResult(null);
        try {
            const res = await fetch('/api/pos-sync/test', {
                ...POS_SYNC_TEST_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeId, tenantId }),
            });
            const data = await readDesktopPosSyncTestResponse(res, storeId, tenantId);
            if (
                !connectionTestRequestGuardRef.current!.isCurrent(requestId)
                || posSyncScopeKeyRef.current !== requestScopeKey
            ) {
                return;
            }
            if (res.ok && isSuccessfulPosSyncTestResponse(data)) {
                setTestResult({
                    success: true,
                    message: `Connection reachable (${data.responseTime}ms, HTTP ${data.statusCode})`,
                });
                fetchDeliveryHistory();
            } else if (data) {
                logBusinessSettingsFailure(
                    'desktop_pos_sync_test_failed',
                    createPosSyncStatusError('desktop_pos_sync_test_rejected', res.status),
                    buildPosSyncLogContext('test_connection', storeId, tenantId, {
                        apiStatusCode: typeof data.statusCode === 'number' ? data.statusCode : undefined,
                        responseTimeMs: typeof data.responseTime === 'number' ? data.responseTime : undefined,
                    }),
                );
                setTestResult({
                    success: false,
                    message: POS_SYNC_TEST_FAILED_MESSAGE,
                });
            } else {
                setTestResult({
                    success: false,
                    message: POS_SYNC_TEST_FAILED_MESSAGE,
                });
            }
        } catch (error) {
            if (
                !connectionTestRequestGuardRef.current!.isCurrent(requestId)
                || posSyncScopeKeyRef.current !== requestScopeKey
            ) {
                return;
            }
            logBusinessSettingsFailure(
                'desktop_pos_sync_test_failed',
                error,
                buildPosSyncLogContext('test_connection', storeId, tenantId),
            );
            setTestResult({ success: false, message: POS_SYNC_TEST_FAILED_MESSAGE });
        } finally {
            if (
                connectionTestRequestGuardRef.current!.isCurrent(requestId)
                && posSyncScopeKeyRef.current === requestScopeKey
            ) {
                setIsTesting(false);
            }
        }
    }, [storeId, tenantId, fetchDeliveryHistory]);

    const handleRegenerateSecret = useCallback(() => {
        setRegenerateSecretConfirmationText('');
        setRegenerateSecretModalOpen(true);
    }, []);

    const buildSecretRotationAudit = useCallback(() => {
        const sessionUser = (session?.user || {}) as any;
        const rotatedAt = new Date().toISOString();
        const actorEmail = sessionUser.email || '';
        const actorUserId = String((session as any)?.uId || sessionUser.uId || sessionUser.id || sessionUser.email || 'unknown');

        return {
            actorEmail,
            actorUserId,
            rotatedAt,
        };
    }, [session]);

    const confirmSecretRegeneration = useCallback(async () => {
        if (regenerateSecretConfirmationText.trim() !== REGENERATE_SECRET_CONFIRMATION) {
            messageApi.error(`Type ${REGENERATE_SECRET_CONFIRMATION} to continue.`);
            return;
        }

        const requestScopeKey = `${String(tenantId ?? '')}:${String(storeId ?? '')}`;
        const secretRotationAudit = buildSecretRotationAudit();

        setSecretVisible(false);
        setRegeneratingSecret(true);

        try {
            const result = await requestPosSyncSecret({ action: 'rotate', storeId, tenantId });
            if (
                componentActiveRef.current
                && posSyncScopeKeyRef.current === requestScopeKey
            ) {
                setWebhookSecret(result.secret);
                onStoreStateUpdate?.({
                    'posSync.consecutiveFailures': 0,
                    'posSync.lastError': '',
                    'posSync.secretRotatedAt': secretRotationAudit.rotatedAt,
                    'posSync.secretRotatedByEmail': secretRotationAudit.actorEmail,
                    'posSync.secretRotatedByUserId': secretRotationAudit.actorUserId,
                    'posSync.secretVersion': result.version,
                    'posSync.status': enabled ? 'healthy' : 'disabled',
                    'posSync.webhookSecret': undefined,
                });
            }
        } catch (error) {
            logBusinessSettingsFailure(
                'desktop_pos_sync_secret_rotation_save_failed',
                error,
                buildPosSyncLogContext('secret_rotation_save', storeId, tenantId, {
                    hasPreviousWebhookSecret: Boolean(webhookSecret),
                    previousWebhookSecretLength: webhookSecret.length,
                    hasActorEmail: Boolean(secretRotationAudit.actorEmail),
                    hasActorUserId: Boolean(secretRotationAudit.actorUserId),
                }),
            );
            if (
                componentActiveRef.current
                && posSyncScopeKeyRef.current === requestScopeKey
            ) {
                messageApi.error('Could not save the new secret. Try again.');
            }
            return;
        } finally {
            if (
                componentActiveRef.current
                && posSyncScopeKeyRef.current === requestScopeKey
            ) {
                setRegeneratingSecret(false);
            }
        }

        logPosSyncSecretRotationAudit({
            actorEmail: secretRotationAudit.actorEmail,
            actorUserId: secretRotationAudit.actorUserId,
            rotatedAt: secretRotationAudit.rotatedAt,
            storeId,
            tenantId,
        });
        if (
            componentActiveRef.current
            && posSyncScopeKeyRef.current === requestScopeKey
        ) {
            setRegenerateSecretModalOpen(false);
            setRegenerateSecretConfirmationText('');
            messageApi.success('New secret generated. Use Copy to share it with your provider.');
        }
    }, [buildSecretRotationAudit, enabled, onStoreStateUpdate, regenerateSecretConfirmationText, storeId, tenantId, webhookSecret]);

    const handleCopySecret = useCallback(async () => {
        if (!webhookSecret) return;
        try {
            await copyDesktopPosSyncText(webhookSecret);
            messageApi.success('Secret copied to clipboard');
        } catch (error) {
            logBusinessSettingsFailure(
                'desktop_pos_sync_secret_copy_failed',
                error,
                buildPosSyncLogContext('copy_secret', storeId, tenantId, {
                    hasWebhookSecret: Boolean(webhookSecret),
                    webhookSecretLength: webhookSecret.length,
                    secretVisible,
                    hasClipboardWrite: hasDesktopPosSyncClipboardWrite(),
                    hasCopyFallback: hasDesktopPosSyncCopyFallback(),
                }),
            );
            messageApi.error('Unable to copy secret.');
        }
    }, [secretVisible, storeId, tenantId, webhookSecret]);

    const buildTechnicalSummary = useCallback(() => [
        'MenuList External Menu Sync — Setup Info',
        '',
        'Webhook URL: Your connected system HTTPS endpoint that accepts POST requests',
        'Payload: Full menu snapshot (JSON)',
        'Security: HMAC-SHA256 signed (header: X-MenuList-Signature)',
        'Documentation: https://menulist.ai/pos-sync',
        '',
        'Headers sent with every delivery:',
        '- X-MenuList-Signature: HMAC-SHA256 signature',
        '- X-MenuList-Event: menu.full.sync',
        '- X-MenuList-Version: Menu version number',
        '- X-MenuList-Timestamp: Unix timestamp',
        '- X-MenuList-Delivery-Id: Unique delivery ID',
        '',
        'The connected system must respond with HTTP 200 within 5 seconds.',
    ].join('\n'), []);

    const handleSendInstructions = useCallback(async () => {
        const recipient = providerEmail.trim();
        if (!recipient) return;
        if (!PROVIDER_EMAIL_PATTERN.test(recipient)) {
            messageApi.error('Enter a valid provider email');
            return;
        }

        setSendingInstructions(true);
        try {
            const MAX_SENDS_PER_DAY = 3;
            const today = new Date().toISOString().split('T')[0];
            const sentDate = posSync?.instructionsSentDate || '';
            const sentCount = sentDate === today ? (posSync?.instructionsSentCount || 0) : 0;

            if (sentCount >= MAX_SENDS_PER_DAY) {
                messageApi.error(`Maximum ${MAX_SENDS_PER_DAY} instruction emails per day. Try again tomorrow.`);
                return;
            }

            if (!onStoreUpdate) {
                throw createPosSyncStatusError('desktop_pos_sync_settings_missing_store_update_handler');
            }
            await Promise.resolve(onStoreUpdate({
                'posSync.instructionsSentCount': sentCount + 1,
                'posSync.instructionsSentDate': today,
            }));

            const subject = encodeURIComponent('MenuList External Menu Sync setup');
            const body = encodeURIComponent(buildTechnicalSummary());
            window.location.href = `mailto:${encodeURIComponent(recipient)}?subject=${subject}&body=${body}`;

            messageApi.success(`Email draft prepared (${MAX_SENDS_PER_DAY - sentCount - 1} sends remaining today)`);
            setProviderEmail('');
        } catch (error) {
            logBusinessSettingsFailure(
                'desktop_pos_sync_instructions_prepare_failed',
                error,
                buildPosSyncLogContext('prepare_provider_instructions', storeId, tenantId, {
                    ...getBoundedBusinessSettingsStringContext('providerEmail', recipient),
                    technicalSummaryLength: buildTechnicalSummary().length,
                }),
            );
            messageApi.error('Failed to prepare instructions');
        } finally {
            setSendingInstructions(false);
        }
    }, [buildTechnicalSummary, providerEmail, posSync, onStoreUpdate, storeId, tenantId]);

    const handleCopyTechnicalSummary = useCallback(async () => {
        const technicalSummary = buildTechnicalSummary();
        try {
            await copyDesktopPosSyncText(technicalSummary);
            messageApi.success('Technical summary copied');
        } catch (error) {
            logBusinessSettingsFailure(
                'desktop_pos_sync_technical_summary_copy_failed',
                error,
                buildPosSyncLogContext('copy_technical_summary', storeId, tenantId, {
                    technicalSummaryLength: technicalSummary.length,
                    hasClipboardWrite: hasDesktopPosSyncClipboardWrite(),
                    hasCopyFallback: hasDesktopPosSyncCopyFallback(),
                }),
            );
            messageApi.error('Could not copy technical summary');
        }
    }, [buildTechnicalSummary, storeId, tenantId]);

    const handleDownloadSample = useCallback(() => {
        const sample = {
            event: 'menu.full.sync',
            version: 1,
            timestamp: new Date().toISOString(),
            tenantId: 0,
            projectId: 'sample',
            storeId: 0,
            currency: storeDetails?.currencyCode || 'INR',
            languages: [{ code: 'en', name: 'English', isPrimary: true }],
            menu: {
                categories: [
                    { id: 'cat_1', active: true, name: { en: 'Starters' }, orderIndex: 0 },
                ],
                items: [
                    {
                        id: 'item_1',
                        category: 'cat_1',
                        active: true,
                        available: true,
                        name: { en: 'Paneer Tikka' },
                        description: { en: 'Cottage cheese marinated in spices' },
                        price: '280',
                        tags: ['Vegetarian'],
                        isBestSeller: true,
                        duration: 15,
                        attributes: [
                            { id: 'item_1a1', name: { en: 'Half' }, price: '180', active: true },
                            { id: 'item_1a2', name: { en: 'Full' }, price: '280', active: true },
                        ],
                        orderIndex: 0,
                    },
                ],
            },
        };

        const sampleJson = JSON.stringify(sample, null, 2);
        let url: string | null = null;
        try {
            const blob = new Blob([sampleJson], { type: 'application/json' });
            url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'menulist-external-menu-sync-sample.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            logBusinessSettingsFailure(
                'desktop_pos_sync_sample_download_failed',
                error,
                buildPosSyncLogContext('download_sample_payload', storeId, tenantId, {
                    sampleJsonLength: sampleJson.length,
                    ...getBoundedBusinessSettingsStringContext('currency', sample.currency),
                }),
            );
            messageApi.error('Could not download sample payload');
        } finally {
            if (url) {
                URL.revokeObjectURL(url);
            }
        }
    }, [storeDetails?.currencyCode, storeId, tenantId]);

    const getStatusBadge = () => {
        switch (status) {
            case 'healthy':
                return <Badge status="success" text="Connected" />;
            case 'retrying':
                return <Badge status="processing" text="Retrying" />;
            case 'connection_issue':
                return <Badge status="error" text="Connection issue" />;
            default:
                return <Badge status="default" text="Disabled" />;
        }
    };

    const deliveryColumns = [
        {
            title: 'Time',
            dataIndex: 'sentAt',
            key: 'sentAt',
            width: 160,
            render: (val: string) => val ? formatDateTime(val, 'datetime', formatter) : '—',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (val: string) => {
                const color = val === 'success' ? 'green' : val === 'timeout' ? 'orange' : 'red';
                return <Tag color={color}>{val}</Tag>;
            },
        },
        {
            title: 'Code',
            dataIndex: 'responseCode',
            key: 'responseCode',
            width: 70,
            render: (val: number | null) => val ?? '—',
        },
        {
            title: 'Version',
            dataIndex: 'menuVersion',
            key: 'menuVersion',
            width: 80,
        },
        {
            title: 'Duration',
            dataIndex: 'duration',
            key: 'duration',
            width: 90,
            render: (val: number) => `${val}ms`,
        },
    ];

    if (!FEATURE_FLAGS.ENABLE_POS_SYNC) {
        return null;
    }

    return (
        <Card size="small" ref={scrollRef}>
            <Flex align="center" gap={8}>
                <LuShield size={20} style={{ color: token.colorPrimary }} />
                <Title level={5} style={{ margin: 'unset' }}>
                    {t('title')}
                </Title>
            </Flex>
            <Divider />

            {/* Section 1: Owner explanation */}
            <Flex
                vertical
                gap={12}
                style={{
                    background: token.colorFillAlter,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    borderRadius: 8,
                    marginBottom: 16,
                    padding: 16,
                }}
            >
                <Flex vertical gap={6}>
                    <Tag color="blue" style={{ alignSelf: 'flex-start' }}>{t('truthProtected')}</Tag>
                    <Title level={5} style={{ margin: 0 }}>{t('connectIntroTitle')}</Title>
                    <Text type="secondary">{t('connectIntroDesc')}</Text>
                </Flex>

                <Flex
                    align="center"
                    gap={12}
                    justify="space-between"
                    style={{
                        background: token.colorBgContainer,
                        border: `1px solid ${token.colorBorderSecondary}`,
                        borderRadius: 8,
                        padding: 12,
                    }}
                >
                    <Text strong>{t('diagramSource')}</Text>
                    <LuArrowRight color={token.colorPrimary} size={18} />
                    <Text strong>{t('diagramDestination')}</Text>
                </Flex>

                <Flex gap={12} wrap="wrap">
                    {trustBullets.map((bullet) => (
                        <Flex align="flex-start" gap={8} key={bullet} style={{ flex: '1 1 240px' }}>
                            <LuCheck color={token.colorSuccess} size={16} style={{ flex: '0 0 auto', marginTop: 3 }} />
                            <Text>{bullet}</Text>
                        </Flex>
                    ))}
                </Flex>

                <Collapse
                    defaultActiveKey={['who']}
                    ghost
                    items={[{
                        key: 'who',
                        label: <Text strong>{t('whoUseTitle')}</Text>,
                        children: (
                            <Flex vertical gap={8}>
                                <Text>{t('whoUseIntro')}</Text>
                                {useCases.map((useCase) => (
                                    <Flex align="flex-start" gap={8} key={useCase}>
                                        <LuCheck color={token.colorSuccess} size={16} style={{ flex: '0 0 auto', marginTop: 3 }} />
                                        <Text>{useCase}</Text>
                                    </Flex>
                                ))}
                                <Text type="secondary">{t('whoIgnore')}</Text>
                            </Flex>
                        ),
                    }]}
                />

                <Text type="secondary">{t('truthProtectedDesc')}</Text>
            </Flex>

            {/* Section 2: Status Header */}
            {!enabled && (
                <Alert
                    type="info"
                    showIcon
                    message={t('disabledStatus')}
                    description={t('disabledStatusDesc')}
                    style={{ marginBottom: 16 }}
                />
            )}

            {enabled && (
                <Flex vertical gap={8} style={{ marginBottom: 16 }}>
                    {status === 'connection_issue' && (
                        <Alert
                            type="warning"
                            showIcon
                            icon={<LuWifiOff />}
                            message={t('connectionIssue')}
                            description={t('connectionIssueDesc')}
                        />
                    )}
                    {status === 'healthy' && (
                        <Flex align="center" gap={8}>
                            <Badge status="success" />
                            <Text type="secondary">
                                {t('connectedStatus')}
                                {lastSentAt && ` — ${t('version', { version: menuVersion })}`}
                            </Text>
                        </Flex>
                    )}
                </Flex>
            )}

            {/* Section 3: Enable & Config */}
            <Flex vertical gap={16}>
                <Flex justify="space-between" align="center">
                    <Flex vertical>
                        <Text strong>{t('enablePosSync')}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {t('enablePosSyncDesc')}
                        </Text>
                    </Flex>
                    <Switch aria-label={t('enablePosSync')} checked={enabled} disabled={secretLoading} onChange={(checked) => void handleToggle(checked)} />
                </Flex>

                {enabled && (
                    <>
                        <Flex vertical gap={8}>
                            <Text strong>{t('webhookUrl')}</Text>
                            <Space.Compact style={{ width: '100%' }}>
                                <Input
                                    value={webhookUrl}
                                    onChange={e => setWebhookUrl(e.target.value)}
                                    placeholder={t('webhookUrlPlaceholder')}
                                />
                                <Button onClick={handleSaveUrl} type="primary">
                                    {t('save' as any)}
                                </Button>
                            </Space.Compact>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {t('webhookUrlHelp')}
                            </Text>
                        </Flex>

                        <Flex vertical gap={8}>
                            <Flex justify="space-between" align="center">
                                <Text strong>{t('signingSecret')}</Text>
                                <Space>
                                    <Tooltip title={t('copySecret')}>
                                        <Button
                                            aria-label={t('copySecret')}
                                            disabled={!webhookSecret || secretLoading}
                                            size="small"
                                            icon={<LuCopy size={14} />}
                                            onClick={() => void handleCopySecret()}
                                        />
                                    </Tooltip>
                                    <Tooltip title={t('regenerateSecret')}>
                                        <Button
                                            aria-label={t('regenerateSecret')}
                                            disabled={secretLoading}
                                            size="small"
                                            icon={<LuRefreshCw size={14} />}
                                            onClick={handleRegenerateSecret}
                                        />
                                    </Tooltip>
                                </Space>
                            </Flex>
                            <Input
                                disabled={secretLoading}
                                placeholder={secretLoading ? 'Loading secure secret…' : 'Secret not configured'}
                                value={secretVisible ? webhookSecret : formatWebhookSecretPreview(webhookSecret)}
                                readOnly
                                suffix={(
                                    <Tooltip title={secretVisible ? 'Hide secret' : 'Reveal secret'}>
                                        <Button
                                            aria-label={secretVisible ? 'Hide secret' : 'Reveal secret'}
                                            disabled={!webhookSecret || secretLoading}
                                            icon={secretVisible ? <LuEyeOff size={14} /> : <LuEye size={14} />}
                                            onClick={() => setSecretVisible((current) => !current)}
                                            size="small"
                                            type="text"
                                        />
                                    </Tooltip>
                                )}
                            />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {t('signingSecretHelp')}
                            </Text>
                        </Flex>

                        <Divider style={{ margin: '8px 0' }} />

                        {/* Section 3: Test Connection */}
                        <Flex vertical gap={8}>
                            <Flex align="center" gap={8}>
                                <Button
                                    icon={<LuWifi size={14} />}
                                    onClick={handleTest}
                                    loading={isTesting}
                                    disabled={!webhookUrl.trim() || !webhookSecret || secretLoading}
                                >
                                    {t('sendTest')}
                                </Button>
                                {getStatusBadge()}
                            </Flex>
                            {testResult && (
                                <Alert
                                    type={testResult.success ? 'success' : 'error'}
                                    showIcon
                                    icon={testResult.success ? <LuCheck size={14} /> : <LuX size={14} />}
                                    message={testResult.message}
                                    style={{ marginTop: 4 }}
                                />
                            )}
                        </Flex>

                        <Divider style={{ margin: '8px 0' }} />

                        {/* Section 4: Delivery Status */}
                        {menuVersion > 0 && (
                            <Flex vertical gap={4} style={{ marginBottom: 8 }}>
                                <Text strong>{t('deliveryStatus')}</Text>
                                <Flex gap={16}>
                                    <Text type="secondary">
                                        {t('menuVersion')}: <Text strong>{menuVersion}</Text>
                                    </Text>
                                    <Text type="secondary">
                                        {t('lastStatus')}: <Text strong>{posSync?.lastStatus || t('neverSent')}</Text>
                                    </Text>
                                </Flex>
                            </Flex>
                        )}

                        {/* Section 6: Updates sent */}
                        <Flex vertical gap={8}>
                            <Flex justify="space-between" align="center">
                                <Text strong>{t('recentDeliveries')}</Text>
                                <Button
                                    size="small"
                                    icon={<LuRefreshCw size={12} />}
                                    onClick={fetchDeliveryHistory}
                                    loading={loadingEntries}
                                >
                                    {t('refresh' as any)}
                                </Button>
                            </Flex>
                            <Table
                                dataSource={visibleDeliveryEntries}
                                columns={deliveryColumns}
                                rowKey="deliveryId"
                                size="small"
                                pagination={false}
                                loading={loadingEntries}
                                locale={{ emptyText: t('noDeliveries') }}
                                scroll={{ x: 500 }}
                            />
                        </Flex>

                        <Divider style={{ margin: '8px 0' }} />

                        {/* Activation Helpers */}
                        <Flex vertical gap={12}>
                            <Text strong>{t('setupTools')}</Text>

                            <Flex vertical gap={8}>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {t('sendInstructions')}
                                </Text>
                                <Space.Compact style={{ width: '100%' }}>
                                    <Input
                                        value={providerEmail}
                                        onChange={e => setProviderEmail(e.target.value)}
                                        placeholder="provider@example.com"
                                        type="email"
                                    />
                                    <Button
                                        icon={<LuSend size={14} />}
                                        onClick={() => void handleSendInstructions()}
                                        loading={sendingInstructions}
                                        disabled={!providerEmail.trim()}
                                    >
                                        {t('send' as any)}
                                    </Button>
                                </Space.Compact>
                            </Flex>

                            <Flex gap={8} wrap="wrap">
                                <Button
                                    size="small"
                                    icon={<LuDownload size={12} />}
                                    onClick={handleDownloadSample}
                                >
                                    {t('downloadSamplePayload')}
                                </Button>
                                <Button
                                    size="small"
                                    icon={<LuCopy size={12} />}
                                    onClick={() => void handleCopyTechnicalSummary()}
                                >
                                    {t('copyTechnicalSummary')}
                                </Button>
                            </Flex>
                        </Flex>
                    </>
                )}
            </Flex>

            <Modal
                title="Regenerate verification secret"
                open={regenerateSecretModalOpen}
                confirmLoading={regeneratingSecret}
                onOk={() => void confirmSecretRegeneration()}
                onCancel={() => {
                    if (regeneratingSecret) return;
                    setRegenerateSecretModalOpen(false);
                    setRegenerateSecretConfirmationText('');
                }}
                okText="Regenerate"
                okButtonProps={{
                    danger: true,
                    disabled: regeneratingSecret || regenerateSecretConfirmationText.trim() !== REGENERATE_SECRET_CONFIRMATION,
                }}
            >
                <Flex vertical gap={12}>
                    <Text>
                        The current secret will stop working immediately. Share the new secret with your provider or their existing connection will fail.
                    </Text>
                    <Text type="secondary">
                        Type {REGENERATE_SECRET_CONFIRMATION} to confirm.
                    </Text>
                    <Input
                        value={regenerateSecretConfirmationText}
                        onChange={(event) => setRegenerateSecretConfirmationText(event.target.value)}
                        placeholder={`Type ${REGENERATE_SECRET_CONFIRMATION}`}
                    />
                </Flex>
            </Modal>
        </Card>
    );
};

export default PosSyncTab;
