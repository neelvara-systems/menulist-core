'use client';

import { FEATURE_FLAGS } from '@config/features';
import useDeviceType from '@hook/useDeviceType';
import { prepareMediaImage } from '@lib/media/prepareMediaImage';
import {
    createImageSubjectProfile,
    deleteImageSubjectProfile,
    listImageSubjectProfiles,
    renameImageSubjectProfile,
    replaceImageSubjectProfileReferences,
    withdrawImageSubjectProfile,
} from '@services/ai/image/subjectProfiles';
import {
    createEmptyImageSubjectProfileCache,
    getImageSubjectProfileCacheScopeKey,
    IMAGE_SUBJECT_PROFILE_CACHE_TTL_MS,
    IMAGE_SUBJECT_PROFILE_LIMIT,
    IMAGE_SUBJECT_REFERENCE_MAX,
    IMAGE_SUBJECT_REFERENCE_MIN,
    type ImageSubjectProfileConsentInput,
    type ImageSubjectProfileSummary,
} from '@type/imageSubjectProfile';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { App, Button, Checkbox, Flex, Image, Input, Modal, Popconfirm, Select, Spin, Tag, Typography, Upload } from 'antd';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuImage, LuPencil, LuPlus, LuShieldCheck, LuTrash2, LuUser, LuUserX } from 'react-icons/lu';

type PreparedReference = { dataUrl: string; name: string; uid: string };

interface SubjectProfileSelectorProps {
    canManage: boolean;
    onChange: (profileId: string | null, version: number | null) => void;
    subjectProfileId?: string | null;
    subjectProfileVersion?: number | null;
}

const EMPTY_CONSENT: ImageSubjectProfileConsentInput = {
    adultConfirmed: false,
    commercialUsePermissionConfirmed: false,
    publicFigureConfirmedFalse: false,
    rightsConfirmed: false,
};

