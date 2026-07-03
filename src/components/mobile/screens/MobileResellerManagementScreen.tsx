'use client'

import { RESELLER_CAPS } from '@config/resellerPricing';
import { ECOMSAI_PLATFORM_USER_ROLE } from '@constant/user';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { RESELLER_REQUEST_POLICY } from '@template/main-app/reseller/resellerDiagnostics';
import type { ResellerProfile } from '@type/reseller';
import { formatInrPaise } from '@util/formatters';
import { getBoundedMobileOwnerStringContext, logMobileOwnerFailure } from '../utils/mobileOwnerDiagnostics';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { LuPencil, LuPlus, LuRefreshCw, LuUsers } from 'react-icons/lu';
import { Button, Card, Empty, Flex, Input, Spin, Switch, Tag, Text, TextArea, Title, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';

const MOBILE_RESELLER_MANAGEMENT_RESPONSE_JSON_MAX_BYTES = 64 * 1024;

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

type ResellerMonthlySummary = {
    month: string;
    resellers: Array<{
        resellerId: string;
        resellerName: string;
        resellerEmail: string;
        clientCount: number;
        transactionCount: number;
        offlineCollectedPaise: number;
        onlineActivePaise: number;
        onlinePendingPaise: number;
        recognizedRevenuePaise: number;
        totalExpectedPaise: number;
    }>;
    totals: {
        clientCount: number;
        transactionCount: number;
        offlineCollectedPaise: number;
        onlineActivePaise: number;
        onlinePendingPaise: number;
        recognizedRevenuePaise: number;
        totalExpectedPaise: number;
    };
};

type ResellerProfilesResponse = {
    profiles: ResellerProfile[];
};

type ResellerManagementSaveResponse = {
    action: 'created' | 'updated';
    profileId: string;
    success: true;
};

type MobileResellerManagementLogContext = Record<string, boolean | number | string | null | undefined>;

const createMobileResellerManagementStatusError = (
    failureCode: string,
    status?: number,
): Error & { code: string; status?: number } => Object.assign(new Error(failureCode), {
    code: failureCode,
    status,
});

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isFiniteNumber = (value: unknown): value is number => (
    typeof value === 'number' && Number.isFinite(value)
);

const isNonEmptyString = (value: unknown): value is string => (
    typeof value === 'string' && value.trim().length > 0
);

const isValidMobileResellerProfile = (value: unknown): value is ResellerProfile => (
    isRecord(value)
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.name)
    && isNonEmptyString(value.phone)
    && isNonEmptyString(value.email)
    && isNonEmptyString(value.username)
    && typeof value.active === 'boolean'
    && isFiniteNumber(value.maxOfflineActivations)
    && isFiniteNumber(value.currentActiveOfflineStores)
    && isFiniteNumber(value.totalStoresOnboarded)
    && isFiniteNumber(value.totalOnlineStores)
    && isFiniteNumber(value.totalOfflineStores)
    && isFiniteNumber(value.totalRevenueCollectedPaise)
    && isFiniteNumber(value.totalTransactions)
);

const isValidMobileResellerProfilesResponse = (data: unknown): data is ResellerProfilesResponse => (
    isRecord(data)
    && Array.isArray(data.profiles)
    && data.profiles.every(isValidMobileResellerProfile)
);

const isValidMobileMonthlySummaryTotals = (value: unknown): value is ResellerMonthlySummary['totals'] => (
    isRecord(value)
    && isFiniteNumber(value.clientCount)
    && isFiniteNumber(value.transactionCount)
    && isFiniteNumber(value.offlineCollectedPaise)
    && isFiniteNumber(value.onlineActivePaise)
    && isFiniteNumber(value.onlinePendingPaise)
    && isFiniteNumber(value.recognizedRevenuePaise)
    && isFiniteNumber(value.totalExpectedPaise)
);

const isValidMobileMonthlySummaryRow = (value: unknown): value is ResellerMonthlySummary['resellers'][number] => (
    isRecord(value)
    && isNonEmptyString(value.resellerId)
    && isNonEmptyString(value.resellerName)
    && typeof value.resellerEmail === 'string'
    && isFiniteNumber(value.clientCount)
    && isFiniteNumber(value.transactionCount)
    && isFiniteNumber(value.offlineCollectedPaise)
    && isFiniteNumber(value.onlineActivePaise)
    && isFiniteNumber(value.onlinePendingPaise)
    && isFiniteNumber(value.recognizedRevenuePaise)
    && isFiniteNumber(value.totalExpectedPaise)
);

const isValidMobileResellerMonthlySummary = (data: unknown): data is ResellerMonthlySummary => (
    isRecord(data)
    && isNonEmptyString(data.month)
    && Array.isArray(data.resellers)
    && data.resellers.every(isValidMobileMonthlySummaryRow)
    && isValidMobileMonthlySummaryTotals(data.totals)
);

