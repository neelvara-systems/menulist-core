'use client'

import { RESELLER_CAPS } from '@config/resellerPricing';
import { ECOMSAI_PLATFORM_PASSWORD, ECOMSAI_PLATFORM_USER_ROLE } from '@constant/user';
import type { ResellerProfile } from '@type/reseller';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { LuCheck, LuLock, LuPencil, LuPlus, LuRefreshCw, LuUsers } from 'react-icons/lu';
import { Button, Card, Empty, Flex, Input, Spin, Switch, Tag, Text, TextArea, Title, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';

type ResellerDraft = {
    active: boolean;
    addressLine: string;
    city: string;
    country: string;
    email: string;
    maxOfflineActivations: string;
    name: string;
    notes: string;
    password: string;
    phone: string;
    postalCode: string;
    state: string;
    username: string;
};

const emptyDraft = (): ResellerDraft => ({
    active: true,
    addressLine: '',
    city: '',
    country: 'India',
    email: '',
    maxOfflineActivations: String(RESELLER_CAPS.MAX_CONCURRENT_OFFLINE_PER_RESELLER),
    name: '',
    notes: '',
    password: '',
    phone: '',
    postalCode: '',
    state: '',
    username: '',
});

function draftFromProfile(profile: ResellerProfile): ResellerDraft {
    return {
        active: profile.active !== false,
        addressLine: profile.addressLine || '',
        city: profile.city || '',
        country: profile.country || '',
        email: profile.email || '',
        maxOfflineActivations: String(profile.maxOfflineActivations || RESELLER_CAPS.MAX_CONCURRENT_OFFLINE_PER_RESELLER),
        name: profile.name || '',
        notes: profile.notes || '',
        password: profile.password || '',
        phone: profile.phone || '',
        postalCode: profile.postalCode || '',
        state: profile.state || '',
        username: profile.username || '',
    };
}

function formatMoney(paise?: number) {
    return `₹${Math.round((paise || 0) / 100).toLocaleString('en-IN')}`;
}

export default function MobileResellerManagementScreen({ onBack }: { onBack: () => void }) {
    const { data: session } = useSession();
    const platformRole = (session as any)?.platformRole || (session?.user as any)?.platformRole;
    const isPlatform = platformRole === ECOMSAI_PLATFORM_USER_ROLE;
    const [authenticated, setAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [profiles, setProfiles] = useState<ResellerProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingProfile, setEditingProfile] = useState<ResellerProfile | null>(null);
    const [draft, setDraft] = useState<ResellerDraft>(emptyDraft);
    const isEditing = Boolean(editingProfile);

    const stats = useMemo(() => ({
        active: profiles.filter((profile) => profile.active).length,
        revenue: profiles.reduce((sum, profile) => sum + (profile.totalRevenueCollectedPaise || 0), 0),
        stores: profiles.reduce((sum, profile) => sum + (profile.totalStoresOnboarded || 0), 0),
        total: profiles.length,
    }), [profiles]);

    const updateDraft = (field: keyof ResellerDraft, value: string | boolean) => {
        setDraft((current) => ({ ...current, [field]: value }));
    };

    const loadProfiles = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/reseller/manage');
            if (!response.ok) throw new Error('Could not load reseller profiles');
            const data = await response.json();
            setProfiles(data.profiles || []);
        } catch (error: any) {
            Toast.show({ content: error?.message || 'Could not load reseller profiles', duration: 2200 });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (authenticated) void loadProfiles();
    }, [authenticated]);

    const openCreate = () => {
        setEditingProfile(null);
        setDraft(emptyDraft());
    };

    const openEdit = (profile: ResellerProfile) => {
        setEditingProfile(profile);
        setDraft(draftFromProfile(profile));
    };

    const closeEditor = () => {
        setEditingProfile(null);
        setDraft(emptyDraft());
    };

    const submit = async () => {
        if (!draft.name.trim() || !draft.phone.trim() || !draft.email.trim() || !draft.username.trim()) {
            Toast.show({ content: 'Name, phone, email, and username are required.', duration: 2200 });
            return;
        }
        if (!isEditing && draft.password.trim().length < 6) {
            Toast.show({ content: 'Password must be at least 6 characters.', duration: 2200 });
            return;
        }

        setSaving(true);
        try {
            const payload: Record<string, unknown> = {
                active: draft.active,
                addressLine: draft.addressLine.trim() || undefined,
                city: draft.city.trim() || undefined,
                country: draft.country.trim() || undefined,
                email: draft.email.trim(),
                maxOfflineActivations: Number(draft.maxOfflineActivations || RESELLER_CAPS.MAX_CONCURRENT_OFFLINE_PER_RESELLER),
                name: draft.name.trim(),
                notes: draft.notes.trim() || undefined,
                phone: draft.phone.trim(),
                postalCode: draft.postalCode.trim() || undefined,
                state: draft.state.trim() || undefined,
                username: draft.username.trim(),
            };
            if (draft.password.trim()) payload.password = draft.password.trim();
            if (editingProfile?.id) payload.profileId = editingProfile.id;

            const response = await fetch('/api/reseller/manage', {
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'Could not save reseller');

            Toast.show({ content: `Reseller ${data.action || 'saved'} successfully`, duration: 1800, icon: 'success' });
            closeEditor();
            await loadProfiles();
        } catch (error: any) {
            Toast.show({ content: error?.message || 'Could not save reseller', duration: 2400 });
        } finally {
            setSaving(false);
        }
    };

    if (!isPlatform) {
        return (
            <Flex style={{ minHeight: '100%' }} vertical>
                <MobileSettingsScreenHeader description="Only platform admins can manage reseller profiles." onBack={onBack} title="Reseller Management" />
                <Flex style={{ padding: 16 }} vertical>
                    <Card><Text>Only platform admins can use this screen.</Text></Card>
                </Flex>
            </Flex>
        );
    }

    if (!authenticated) {
        return (
            <Flex style={{ minHeight: '100%' }} vertical>
                <MobileSettingsScreenHeader description="Authenticate before managing reseller profiles." onBack={onBack} title="Reseller Management" />
                <Flex gap={12} style={{ padding: 16 }} vertical>
                    <Card>
                        <Flex align="center" gap={12} vertical>
                            <LuLock color="#7c3aed" size={42} />
                            <Title level={5} style={{ margin: 0 }}>Platform admin access</Title>
                            <Input onChange={setPasswordInput} placeholder="Enter platform password" type="password" value={passwordInput} />
                            <Button block onClick={() => {
                                if (passwordInput === ECOMSAI_PLATFORM_PASSWORD) {
                                    setAuthenticated(true);
                                } else {
                                    Toast.show({ content: 'Invalid password', duration: 1800 });
                                }
                            }} style={{ minHeight: 44 }}>
                                <Flex align="center" gap={6} justify="center"><LuCheck size={16} /> Authenticate</Flex>
                            </Button>
                        </Flex>
                    </Card>
                </Flex>
            </Flex>
        );
    }

    if (editingProfile || draft.name || draft.phone || draft.email || draft.username || draft.password) {
        return (
            <Flex style={{ minHeight: '100%' }} vertical>
                <MobileSettingsScreenHeader description="Create or update reseller profile details." onBack={closeEditor} title={editingProfile ? 'Edit Reseller' : 'Add Reseller'} />
                <Flex gap={12} style={{ padding: 16 }} vertical>
                    <Card title="Personal details">
                        <Flex gap={10} vertical>
                            <Input onChange={(value) => updateDraft('name', value)} placeholder="Full name" value={draft.name} />
                            <Input inputMode="tel" onChange={(value) => updateDraft('phone', value)} placeholder="Phone" value={draft.phone} />
                            <Input inputMode="email" onChange={(value) => updateDraft('email', value)} placeholder="Email" type="email" value={draft.email} />
                            <Input onChange={(value) => updateDraft('username', value)} placeholder="Username" value={draft.username} />
                            <Input onChange={(value) => updateDraft('password', value)} placeholder={editingProfile ? 'New password (optional)' : 'Password'} type="password" value={draft.password} />
                        </Flex>
                    </Card>

                    <Card title="Address">
                        <Flex gap={10} vertical>
                            <Input onChange={(value) => updateDraft('addressLine', value)} placeholder="Address" value={draft.addressLine} />
                            <Input onChange={(value) => updateDraft('city', value)} placeholder="City" value={draft.city} />
                            <Input onChange={(value) => updateDraft('state', value)} placeholder="State" value={draft.state} />
                            <Input onChange={(value) => updateDraft('postalCode', value)} placeholder="Postal code" value={draft.postalCode} />
                            <Input onChange={(value) => updateDraft('country', value)} placeholder="Country" value={draft.country} />
                        </Flex>
                    </Card>

                    <Card title="Settings">
                        <Flex gap={10} vertical>
                            <Input inputMode="numeric" onChange={(value) => updateDraft('maxOfflineActivations', value)} placeholder="Max offline activations" type="number" value={draft.maxOfflineActivations} />
                            <Flex align="center" justify="space-between">
                                <Text>Active</Text>
                                <Switch checked={draft.active} onChange={(checked) => updateDraft('active', checked)} />
                            </Flex>
                            <TextArea onChange={(value) => updateDraft('notes', value)} placeholder="Internal notes" rows={3} value={draft.notes} />
                        </Flex>
                    </Card>

                    <Flex gap={10}>
                        <Button block fill="outline" onClick={closeEditor} style={{ minHeight: 44 }}>Cancel</Button>
                        <Button block loading={saving} onClick={submit} style={{ minHeight: 44 }}>{editingProfile ? 'Update' : 'Create'}</Button>
                    </Flex>
                </Flex>
            </Flex>
        );
    }

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description="Create and manage reseller profiles."
                onBack={onBack}
                right={(
                    <Button fill="none" onClick={() => void loadProfiles()} style={{ minHeight: 40, minWidth: 40, paddingInline: 0 }}>
                        <LuRefreshCw size={18} />
                    </Button>
                )}
                title="Reseller Management"
            />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <Card>
                    <Button block onClick={openCreate} style={{ minHeight: 44 }}>
                        <Flex align="center" gap={6} justify="center"><LuPlus size={16} /> Add Reseller</Flex>
                    </Button>
                </Card>

                <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    {[
                        ['Total', stats.total],
                        ['Active', stats.active],
                        ['Stores', stats.stores],
                        ['Revenue', formatMoney(stats.revenue)],
                    ].map(([label, value]) => (
                        <Card key={label as string}>
                            <Flex gap={2} vertical>
                                <Text type="secondary">{label}</Text>
                                <Title level={4} style={{ margin: 0 }}>{value}</Title>
                            </Flex>
                        </Card>
                    ))}
                </div>

                {loading ? (
                    <Flex align="center" justify="center" style={{ minHeight: 180 }}><Spin /></Flex>
                ) : profiles.length === 0 ? (
                    <Card>
                        <Empty description="No resellers yet" />
                    </Card>
                ) : (
                    <Flex gap={10} vertical>
                        {profiles.map((profile) => (
                            <Card key={profile.id}>
                                <Flex gap={10} vertical>
                                    <Flex align="flex-start" justify="space-between">
                                        <Flex gap={2} style={{ minWidth: 0 }} vertical>
                                            <Text strong>{profile.name}</Text>
                                            <Text type="secondary">@{profile.username} · {profile.phone}</Text>
                                            <Text type="secondary">{profile.email}</Text>
                                        </Flex>
                                        <Tag color={profile.active ? 'success' : 'error'}>{profile.active ? 'Active' : 'Inactive'}</Tag>
                                    </Flex>
                                    <Flex gap={8} wrap="wrap">
                                        <Tag>{profile.totalStoresOnboarded || 0} stores</Tag>
                                        <Tag>{profile.currentActiveOfflineStores || 0}/{profile.maxOfflineActivations || 0} offline</Tag>
                                        <Tag>{formatMoney(profile.totalRevenueCollectedPaise)}</Tag>
                                    </Flex>
                                    <Button fill="outline" onClick={() => openEdit(profile)} style={{ minHeight: 40 }}>
                                        <Flex align="center" gap={6} justify="center"><LuPencil size={16} /> Edit</Flex>
                                    </Button>
                                </Flex>
                            </Card>
                        ))}
                    </Flex>
                )}
            </Flex>
        </Flex>
    );
}