export default function SubjectProfileSelector({ canManage, onChange, subjectProfileId, subjectProfileVersion }: SubjectProfileSelectorProps) {
    const { message } = App.useApp();
    const { isMobile } = useDeviceType();
    const {
        cachedImageSubjectProfiles,
        setCachedImageSubjectProfiles,
        storeDetails,
    } = useContext(PlatformGlobalDataContext);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [open, setOpen] = useState(false);
    const [updatingProfile, setUpdatingProfile] = useState<ImageSubjectProfileSummary | null>(null);
    const [renameProfile, setRenameProfile] = useState<ImageSubjectProfileSummary | null>(null);
    const [renameLabel, setRenameLabel] = useState('');
    const [renameSaving, setRenameSaving] = useState(false);
    const [label, setLabel] = useState('');
    const [references, setReferences] = useState<PreparedReference[]>([]);
    const [consent, setConsent] = useState(EMPTY_CONSENT);
    const canManageLifecycle = canManage && !isMobile;
    const cacheScopeKey = getImageSubjectProfileCacheScopeKey(
        storeDetails?.tenantId,
        storeDetails?.storeId,
        canManageLifecycle,
    );
    const profiles = cachedImageSubjectProfiles.scopeKey === cacheScopeKey
        ? cachedImageSubjectProfiles.profiles
        : [];
    const onChangeRef = useRef(onChange);
    const selectionRef = useRef({ subjectProfileId, subjectProfileVersion });
    const cacheScopeKeyRef = useRef(cacheScopeKey);
    const cachedProfilesRef = useRef(cachedImageSubjectProfiles);
    cacheScopeKeyRef.current = cacheScopeKey;
    cachedProfilesRef.current = cachedImageSubjectProfiles;

    useEffect(() => {
        onChangeRef.current = onChange;
        selectionRef.current = { subjectProfileId, subjectProfileVersion };
    }, [onChange, subjectProfileId, subjectProfileVersion]);

    const selected = useMemo(
        () => profiles.find((profile) => profile.id === subjectProfileId && profile.version === subjectProfileVersion),
        [profiles, subjectProfileId, subjectProfileVersion],
    );

    const reconcileSelection = useCallback((next: ImageSubjectProfileSummary[]) => {
        const currentSelection = selectionRef.current;
        if (currentSelection.subjectProfileId && !next.some((profile) => (
            profile.id === currentSelection.subjectProfileId
            && profile.version === currentSelection.subjectProfileVersion
            && profile.status === 'active'
        ))) {
            onChangeRef.current(null, null);
        }
    }, []);

    const applyProfiles = useCallback((next: ImageSubjectProfileSummary[]) => {
        if (!cacheScopeKey || cacheScopeKeyRef.current !== cacheScopeKey) return;
        setCachedImageSubjectProfiles({
            includeWithdrawn: canManageLifecycle,
            loadedAt: Date.now(),
            profiles: next,
            scopeKey: cacheScopeKey,
        });
        reconcileSelection(next);
    }, [cacheScopeKey, canManageLifecycle, reconcileSelection, setCachedImageSubjectProfiles]);

    const refresh = useCallback(async (force = false) => {
        if (!FEATURE_FLAGS.ENABLE_AI_SUBJECT_PROFILES) {
            setLoading(false);
            return;
        }

        if (!cacheScopeKey) {
            setLoading(false);
            onChangeRef.current(null, null);
            return;
        }
        const cached = cachedProfilesRef.current;
        const cacheIsFresh = cached.scopeKey === cacheScopeKey
            && cached.includeWithdrawn === canManageLifecycle
            && cached.loadedAt !== null
            && Date.now() - cached.loadedAt < IMAGE_SUBJECT_PROFILE_CACHE_TTL_MS;
        if (!force && cacheIsFresh) {
            reconcileSelection(cached.profiles);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const next = await listImageSubjectProfiles(canManageLifecycle);
            applyProfiles(next);
        } catch (error) {
            if (cacheScopeKeyRef.current === cacheScopeKey) {
                setCachedImageSubjectProfiles(createEmptyImageSubjectProfileCache());
                onChangeRef.current(null, null);
            }
            message.error(error instanceof Error ? error.message : 'Could not load saved people.');
        } finally {
            if (cacheScopeKeyRef.current === cacheScopeKey) setLoading(false);
        }
    }, [applyProfiles, cacheScopeKey, canManageLifecycle, message, reconcileSelection, setCachedImageSubjectProfiles]);

    useEffect(() => { void refresh(); }, [refresh]);

    if (!FEATURE_FLAGS.ENABLE_AI_SUBJECT_PROFILES) return null;

    const resetForm = () => {
        setLabel('');
        setReferences([]);
        setConsent(EMPTY_CONSENT);
        setUpdatingProfile(null);
    };

    const openCreate = () => {
        resetForm();
        setOpen(true);
    };

    const openReferenceUpdate = (profile: ImageSubjectProfileSummary) => {
        resetForm();
        setLabel(profile.label);
        setUpdatingProfile(profile);
        setOpen(true);
    };

    const allConsented = Object.values(consent).every(Boolean);
    const canSave = label.trim().length > 0
        && references.length >= IMAGE_SUBJECT_REFERENCE_MIN
        && references.length <= IMAGE_SUBJECT_REFERENCE_MAX
        && allConsented;

    const addReference = async (file: File) => {
        if (references.length >= IMAGE_SUBJECT_REFERENCE_MAX) {
            message.warning(`You can add up to ${IMAGE_SUBJECT_REFERENCE_MAX} photos.`);
            return Upload.LIST_IGNORE;
        }
        try {
            const prepared = await prepareMediaImage(file, 'menuItem', { aspectRatio: '1:1' });
            setReferences((current) => [...current, {
                dataUrl: prepared.dataUrl,
                name: file.name.slice(0, 160),
                uid: prepared.mediaId,
            }].slice(0, IMAGE_SUBJECT_REFERENCE_MAX));
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'This photo could not be prepared.');
        }
        return Upload.LIST_IGNORE;
    };

    const save = async () => {
        if (!canSave) return;
        setSaving(true);
        try {
            const referenceInput = references.map(({ dataUrl, name }) => ({ dataUrl, name }));
            const profile = updatingProfile
                ? await replaceImageSubjectProfileReferences({
                    consent,
                    expectedVersion: updatingProfile.version,
                    label: label.trim(),
                    profileId: updatingProfile.id,
                    references: referenceInput,
                })
                : await createImageSubjectProfile({
                    consent,
                    label: label.trim(),
                    references: referenceInput,
                });
            applyProfiles([profile, ...profiles.filter((candidate) => candidate.id !== profile.id)]
                .slice(0, IMAGE_SUBJECT_PROFILE_LIMIT));
            onChange(profile.id, profile.version);
            setOpen(false);
            resetForm();
            message.success(updatingProfile
                ? 'Reference photos updated. The new version is selected.'
                : 'Saved person created and selected.');
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not save this person.');
        } finally {
            setSaving(false);
        }
    };

    const saveRename = async () => {
        if (!renameProfile || !renameLabel.trim()) return;
        setRenameSaving(true);
        try {
            const renamed = await renameImageSubjectProfile({
                expectedVersion: renameProfile.version,
                label: renameLabel.trim(),
                profileId: renameProfile.id,
            });
            applyProfiles(profiles.map((profile) => profile.id === renamed.id ? renamed : profile));
            setRenameProfile(null);
            setRenameLabel('');
            message.success('Saved person renamed.');
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not rename this person.');
        } finally {
            setRenameSaving(false);
        }
    };

    const activeProfiles = profiles.filter((profile) => profile.status === 'active');

    return (
        <Flex gap={10} vertical style={{ width: '100%' }}>
            <Flex align="center" justify="space-between" gap={12} wrap>
                <Flex gap={8} align="center">
                    <LuUser />
                    <Typography.Text strong>Saved person</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>Optional</Typography.Text>
                </Flex>
                {canManageLifecycle ? <Button size="small" icon={<LuPlus />} onClick={openCreate}>Add person</Button> : null}
            </Flex>
            <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: 1.4 }}>
                Reuse the same authorized adult across relevant services, products, poses, and scenes. This stays separate from the visual reference below.
            </Typography.Text>
            <Spin spinning={loading}>
                <Select
                    allowClear
                    aria-label="Saved person"
                    disabled={loading}
                    onChange={(id) => {
                        const profile = profiles.find((candidate) => candidate.id === id);
                        onChange(profile?.id || null, profile?.version || null);
                    }}
                    options={activeProfiles.map((profile) => ({ label: profile.label, value: profile.id }))}
                    placeholder={activeProfiles.length ? 'Choose a saved person' : 'No saved people yet'}
                    size={isMobile ? 'large' : 'middle'}
                    style={{ minHeight: isMobile ? 44 : undefined, width: '100%' }}
                    value={selected?.id}
                />
            </Spin>
            {selected ? (
                <Flex gap={12} align="center" wrap>
                    {selected.references[0] ? <Image alt={`${selected.label} identity reference`} preview={false} src={selected.references[0].previewUrl} width={56} height={56} style={{ borderRadius: 8, objectFit: 'cover' }} /> : null}
                    <Flex vertical style={{ flex: 1, minWidth: 140 }}>
                        <Typography.Text strong>{selected.label}</Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>{selected.references.length} private references · version {selected.version}</Typography.Text>
                    </Flex>
                    {canManageLifecycle ? (
                        <Flex gap={6} wrap>
                            <Button
                                aria-label={`Rename ${selected.label}`}
                                size="small"
                                icon={<LuPencil />}
                                onClick={() => {
                                    setRenameProfile(selected);
                                    setRenameLabel(selected.label);
                                }}
                            >
                                Rename
                            </Button>
                            <Button size="small" icon={<LuImage />} onClick={() => openReferenceUpdate(selected)}>
                                Update photos
                            </Button>
                            <Popconfirm title="Stop using this saved person?" description="New generations will be blocked immediately. Photos remain until you delete the profile." onConfirm={async () => {
                                try {
                                    const withdrawn = await withdrawImageSubjectProfile(selected.id);
                                    applyProfiles(profiles.map((profile) => profile.id === withdrawn.id ? withdrawn : profile));
                                    onChange(null, null);
                                    message.success('Saved person withdrawn.');
                                }
                                catch (error) { message.error(error instanceof Error ? error.message : 'Could not withdraw this person.'); }
                            }}>
                                <Button size="small" icon={<LuUserX />}>Withdraw</Button>
                            </Popconfirm>
                        </Flex>
                    ) : null}
                </Flex>
            ) : null}
            {isMobile && canManage ? (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Create, withdraw, or delete saved people from the desktop owner app.
                </Typography.Text>
            ) : null}
            {canManageLifecycle && profiles.some((profile) => profile.status === 'withdrawn') ? (
                <Flex vertical gap={6}>
                    {profiles.filter((profile) => profile.status === 'withdrawn').map((profile) => (
                        <Flex key={profile.id} align="center" justify="space-between" gap={8}>
                            <Typography.Text type="secondary" ellipsis>{profile.label} <Tag>Withdrawn</Tag></Typography.Text>
                            <Popconfirm title="Delete this saved person and its private photos?" onConfirm={async () => {
                                try {
                                    await deleteImageSubjectProfile(profile.id);
                                    applyProfiles(profiles.filter((candidate) => candidate.id !== profile.id));
                                    message.success('Saved person deleted.');
                                }
                                catch (error) { message.error(error instanceof Error ? error.message : 'Could not delete this person.'); }
                            }}>
                                <Button danger size="small" type="text" aria-label={`Delete ${profile.label}`} icon={<LuTrash2 />} />
                            </Popconfirm>
                        </Flex>
                    ))}
                </Flex>
            ) : null}

            <Modal
                title={updatingProfile ? `Update photos for ${updatingProfile.label}` : 'Add a saved person'}
                open={open}
                onCancel={() => { if (!saving) { setOpen(false); resetForm(); } }}
                onOk={() => void save()}
                okButtonProps={{ disabled: !canSave, loading: saving }}
                okText={updatingProfile ? 'Update person' : 'Save person'}
                destroyOnHidden
            >
                <Flex vertical gap={16}>
                    <Typography.Text type="secondary">
                        {updatingProfile ? 'Replace the current references with ' : 'Add '}
                        {IMAGE_SUBJECT_REFERENCE_MIN}–{IMAGE_SUBJECT_REFERENCE_MAX} clear photos of the same adult from slightly different angles. Avoid group photos, filters, sunglasses, and heavy shadows.
                    </Typography.Text>
                    <Input value={label} maxLength={80} showCount onChange={(event) => setLabel(event.target.value)} placeholder="Internal label, for example: Maya" />
                    <Upload accept="image/jpeg,image/png,image/webp" beforeUpload={addReference} multiple showUploadList={false}>
                        <Button size={isMobile ? 'large' : 'middle'} disabled={references.length >= IMAGE_SUBJECT_REFERENCE_MAX} icon={<LuPlus />}>Add reference photos</Button>
                    </Upload>
                    {references.length ? <Flex gap={8} wrap>{references.map((reference) => (
                        <Flex key={reference.uid} vertical gap={4}>
                            <Image src={reference.dataUrl} alt={reference.name} preview={false} width={72} height={72} style={{ borderRadius: 8, objectFit: 'cover' }} />
                            <Button size={isMobile ? 'large' : 'small'} type="text" danger onClick={() => setReferences((current) => current.filter((item) => item.uid !== reference.uid))}>Remove</Button>
                        </Flex>
                    ))}</Flex> : <Typography.Text type="secondary">No reference photos added.</Typography.Text>}
                    <Flex vertical gap={8}>
                        <Typography.Text strong><LuShieldCheck /> Consent and rights</Typography.Text>
                        <Checkbox checked={consent.adultConfirmed} onChange={(event) => setConsent((current) => ({ ...current, adultConfirmed: event.target.checked }))}>This person is 18 or older.</Checkbox>
                        <Checkbox checked={consent.rightsConfirmed} onChange={(event) => setConsent((current) => ({ ...current, rightsConfirmed: event.target.checked }))}>I own these photos or have permission to upload and use them.</Checkbox>
                        <Checkbox checked={consent.commercialUsePermissionConfirmed} onChange={(event) => setConsent((current) => ({ ...current, commercialUsePermissionConfirmed: event.target.checked }))}>I have this person&apos;s permission for business and commercial image generation.</Checkbox>
                        <Checkbox checked={consent.publicFigureConfirmedFalse} onChange={(event) => setConsent((current) => ({ ...current, publicFigureConfirmedFalse: event.target.checked }))}>This is not a public figure, celebrity, or political figure.</Checkbox>
                    </Flex>
                </Flex>
            </Modal>
            <Modal
                title="Rename saved person"
                open={Boolean(renameProfile)}
                onCancel={() => {
                    if (!renameSaving) {
                        setRenameProfile(null);
                        setRenameLabel('');
                    }
                }}
                onOk={() => void saveRename()}
                okButtonProps={{ disabled: !renameLabel.trim(), loading: renameSaving }}
                okText="Save name"
                destroyOnHidden
            >
                <Flex gap={8} vertical>
                    <Typography.Text type="secondary">
                        This label is private and helps your team choose the right person.
                    </Typography.Text>
                    <Input
                        aria-label="Saved person label"
                        value={renameLabel}
                        maxLength={80}
                        showCount
                        onChange={(event) => setRenameLabel(event.target.value)}
                    />
                </Flex>
            </Modal>
        </Flex>
    );
}