const isValidMobileResellerManagementSaveResponse = (data: unknown): data is ResellerManagementSaveResponse => (
    isRecord(data)
    && data.success === true
    && isNonEmptyString(data.profileId)
    && (data.action === 'created' || data.action === 'updated')
);

const isExpectedMobileResellerManagementSaveResponse = (
    data: unknown,
    expectedProfileId?: string,
): data is ResellerManagementSaveResponse => (
    isValidMobileResellerManagementSaveResponse(data)
    && (
        data.action === 'created'
        || (isNonEmptyString(expectedProfileId) && data.profileId === expectedProfileId)
    )
);

const readMobileResellerManagementResponse = async (
    response: Response,
    context: MobileResellerManagementLogContext,
): Promise<unknown> => {
    try {
        return await readJsonResponseWithLimit<unknown>(
            response,
            MOBILE_RESELLER_MANAGEMENT_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logMobileOwnerFailure('mobile_reseller_management_response_parse_failed', error, {
            ...context,
            maxBytes: MOBILE_RESELLER_MANAGEMENT_RESPONSE_JSON_MAX_BYTES,
            responseOk: response.ok,
            responseStatus: response.status,
        });
        throw error;
    }
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
        password: '',
        phone: profile.phone || '',
        postalCode: profile.postalCode || '',
        state: profile.state || '',
        username: profile.username || '',
    };
}

