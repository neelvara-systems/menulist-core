'use client';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { logAnswerlatticeFailure } from '@lib/answerlattice/diagnostics';
import {
    readJsonResponseWithLimit,
    readResponseUint8ArrayWithLimit,
} from '@lib/security/boundedResponseBody';
import { useAnswerlatticeAccess } from '@providers/answerlatticeAccessProvider';
import { Alert, Button, Card, Flex, Typography, message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LuDownload } from 'react-icons/lu';

const { Text } = Typography;
const EXPORT_ERROR_RESPONSE_MAX_BYTES = 32 * 1024;
const EXPORT_DOWNLOAD_MAX_BYTES = 8 * 1024 * 1024;
const EXPORT_REQUEST_POLICY: RequestInit = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const getExportErrorMessage = (value: unknown) => (
    isRecord(value) && typeof value.error === 'string'
        ? value.error.slice(0, 240)
        : 'Could not create the support truth export.'
);

const getDownloadFilename = (response: Response) => {
    const disposition = response.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="([a-zA-Z0-9._-]+)"/);
    return match?.[1] || `answerlattice-support-truth-${new Date().toISOString().slice(0, 10)}.json`;
};

export default function AnswerlatticeSupportTruthExport() {
    const { access } = useAnswerlatticeAccess();
    const [exporting, setExporting] = useState(false);
    const scopeKey = access ? `${access.scope.tenantId}:${access.scope.storeId}` : null;
    const scopeKeyRef = useRef(scopeKey);
    scopeKeyRef.current = scopeKey;
    const exportInFlightRef = useRef(false);
    const exportAbortRef = useRef<AbortController | null>(null);
    const canExport = access?.isPlatformAdmin === true
        || access?.permissions?.[ANSWERLATTICE_PERMISSION_KEYS.EXPORT_DATA] === true;

    useEffect(() => {
        exportAbortRef.current?.abort();
        exportAbortRef.current = null;
        exportInFlightRef.current = false;
        setExporting(false);
        return () => {
            exportAbortRef.current?.abort();
        };
    }, [scopeKey]);

    const handleExport = useCallback(async () => {
        if (!scopeKey || exportInFlightRef.current) return;
        const requestScopeKey = scopeKey;
        const controller = new AbortController();
        exportInFlightRef.current = true;
        exportAbortRef.current = controller;
        setExporting(true);
        try {
            const response = await fetch('/api/answerlattice/support-truth-export', {
                ...EXPORT_REQUEST_POLICY,
                method: 'POST',
                signal: controller.signal,
            });
            if (!response.ok) {
                const payload = await readJsonResponseWithLimit<unknown>(
                    response,
                    EXPORT_ERROR_RESPONSE_MAX_BYTES,
                ).catch(() => null);
                throw new Error(getExportErrorMessage(payload));
            }

            const bytes = await readResponseUint8ArrayWithLimit(response, EXPORT_DOWNLOAD_MAX_BYTES);
            if (scopeKeyRef.current !== requestScopeKey || controller.signal.aborted) return;
            const blob = new Blob([bytes], { type: 'application/json;charset=utf-8' });

            const downloadUrl = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = downloadUrl;
            anchor.download = getDownloadFilename(response);
            anchor.rel = 'noopener';
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(downloadUrl);
            message.success('Support truth export created');
        } catch (error) {
            if (
                controller.signal.aborted
                || scopeKeyRef.current !== requestScopeKey
                || (error instanceof DOMException && error.name === 'AbortError')
            ) {
                return;
            }
            logAnswerlatticeFailure('answerlattice_support_truth_export_download_failed', error);
            message.error(error instanceof Error ? error.message : 'Could not create the support truth export.');
        } finally {
            if (exportAbortRef.current === controller) {
                exportAbortRef.current = null;
                exportInFlightRef.current = false;
                if (scopeKeyRef.current === requestScopeKey) setExporting(false);
            }
        }
    }, [scopeKey]);

    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SUPPORT_TRUTH_EXPORT || !canExport) {
        return null;
    }

    return (
        <Card title={<Flex align="center" gap={8}><LuDownload size={16} /> Support Truth Export</Flex>}>
            <Flex vertical gap={14}>
                <Alert
                    type="info"
                    showIcon
                    message="Download approved support knowledge as JSON."
                    description="Includes active product structure, approved answers, mapped surfaces, published articles and FAQs, changelog entries, and release records. Private conversations, tickets, secrets, embeddings, and audit logs are excluded."
                />
                <Flex align="center" justify="space-between" gap={12} wrap="wrap">
                    <Text type="secondary">
                        Export runs only when you request it. Oversized workspaces stop safely instead of returning an incomplete package.
                    </Text>
                    <Button
                        type="primary"
                        icon={<LuDownload size={15} />}
                        loading={exporting}
                        onClick={handleExport}
                    >
                        Download JSON
                    </Button>
                </Flex>
            </Flex>
        </Card>
    );
}
