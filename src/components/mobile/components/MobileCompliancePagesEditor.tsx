'use client'

import { theme } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { LuEye, LuPenLine, LuRotateCcw } from 'react-icons/lu';
import { Button, Card, Flex, NavBar, Popup, Text, TextArea, Toast } from '../antd';

type ComplianceTab = 'privacy' | 'terms' | 'refund';
type CompliancePageData = { content: string; customContent?: string; source: string; systemContent?: string } | null;

interface MobileCompliancePagesEditorProps {
    baseUrl?: string;
    compact?: boolean;
    type: ComplianceTab;
}

const TAB_LABELS: Record<ComplianceTab, string> = {
    privacy: 'Privacy Policy',
    terms: 'Terms & Conditions',
    refund: 'Refund & Cancellation Policy',
};

export default function MobileCompliancePagesEditor({ baseUrl, compact, type }: MobileCompliancePagesEditorProps) {
    const { token } = theme.useToken();
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
    const [isBaselineExpanded, setIsBaselineExpanded] = useState(false);
    const [customText, setCustomText] = useState('');

    const pageLabel = TAB_LABELS[type];
    const currentData = pages[type];
    const pageUrl = useMemo(() => {
        if (!baseUrl) return `/${type}`;
        return `${baseUrl.replace(/\/$/, '')}/${type}`;
    }, [baseUrl, type]);

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
        setIsBaselineExpanded(false);
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
                    <NavBar
                        onBack={() => setIsOpen(false)}
                        right={
                            <Button fill="none" onClick={() => window.open(pageUrl, '_blank')} size="small">
                                View page
                            </Button>
                        }
                    >
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
                                        <Text strong>Your current content</Text>
                                        <Text type="secondary">
                                            {currentData?.customContent?.trim()
                                                ? 'This is the owner content that appears before the MenuList baseline section.'
                                                : 'No custom content added yet. Only the MenuList baseline section is currently shown on the public page.'}
                                        </Text>
                                        {currentData?.customContent?.trim() ? (
                                            <Text style={{ fontSize: 12, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                                                {currentData.customContent}
                                            </Text>
                                        ) : null}
                                    </Flex>
                                </Card>

                                <Card
                                    size="small"
                                    onClick={() => setIsBaselineExpanded((previous) => !previous)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <Flex gap={6} vertical>
                                        <Flex align="center" justify="space-between">
                                            <Text strong>MenuList baseline content</Text>
                                            <Text type="secondary">{isBaselineExpanded ? 'Hide' : 'Show'}</Text>
                                        </Flex>
                                        <Text type="secondary">
                                            This baseline policy and platform disclosure content is appended automatically.
                                        </Text>
                                        {isBaselineExpanded ? (
                                            <Text style={{ fontSize: 12, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                                                {currentData?.systemContent || 'MenuList baseline policy content will be generated automatically from your business information.'}
                                            </Text>
                                        ) : null}
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
                            backgroundColor: token.colorBgContainer,
                            borderTop: `1px solid ${token.colorBorderSecondary}`,
                            padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
                        }}
                        vertical
                    >
                        {isEditing ? (
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
                                <Button block disabled={saving} fill="outline" onClick={() => setIsEditing(false)} size="large">
                                    Cancel
                                </Button>
                                <Button block loading={saving} onClick={() => void handleSave()} size="large">
                                    Save
                                </Button>
                            </Flex>
                        ) : (
                            <Button block onClick={() => setIsEditing(true)} size="large">
                                Edit content
                            </Button>
                        )}
                    </Flex>
                </Flex>
            </Popup>
        </>
    );
}