export default function MobileResellerManagementScreen({ onBack }: { onBack: () => void }) {
    const { data: session } = useSession();
    const platformRole = (session as any)?.platformRole || (session?.user as any)?.platformRole;
    const isPlatform = platformRole === ECOMSAI_PLATFORM_USER_ROLE;
    const [profiles, setProfiles] = useState<ResellerProfile[]>([]);
    const [monthlySummary, setMonthlySummary] = useState<ResellerMonthlySummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [monthlyLoading, setMonthlyLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingProfile, setEditingProfile] = useState<ResellerProfile | null>(null);
    const [draft, setDraft] = useState<ResellerDraft>(emptyDraft);
    const isEditing = Boolean(editingProfile);
    const buildResellerMobileLogContext = (flow: string, metadata: Record<string, boolean | number | string | null | undefined> = {}) => ({
        surface: 'mobile_reseller_management',
        flow,
        isEditing,
        hasEditingProfile: Boolean(editingProfile?.id),
        profileCount: profiles.length,
        ...getBoundedMobileOwnerStringContext('platformRole', platformRole),
        ...metadata,
    });

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
            const response = await fetch('/api/reseller/manage', RESELLER_REQUEST_POLICY);
            if (!response.ok) {
                throw createMobileResellerManagementStatusError('mobile_reseller_profiles_rejected', response.status);
            }
            const data = await readMobileResellerManagementResponse(response, buildResellerMobileLogContext('profiles_load'));
            if (!isValidMobileResellerProfilesResponse(data)) {
                const invalidResponseError = createMobileResellerManagementStatusError('mobile_reseller_management_profiles_response_invalid', response.status);
                logMobileOwnerFailure('mobile_reseller_management_profiles_response_invalid', invalidResponseError, buildResellerMobileLogContext('profiles_load', {
                    responseOk: response.ok,
                    responseStatus: response.status,
                }));
                throw invalidResponseError;
            }
            setProfiles(data.profiles);
        } catch (error) {
            logMobileOwnerFailure('mobile_reseller_profiles_load_failed', error, buildResellerMobileLogContext('profiles_load'));
            Toast.show({ content: 'Could not load reseller profiles', duration: 2200 });
        } finally {
            setLoading(false);
        }
    };

    const loadMonthlySummary = async () => {
        setMonthlyLoading(true);
        try {
            const response = await fetch('/api/reseller/monthly-summary', RESELLER_REQUEST_POLICY);
            if (!response.ok) {
                throw createMobileResellerManagementStatusError('mobile_reseller_monthly_summary_rejected', response.status);
            }
            const data = await readMobileResellerManagementResponse(response, buildResellerMobileLogContext('monthly_summary_load'));
            if (!isValidMobileResellerMonthlySummary(data)) {
                const invalidResponseError = createMobileResellerManagementStatusError('mobile_reseller_management_monthly_summary_response_invalid', response.status);
                logMobileOwnerFailure('mobile_reseller_management_monthly_summary_response_invalid', invalidResponseError, buildResellerMobileLogContext('monthly_summary_load', {
                    responseOk: response.ok,
                    responseStatus: response.status,
                }));
                throw invalidResponseError;
            }
            setMonthlySummary(data);
        } catch (error) {
            logMobileOwnerFailure('mobile_reseller_monthly_summary_load_failed', error, buildResellerMobileLogContext('monthly_summary_load'));
            Toast.show({ content: 'Could not load monthly reseller summary', duration: 2200 });
        } finally {
            setMonthlyLoading(false);
        }
    };

    useEffect(() => {
        if (isPlatform) {
            void loadProfiles();
            void loadMonthlySummary();
        }
    }, [isPlatform]);

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
                ...RESELLER_REQUEST_POLICY,
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            });
            if (!response.ok) {
                throw createMobileResellerManagementStatusError('mobile_reseller_save_rejected', response.status);
            }

            const data = await readMobileResellerManagementResponse(response, buildResellerMobileLogContext('save_profile', {
                requestedActive: draft.active,
                responseOk: response.ok,
                responseStatus: response.status,
                ...getBoundedMobileOwnerStringContext('draftEmail', draft.email),
                ...getBoundedMobileOwnerStringContext('draftUsername', draft.username),
                ...getBoundedMobileOwnerStringContext('draftPhone', draft.phone),
            }));
            if (!isExpectedMobileResellerManagementSaveResponse(data, editingProfile?.id)) {
                const invalidResponseError = createMobileResellerManagementStatusError('mobile_reseller_management_save_response_invalid', response.status);
                logMobileOwnerFailure('mobile_reseller_management_save_response_invalid', invalidResponseError, buildResellerMobileLogContext('save_profile', {
                    hasExpectedProfileId: isRecord(data) && data.profileId === editingProfile?.id,
                    requestedActive: draft.active,
                    responseOk: response.ok,
                    responseStatus: response.status,
                    ...getBoundedMobileOwnerStringContext('draftEmail', draft.email),
                    ...getBoundedMobileOwnerStringContext('draftUsername', draft.username),
                    ...getBoundedMobileOwnerStringContext('draftPhone', draft.phone),
                }));
                throw invalidResponseError;
            }

            Toast.show({ content: `Reseller ${data.action} successfully`, duration: 1800, icon: 'success' });
            closeEditor();
            await loadProfiles();
        } catch (error) {
            logMobileOwnerFailure('mobile_reseller_save_failed', error, buildResellerMobileLogContext('save_profile', {
                requestedActive: draft.active,
                ...getBoundedMobileOwnerStringContext('draftEmail', draft.email),
                ...getBoundedMobileOwnerStringContext('draftUsername', draft.username),
                ...getBoundedMobileOwnerStringContext('draftPhone', draft.phone),
            }));
            Toast.show({ content: 'Could not save reseller', duration: 2400 });
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
                    <Button fill="none" loading={loading || monthlyLoading} onClick={() => { void loadProfiles(); void loadMonthlySummary(); }} style={{ minHeight: 44, minWidth: 44, paddingInline: 0 }}>
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
                        ['Revenue', formatInrPaise(stats.revenue)],
                    ].map(([label, value]) => (
                        <Card key={label as string}>
                            <Flex gap={2} vertical>
                                <Text type="secondary">{label}</Text>
                                <Title level={4} style={{ margin: 0 }}>{value}</Title>
                            </Flex>
                        </Card>
                    ))}
                </div>

                <Card title={`This month${monthlySummary?.month ? ` (${monthlySummary.month})` : ''}`}>
                    <Flex gap={10} vertical>
                        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                            {[
                                ['Clients', monthlySummary?.totals.clientCount || 0],
                                ['Txns', monthlySummary?.totals.transactionCount || 0],
                                ['Offline collected', formatInrPaise(monthlySummary?.totals.offlineCollectedPaise)],
                                ['Online pending', formatInrPaise(monthlySummary?.totals.onlinePendingPaise)],
                            ].map(([label, value]) => (
                                <Flex key={label as string} gap={2} vertical>
                                    <Text type="secondary">{label}</Text>
                                    <Text strong>{value}</Text>
                                </Flex>
                            ))}
                        </div>
                        {(monthlySummary?.resellers || []).length === 0 ? (
                            <Text type="secondary">No reseller transactions this month.</Text>
                        ) : (
                            <Flex gap={8} vertical>
                                {(monthlySummary?.resellers || []).slice(0, 6).map((row) => (
                                    <Flex key={row.resellerId} align="center" justify="space-between">
                                        <Flex style={{ minWidth: 0 }} vertical>
                                            <Text strong>{row.resellerName}</Text>
                                            <Text type="secondary">{row.clientCount} clients · {row.transactionCount} txns</Text>
                                        </Flex>
                                        <Text strong>{formatInrPaise(row.totalExpectedPaise)}</Text>
                                    </Flex>
                                ))}
                            </Flex>
                        )}
                    </Flex>
                </Card>

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
                                        <Tag>{formatInrPaise(profile.totalRevenueCollectedPaise)}</Tag>
                                    </Flex>
                                    <Button fill="outline" onClick={() => openEdit(profile)} style={{ minHeight: 44 }}>
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
