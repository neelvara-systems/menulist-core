'use client';

/**
 * OutletRenameModal — Owner dashboard UI for outlet slug rename.
 *
 * T2-N-01 / G-07 PUBLIC-ROUTING-DOCTRINE: surfaces the
 * `/api/outlets/rename` endpoint in the dashboard. Shipped alongside the
 * API (prior session) but had no UI; this modal completes the loop.
 *
 * Doctrinal warning surfaced inline: renaming an outlet is allowed because
 * `previousOutletSlugs[]` keeps old URLs 301-redirecting to the new slug
 * for the 12-month chain window. The chain is capped at 5 entries, so
 * frequent renames silently drop the oldest — owners must be told.
 *
 * @see src/app/api/outlets/rename/route.ts — server contract
 * @see __docs__/client-menu/PUBLIC-ROUTING-DOCTRINE.md §A-02, §7, G-07
 */

import { slugify } from '@lib/utils/slugify';
import { Alert, Form, Input, Modal, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';

const { Text } = Typography;

interface OutletRenameModalProps {
    open: boolean;
    outletStoreId?: string | number;
    currentOutletSlug?: string;
    currentOutletName?: string;
    onClose: () => void;
    onRenamed?: (result: { outletStoreId: string; newSlug: string }) => void;
}

export default function OutletRenameModal({
    open,
    outletStoreId,
    currentOutletSlug,
    currentOutletName,
    onClose,
    onRenamed,
}: OutletRenameModalProps) {
    const [newName, setNewName] = useState('');
    const [newSlug, setNewSlug] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setNewName(currentOutletName || '');
            setNewSlug('');
            setSubmitting(false);
        }
    }, [open, currentOutletName]);

    const proposedSlug = useMemo(() => {
        const raw = newSlug.trim() || newName.trim();
        return raw ? slugify(raw) : '';
    }, [newSlug, newName]);

    const slugChanged = proposedSlug && proposedSlug !== (currentOutletSlug || '').toLowerCase();

    const handleSubmit = async () => {
        if (!outletStoreId || !proposedSlug) return;
        setSubmitting(true);
        try {
            const res = await fetch('/api/outlets/rename', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    outletStoreId,
                    newOutletName: newName.trim() || undefined,
                    newOutletSlug: proposedSlug,
                }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                message.error(body?.error || 'Rename failed');
                return;
            }
            message.success(`Outlet renamed to /${body.outletSlug}`);
            onRenamed?.({ outletStoreId: String(outletStoreId), newSlug: body.outletSlug });
            onClose();
        } catch (err) {
            message.error('Rename failed — please try again');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            open={open}
            title="Rename outlet URL"
            onCancel={submitting ? undefined : onClose}
            onOk={handleSubmit}
            okText="Rename outlet"
            okButtonProps={{
                disabled: !slugChanged || submitting || !outletStoreId,
                loading: submitting,
            }}
            cancelButtonProps={{ disabled: submitting }}
            destroyOnClose
        >
            <Alert
                type="info"
                showIcon
                message="Old URLs keep working"
                description={
                    <>
                        Existing printed QRs and shared links for
                        {' '}
                        <Text code>/{currentOutletSlug || '…'}</Text>
                        {' '}
                        will redirect to the new URL for 12 months. This chain
                        is capped — if you rename this outlet more than 5 times,
                        the oldest URL stops redirecting.
                    </>
                }
                style={{ marginBottom: 16 }}
            />

            <Form layout="vertical">
                <Form.Item
                    label="New outlet name"
                    help="Used in breadcrumbs, OBP, and the owner dashboard."
                >
                    <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Pune Central"
                        maxLength={200}
                        disabled={submitting}
                    />
                </Form.Item>

                <Form.Item
                    label="New outlet URL segment"
                    help="Leave blank to auto-derive from the name. Lowercase letters, digits, and hyphens only."
                >
                    <Input
                        value={newSlug}
                        onChange={(e) => setNewSlug(e.target.value)}
                        placeholder={currentOutletSlug || 'pune-central'}
                        maxLength={60}
                        disabled={submitting}
                        addonBefore="/"
                    />
                </Form.Item>

                {proposedSlug ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        New outlet URL will be{' '}
                        <Text code>/{proposedSlug}</Text>
                    </Text>
                ) : null}
            </Form>
        </Modal>
    );
}
