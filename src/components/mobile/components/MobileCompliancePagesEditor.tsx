'use client'

import { useEffect, useMemo, useState } from 'react';
import { LuEye, LuPenLine, LuRotateCcw } from 'react-icons/lu';
import { Button, Card, Flex, NavBar, Popup, Text, TextArea, Toast } from '../antd';

type ComplianceTab = 'privacy' | 'terms' | 'refund';
type CompliancePageData = { content: string; customContent?: string; source: string; systemContent?: string } | null;

interface MobileCompliancePagesEditorProps {
    compact?: boolean;
    domain?: string;
    type: ComplianceTab;
}

const TAB_LABELS: Record<ComplianceTab, string> = {
    privacy: 'Privacy Policy',
    terms: 'Terms & Conditions',
    refund: 'Refund & Cancellation Policy',
};

export default function MobileCompliancePagesEditor({ compact, domain, type }: MobileCompliancePagesEditorProps) {
    const [pages, setPages] = useState<Record<ComplianceTab, CompliancePageData>>({
        privacy: null,
        refund: null,
        terms: null,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [customText, setCustomText] = useState('');

    const pageLabel = TAB_LABELS[type];
    const currentData = pages[type];
    const pageUrl = useMemo(() => domain ? `https://${domain}/${type}` : `/${type}`, [domain, type]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/compliance');
            if (!response.ok) return;
            const data = await response.json();
            setPages({
                privacy: data?.privacy || null,
                refund: data?.refund || null,
                terms: data?.terms || null,
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchData();
    }, []);

    const openSheet = () => {
        setCustomText(currentData?.customContent || '');
        setIsEditing(false);
        setIsOpen(true);
    };

    const handleSave = async () => {
        if (!customText.trim() || customText.trim().length < 100) {
            Toast.show({ content: 'Content must be at least 100 characters.', duration: 1500 });
            return;
        }

        try {
            setSaving(true);
            const response = await fetch('/api/compliance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'override',
                    content: customText,
                    type,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                Toast.show({ content: data?.error || 'Failed to save.', duration: 1500 });
                return;
            }
            await fetchData();
            setIsEditing(false);
            Toast.show({ content: `${pageLabel} updated.`, duration: 1200 });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        try {
            setResetting(true);
            const response = await fetch('/api/compliance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'reset',
                    type,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                Toast.show({ content: data?.error || 'Failed to reset.', duration: 1500 });
                return;
            }
            await fetchData();
            setCustomText('');
            setIsEditing(false);
            Toast.show({ content: `${pageLabel} reset to default.`, duration: 1200 });
        } finally {
            setResetting(false);
        }
    };

    return (
        <>
            <Button
                fill="none"
                onClick={openSheet}
                size="small"
                style={{
                    flex: '0 0 auto',
                    minWidth: compact ? 36 : 40,
                    paddingInline: 8,
                }}
            >
                {currentData?.source === 'custom' ? <LuPenLine size={18} /> : <LuEye size={18} />}
            </Button>

            <Popup
                bodyStyle={{ height: '100vh', maxHeight: '100vh', overflow: 'hidden', padding: 0 }}
                onMaskClick={() => setIsOpen(false)}
                position="bottom"
                visible={isOpen}
            >
                <Flex style={{ height: '100vh', maxHeight: '100vh', minHeight: '100vh' }} vertical>
                    <NavBar onBack={() => setIsOpen(false)}>
                        {pageLabel}
                    </NavBar>

                    <Flex gap={12} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }} vertical>
                        <Card size="small">
                            <Flex gap={6} vertical>
                                <Text strong>{currentData?.source === 'custom' ? 'Custom content + MenuList baseline' : 'MenuList baseline only'}</Text>
                                <Text type="secondary">
                                    Your text appears first. MenuList baseline policy content and platform disclosures stay appended automatically.
                                </Text>
                            </Flex>
                        </Card>

                        {loading ? (
                            <Text type="secondary">Loading policy content...</Text>
                        ) : (
                            <>
                                <Card size="small">
                                    <Flex gap={6} vertical>
                                        <Text strong>Current page content</Text>
                                        <Text style={{ fontSize: 12, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                                            {currentData?.content || 'MenuList baseline policy content will be generated automatically from your business information.'}
                                        </Text>
                                    </Flex>
                                </Card>

                                {isEditing ? (
                                    <Card size="small">
                                        <Flex gap={10} vertical>
                                            <Text strong>Your custom content</Text>
                                            <TextArea
                                                autoSize={{ minRows: 12, maxRows: 22 }}
                                                maxLength={15000}
                                                onChange={setCustomText}
                                                placeholder={`Add your ${pageLabel.toLowerCase()} text here...`}
                                                showCount
                                                value={customText}
                                            />
                                        </Flex>
                                    </Card>
                                ) : null}
                            </>
                        )}
                    </Flex>

                    <Flex
                        gap={8}
                        style={{
                            backdropFilter: 'blur(10px)',
                            backgroundColor: '#fff',
                            borderTop: '1px solid rgba(5, 5, 5, 0.06)',
                            padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
                        }}
                        vertical
                    >
                        <Flex gap={8}>
                            <Button block fill="outline" onClick={() => window.open(pageUrl, '_blank')} size="large">
                                View page
                            </Button>
                            <Button block fill="outline" onClick={() => setIsEditing((previous) => !previous)} size="large">
                                {isEditing ? 'Hide editor' : 'Edit content'}
                            </Button>
                        </Flex>
                        <Flex gap={8}>
                            <Button
                                block
                                color="danger"
                                disabled={currentData?.source !== 'custom'}
                                fill="outline"
                                loading={resetting}
                                onClick={() => void handleReset()}
                                size="large"
                            >
                                <Flex align="center" gap={6} justify="center">
                                    <LuRotateCcw size={16} />
                                    <Text>Reset</Text>
                                </Flex>
                            </Button>
                            <Button block disabled={!isEditing} loading={saving} onClick={() => void handleSave()} size="large">
                                Save
                            </Button>
                        </Flex>
                    </Flex>
                </Flex>
            </Popup>
        </>
    );
}
