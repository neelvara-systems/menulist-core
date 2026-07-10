'use client';

/**
 * Public Menu Entry — Upload Client Component
 * 
 * Handles image upload, menu-link import, API call, and redirect to preview.
 * Mobile-first design with camera capture support.
 * 
 * @see __docs__/public-menu-entry/public-menu-entry_impl.md §6.1
 */

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { signIn, useSession } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { LuAlertCircle, LuCamera, LuCheck, LuLink, LuLoader, LuUpload } from 'react-icons/lu';
import WebsiteHeadline from '@/components/website/shared/WebsiteHeadline';
import AnimateOnScroll, { AnimateStaggerChild } from '@/components/website/shared/AnimateOnScroll';
import PhoneOtpAuthPanel from '@/components/auth/PhoneOtpAuthPanel';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import {
    buildCreateMenuPath,
    type GrowthAcquisitionAttribution,
} from '@lib/growth/acquisitionAttribution';

type UploadState = 'idle' | 'optimizing' | 'uploading' | 'processing' | 'success' | 'error';
type InputMode = 'photo' | 'link';
type CreateMenuResponseSource = 'upload' | 'link';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const CREATE_MENU_RESPONSE_JSON_MAX_BYTES = 8 * 1024;

type CreateMenuDraftResponse = {
    draftId?: unknown;
};

const isNonEmptyString = (value: unknown): value is string => (
    typeof value === 'string' && value.trim().length > 0
);

const getCreateMenuResponseLogContext = (
    source: CreateMenuResponseSource,
    menuLink?: string,
) => ({
    source,
    ...(source === 'link' ? getBoundedRuntimeStringContext('menuLink', menuLink) : {}),
});

async function readCreateMenuDraftResponseJson(
    response: Response,
    source: CreateMenuResponseSource,
    menuLink?: string,
): Promise<{ payload: CreateMenuDraftResponse | null; parseFailed: boolean }> {
    try {
        return {
            payload: await readJsonResponseWithLimit<CreateMenuDraftResponse>(
                response,
                CREATE_MENU_RESPONSE_JSON_MAX_BYTES,
            ),
            parseFailed: false,
        };
    } catch (error) {
        logRuntimeFailure('public_create_menu_response_parse_failed', error, {
            ...getCreateMenuResponseLogContext(source, menuLink),
            responseOk: response.ok,
            responseStatus: response.status,
            maxBytes: CREATE_MENU_RESPONSE_JSON_MAX_BYTES,
        });
        return { payload: null, parseFailed: true };
    }
}

export default function CreateMenuClient({
    growthAcquisition = null,
}: {
    growthAcquisition?: GrowthAcquisitionAttribution | null;
}) {
    const t = useTranslations('Website');
    const router = useRouter();
    const { status: sessionStatus, update: updateSession } = useSession();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [state, setState] = useState<UploadState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [inputMode, setInputMode] = useState<InputMode>('photo');
    const [menuLink, setMenuLink] = useState('');
    const [permissionConfirmed, setPermissionConfirmed] = useState(false);
    const isAuthenticated = sessionStatus === 'authenticated';
    const isSessionLoading = sessionStatus === 'loading';
    const createMenuPath = buildCreateMenuPath(growthAcquisition);
    const signInPath = `/signin?callbackUrl=${encodeURIComponent(createMenuPath)}`;

    const redirectToSignIn = useCallback(() => {
        router.push(signInPath);
    }, [router, signInPath]);

    const continueWithGoogle = useCallback(() => {
        signIn('google', { callbackUrl: createMenuPath });
    }, [createMenuPath]);

    // Cleanup objectURL on unmount or when preview changes to prevent memory leak
    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    const handleFileSelect = useCallback(async (file: File) => {
        if (!isAuthenticated) {
            redirectToSignIn();
            return;
        }

        setError(null);

        // Validate type
        if (!ALLOWED_TYPES.includes(file.type)) {
            setError(t('CreateMenu.invalidType'));
            return;
        }

        // Validate size
        if (file.size > MAX_FILE_SIZE) {
            setError(t('CreateMenu.fileTooLarge'));
            return;
        }

        // Show preview
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);

        try {
            // Step 1: Optimize image client-side
            setState('optimizing');
            const optimizedFile = await optimizeImage(file);

            // Step 2: Upload to API
            setState('uploading');
            const formData = new FormData();
            formData.append('image', optimizedFile);
            if (growthAcquisition) {
                formData.append('growthAcquisitionSource', growthAcquisition.source);
                formData.append('growthAcquisitionMedium', growthAcquisition.medium);
                formData.append('growthAcquisitionCampaign', growthAcquisition.campaign);
            }

            const response = await fetch('/api/public/create-menu', {
                cache: 'no-store',
                credentials: 'same-origin',
                method: 'POST',
                redirect: 'manual',
                body: formData,
            });

            if (response.status === 401) {
                redirectToSignIn();
                return;
            }

            if (response.status === 429) {
                setError(t('CreateMenu.uploadLimit'));
                setState('error');
                return;
            }

            const { payload, parseFailed } = await readCreateMenuDraftResponseJson(response, 'upload');

            if (!response.ok) {
                setError(t('CreateMenu.uploadFailed'));
                setState('error');
                return;
            }

            if (parseFailed || !isNonEmptyString(payload?.draftId)) {
                if (!parseFailed) {
                    logRuntimeFailure('public_create_menu_response_invalid', new Error('public_create_menu_response_invalid'), {
                        ...getCreateMenuResponseLogContext('upload'),
                        responseOk: response.ok,
                        responseStatus: response.status,
                        maxBytes: CREATE_MENU_RESPONSE_JSON_MAX_BYTES,
                        hasDraftId: isNonEmptyString(payload?.draftId),
                    });
                }
                setError(t('CreateMenu.uploadFailed'));
                setState('error');
                return;
            }

            // Step 3: Redirect to preview page
            setState('success');
            router.push(`/create-menu/preview/${payload.draftId}`);

        } catch (err) {
            setError(t('CreateMenu.genericError'));
            setState('error');
        }
    }, [growthAcquisition, isAuthenticated, redirectToSignIn, router, t]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
    }, [handleFileSelect]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) handleFileSelect(file);
    }, [handleFileSelect]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
    }, []);

    const triggerFileInput = () => {
        if (!isAuthenticated) {
            redirectToSignIn();
            return;
        }
        fileInputRef.current?.click();
    };

    const selectInputMode = (mode: InputMode) => {
        if (isProcessing) return;
        setInputMode(mode);
        setState('idle');
        setError(null);
        setPreview(null);
    };

    const handleLinkSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated) {
            redirectToSignIn();
            return;
        }

        const trimmedLink = menuLink.trim();

        if (!trimmedLink || !permissionConfirmed) {
            setError(t('CreateMenu.invalidLink'));
            setState('error');
            return;
        }

        try {
            setError(null);
            setState('uploading');
            const response = await fetch('/api/public/create-menu', {
                body: JSON.stringify({
                    growthAcquisition,
                    permissionConfirmed,
                    sourceType: 'menu_link',
                    url: trimmedLink,
                }),
                cache: 'no-store',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
                redirect: 'manual',
            });

            if (response.status === 401) {
                redirectToSignIn();
                return;
            }

            if (response.status === 429) {
                setError(t('CreateMenu.uploadLimit'));
                setState('error');
                return;
            }

            const { payload, parseFailed } = await readCreateMenuDraftResponseJson(response, 'link', trimmedLink);

            if (!response.ok) {
                setError(t('CreateMenu.linkFailed'));
                setState('error');
                return;
            }

            if (parseFailed || !isNonEmptyString(payload?.draftId)) {
                if (!parseFailed) {
                    logRuntimeFailure('public_create_menu_response_invalid', new Error('public_create_menu_response_invalid'), {
                        ...getCreateMenuResponseLogContext('link', trimmedLink),
                        responseOk: response.ok,
                        responseStatus: response.status,
                        maxBytes: CREATE_MENU_RESPONSE_JSON_MAX_BYTES,
                        hasDraftId: isNonEmptyString(payload?.draftId),
                    });
                }
                setError(t('CreateMenu.linkFailed'));
                setState('error');
                return;
            }

            setState('success');
            router.push(`/create-menu/preview/${payload.draftId}`);
        } catch {
            setError(t('CreateMenu.genericError'));
            setState('error');
        }
    }, [growthAcquisition, isAuthenticated, menuLink, permissionConfirmed, redirectToSignIn, router, t]);

    const isProcessing = state === 'optimizing' || state === 'uploading' || state === 'processing';

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '40px 20px 60px',
            minHeight: '70vh',
            maxWidth: '560px',
            margin: '0 auto',
        }}>
            {/* Hero */}
            <AnimateOnScroll>
                <WebsiteHeadline
                    as="h1"
                    size="compact"
                    text={t('CreateMenu.title')}
                    highlightedText={t('CreateMenu.titleHighlight')}
                    style={{
                        textAlign: 'center',
                        marginBottom: '12px',
                        lineHeight: 1.2,
                    }}
                />
            </AnimateOnScroll>
            <AnimateOnScroll delay={0.05}>
                <p style={{
                    fontSize: '16px',
                    color: 'var(--ws-text-secondary)',
                    textAlign: 'center',
                    marginBottom: '32px',
                    maxWidth: '420px',
                    lineHeight: 1.5,
                }}>
                    {t('CreateMenu.subtitle')}
                </p>
            </AnimateOnScroll>

            {!isAuthenticated ? (
                <AnimateOnScroll delay={0.08}>
                    <div style={authGateStyle}>
                        <div style={{ textAlign: 'center', width: '100%' }}>
                            <h2 style={{ color: 'var(--ws-text-primary)', fontSize: '19px', fontWeight: 700, margin: '0 0 6px' }}>
                                {t('CreateMenu.authTitle')}
                            </h2>
                            <p style={{ color: 'var(--ws-text-secondary)', fontSize: '14px', lineHeight: 1.45, margin: 0 }}>
                                {t('CreateMenu.authHint')}
                            </p>
                        </div>

                        <div style={authStepListStyle} aria-label={t('CreateMenu.authStepsLabel')}>
                            {[
                                { step: '1', title: t('CreateMenu.authStep0Title'), desc: t('CreateMenu.authStep0Desc') },
                                { step: '2', title: t('CreateMenu.authStep1Title'), desc: t('CreateMenu.authStep1Desc') },
                                { step: '3', title: t('CreateMenu.authStep2Title'), desc: t('CreateMenu.authStep2Desc') },
                            ].map((item) => (
                                <div key={item.step} style={authStepStyle}>
                                    <span style={authStepNumberStyle}>{item.step}</span>
                                    <div>
                                        <p style={authStepTitleStyle}>{item.title}</p>
                                        <p style={authStepDescStyle}>{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={authSupportedStyle}>
                            <span style={authSupportedLabelStyle}>{t('CreateMenu.authSupportedLabel')}</span>
                            <p style={authSupportedCopyStyle}>{t('CreateMenu.authSupportedInputs')}</p>
                        </div>

                        {isSessionLoading ? (
                            <div style={authCheckingStyle} role="status" aria-live="polite">
                                <LuLoader size={18} color="var(--ws-brand-secondary)" style={{ animation: 'spin 1s linear infinite' }} />
                                <span>{t('CreateMenu.authChecking')}</span>
                            </div>
                        ) : null}

                        {!isSessionLoading ? (
                            <>
                                <PhoneOtpAuthPanel
                                    buttonLabel={t('CreateMenu.whatsAppCodeCta')}
                                    changeNumberLabel={t('CreateMenu.otpChangeNumber')}
                                    codeLabel={t('CreateMenu.otpCodeLabel')}
                                    codePlaceholder={t('CreateMenu.otpCodePlaceholder')}
                                    getCodeSentMessage={(phoneLabel) => t('CreateMenu.otpCodeSent', { phone: phoneLabel })}
                                    getResendInLabel={(seconds) => t('CreateMenu.otpResendIn', { seconds })}
                                    onAuthenticated={async () => {
                                        await updateSession();
                                        router.refresh();
                                    }}
                                    phoneLabel={t('CreateMenu.phoneLabel')}
                                    phonePlaceholder={t('CreateMenu.phonePlaceholder')}
                                    primaryIcon="whatsapp"
                                    purpose="create_menu"
                                    resendCodeLabel={t('CreateMenu.otpResend')}
                                    showHeader={false}
                                    successMessage={t('CreateMenu.otpSuccess')}
                                    variant="createMenu"
                                    verifyButtonLabel={t('CreateMenu.otpVerifyCta')}
                                />
                                <div style={authDividerStyle}>
                                    <span style={authDividerLineStyle} />
                                    <span>{t('CreateMenu.authDivider')}</span>
                                    <span style={authDividerLineStyle} />
                                </div>
                                <button
                                    onClick={continueWithGoogle}
                                    style={googleAuthButtonStyle}
                                    type="button"
                                >
                                    <FcGoogle size={19} />
                                    {t('CreateMenu.googleCta')}
                                </button>
                                <p style={authTrustLineStyle}>{t('CreateMenu.authTrustLine')}</p>
                            </>
                        ) : null}
                    </div>
                </AnimateOnScroll>
            ) : (
                <>
                    {/* Input mode */}
                    <AnimateOnScroll delay={0.08}>
                        <div
                            role="tablist"
                            aria-label={t('CreateMenu.inputModeLabel')}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '8px',
                                width: '100%',
                                marginBottom: '16px',
                                padding: '6px',
                                border: '1px solid var(--ws-border-default)',
                                borderRadius: 'var(--ws-radius-xl)',
                                backgroundColor: 'var(--ws-bg-subtle)',
                            }}
                        >
                            {([
                                { icon: LuCamera, label: t('CreateMenu.inputPhotoTab'), mode: 'photo' as const },
                                { icon: LuLink, label: t('CreateMenu.inputLinkTab'), mode: 'link' as const },
                            ]).map((item) => {
                                const Icon = item.icon;
                                const isActive = inputMode === item.mode;
                                return (
                                    <button
                                        aria-selected={isActive}
                                        disabled={isProcessing}
                                        key={item.mode}
                                        onClick={() => selectInputMode(item.mode)}
                                        role="tab"
                                        style={{
                                            alignItems: 'center',
                                            backgroundColor: isActive ? 'var(--ws-bg-primary)' : 'transparent',
                                            border: 'none',
                                            borderRadius: 'var(--ws-radius-lg)',
                                            boxShadow: isActive ? 'var(--ws-shadow-xs)' : 'none',
                                            color: isActive ? 'var(--ws-text-primary)' : 'var(--ws-text-secondary)',
                                            cursor: isProcessing ? 'default' : 'pointer',
                                            display: 'inline-flex',
                                            fontSize: '14px',
                                            fontWeight: 700,
                                            gap: '8px',
                                            justifyContent: 'center',
                                            minHeight: '44px',
                                            padding: '10px 14px',
                                            transition: 'all var(--ws-transition-normal)',
                                        }}
                                        type="button"
                                    >
                                        <Icon color={isActive ? 'var(--ws-brand-secondary)' : 'currentColor'} size={17} />
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>
                    </AnimateOnScroll>

                    {/* Upload Area */}
                    <AnimateOnScroll delay={0.1}>
                        {inputMode === 'photo' ? (
                            <div
                                onClick={!isProcessing ? triggerFileInput : undefined}
                                onDrop={!isProcessing ? handleDrop : undefined}
                                onDragOver={handleDragOver}
                                style={dropZoneStyle({ error: Boolean(error), isProcessing, state })}
                            >
                                {/* Hidden file input */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    capture="environment"
                                    onChange={handleInputChange}
                                    style={{ display: 'none' }}
                                />

                                {/* Preview image background */}
                                {preview && (
                                    <div style={{
                                        position: 'absolute',
                                        inset: 0,
                                        backgroundImage: `url(${preview})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        opacity: 0.15,
                                        borderRadius: '14px',
                                    }} />
                                )}

                                <UploadStateContent
                                    error={error}
                                    isLinkMode={false}
                                    reset={() => {
                                        setState('idle');
                                        setError(null);
                                        setPreview(null);
                                    }}
                                    state={state}
                                    t={t}
                                />
                            </div>
                        ) : (
                            <form
                                onSubmit={handleLinkSubmit}
                                style={{
                                    ...dropZoneStyle({ error: Boolean(error), isProcessing, state }),
                                    alignItems: 'stretch',
                                    cursor: 'default',
                                    minHeight: '260px',
                                    textAlign: 'left',
                                }}
                            >
                                <UploadStateContent
                                    error={error}
                                    isLinkMode
                                    reset={() => {
                                        setState('idle');
                                        setError(null);
                                    }}
                                    state={state}
                                    t={t}
                                />

                                {state === 'idle' && (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '12px',
                                        marginTop: '6px',
                                        width: '100%',
                                    }}>
                                        <input
                                            aria-label={t('CreateMenu.linkInputLabel')}
                                            disabled={isProcessing}
                                            onChange={(e) => {
                                                setMenuLink(e.target.value);
                                                setError(null);
                                            }}
                                            placeholder={t('CreateMenu.linkPlaceholder')}
                                            style={{
                                                backgroundColor: 'var(--ws-bg-primary)',
                                                border: '1px solid var(--ws-border-default)',
                                                borderRadius: 'var(--ws-radius-lg)',
                                                boxSizing: 'border-box',
                                                color: 'var(--ws-text-primary)',
                                                fontSize: '15px',
                                                minHeight: '48px',
                                                outline: 'none',
                                                padding: '12px 14px',
                                                width: '100%',
                                            }}
                                            type="url"
                                            value={menuLink}
                                        />
                                        <label style={{
                                            alignItems: 'flex-start',
                                            color: 'var(--ws-text-secondary)',
                                            display: 'flex',
                                            fontSize: '13px',
                                            gap: '10px',
                                            lineHeight: 1.45,
                                        }}>
                                            <input
                                                checked={permissionConfirmed}
                                                disabled={isProcessing}
                                                onChange={(e) => {
                                                    setPermissionConfirmed(e.target.checked);
                                                    setError(null);
                                                }}
                                                style={{ marginTop: '3px' }}
                                                type="checkbox"
                                            />
                                            <span>{t('CreateMenu.linkPermission')}</span>
                                        </label>
                                        <button
                                            disabled={isProcessing}
                                            style={{
                                                alignItems: 'center',
                                                backgroundColor: 'var(--ws-cta-default)',
                                                border: 'none',
                                                borderRadius: 'var(--ws-radius-lg)',
                                                color: '#fff',
                                                cursor: isProcessing ? 'default' : 'pointer',
                                                display: 'inline-flex',
                                                fontSize: '15px',
                                                fontWeight: 700,
                                                gap: '8px',
                                                justifyContent: 'center',
                                                minHeight: '48px',
                                                opacity: isProcessing ? 0.7 : 1,
                                                padding: '12px 18px',
                                                width: '100%',
                                            }}
                                            type="submit"
                                        >
                                            <LuLink size={17} />
                                            {t('CreateMenu.linkSubmit')}
                                        </button>
                                    </div>
                                )}
                            </form>
                        )}
                    </AnimateOnScroll>
                </>
            )}

            {/* Value props */}
            <AnimateOnScroll delay={0.15}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    marginTop: '28px',
                    width: '100%',
                }}>
                    {[
                        { icon: '✓', text: t('CreateMenu.proof0') },
                        { icon: '✓', text: t('CreateMenu.proof1') },
                        { icon: '✓', text: t('CreateMenu.proof2') },
                    ].map((item, i) => (
                        <AnimateStaggerChild key={item.text} index={i}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                fontSize: '14px',
                                color: 'var(--ws-text-secondary)',
                            }}>
                                <span style={{ color: 'var(--ws-success)', fontWeight: 700, fontSize: '16px' }}>{item.icon}</span>
                                {item.text}
                            </div>
                        </AnimateStaggerChild>
                    ))}
                </div>
            </AnimateOnScroll>

            {/* How it works */}
            <AnimateOnScroll delay={0.2}>
                <div style={{
                    marginTop: '40px',
                    width: '100%',
                    padding: '24px',
                    backgroundColor: 'var(--ws-bg-subtle)',
                    borderRadius: 'var(--ws-radius-xl)',
                }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ws-text-primary)', marginBottom: '16px' }}>
                        {t('CreateMenu.howTitle')}
                    </h2>
                    {[
                        { step: '1', title: t('CreateMenu.step0Title'), desc: t('CreateMenu.step0Desc') },
                        { step: '2', title: t('CreateMenu.step1Title'), desc: t('CreateMenu.step1Desc') },
                        { step: '3', title: t('CreateMenu.step2Title'), desc: t('CreateMenu.step2Desc') },
                    ].map((item, i) => (
                        <AnimateStaggerChild key={item.step} index={i}>
                            <div style={{
                                display: 'flex',
                                gap: '14px',
                                marginBottom: i < 2 ? '16px' : 0,
                            }}>
                                <div style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--ws-brand-secondary)',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    flexShrink: 0,
                                }}>
                                    {item.step}
                                </div>
                                <div>
                                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ws-text-primary)', marginBottom: '2px' }}>
                                        {item.title}
                                    </p>
                                    <p style={{ fontSize: '13px', color: 'var(--ws-text-secondary)' }}>{item.desc}</p>
                                </div>
                            </div>
                        </AnimateStaggerChild>
                    ))}
                </div>
            </AnimateOnScroll>

            {/* Spin animation CSS */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

function UploadStateContent({
    error,
    isLinkMode,
    reset,
    state,
    t,
}: {
    error: string | null;
    isLinkMode: boolean;
    reset: () => void;
    state: UploadState;
    t: ReturnType<typeof useTranslations>;
}) {
    return (
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            {state === 'idle' && (
                <>
                    {isLinkMode
                        ? <LuLink size={42} color="var(--ws-brand-secondary)" style={{ marginBottom: '12px' }} />
                        : <LuCamera size={48} color="var(--ws-brand-secondary)" style={{ marginBottom: '12px' }} />}
                    <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ws-text-primary)', marginBottom: '4px' }}>
                        {isLinkMode ? t('CreateMenu.linkTitle') : t('CreateMenu.uploadTitle')}
                    </p>
                    <p style={{ fontSize: '14px', color: 'var(--ws-text-muted)', lineHeight: 1.5, margin: 0 }}>
                        {isLinkMode ? t('CreateMenu.linkHint') : t('CreateMenu.uploadHint')}
                    </p>
                </>
            )}

            {state === 'optimizing' && (
                <>
                    <LuLoader size={40} color="var(--ws-brand-secondary)" style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                    <p style={{ fontSize: '15px', color: 'var(--ws-text-secondary)' }}>{t('CreateMenu.preparing')}</p>
                </>
            )}

            {state === 'uploading' && (
                <>
                    <LuUpload size={40} color="var(--ws-brand-secondary)" style={{ marginBottom: '12px' }} />
                    <p style={{ fontSize: '15px', color: 'var(--ws-text-secondary)' }}>
                        {isLinkMode ? t('CreateMenu.readingLink') : t('CreateMenu.uploading')}
                    </p>
                </>
            )}

            {state === 'success' && (
                <>
                    <LuCheck size={40} color="var(--ws-success)" style={{ marginBottom: '12px' }} />
                    <p style={{ fontSize: '15px', color: 'var(--ws-success)' }}>{t('CreateMenu.redirecting')}</p>
                </>
            )}

            {state === 'error' && (
                <>
                    <LuAlertCircle size={40} color="var(--ws-error)" style={{ marginBottom: '12px' }} />
                    <p style={{ fontSize: '15px', color: 'var(--ws-error)', marginBottom: '12px' }}>{error}</p>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            reset();
                        }}
                        style={{
                            padding: '10px 24px',
                            backgroundColor: 'var(--ws-cta-default)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--ws-radius-lg)',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                        type="button"
                    >
                        {t('CreateMenu.tryAgain')}
                    </button>
                </>
            )}
        </div>
    );
}

const authGateStyle: React.CSSProperties = {
    alignItems: 'center',
    backgroundColor: 'var(--ws-bg-primary)',
    border: '1px solid var(--ws-border-default)',
    borderRadius: 'var(--ws-radius-xl)',
    boxShadow: 'var(--ws-shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '4px',
    minHeight: '240px',
    padding: '28px 22px',
    width: '100%',
};

const authStepListStyle: React.CSSProperties = {
    display: 'grid',
    gap: '10px',
    width: '100%',
};

const authStepStyle: React.CSSProperties = {
    alignItems: 'flex-start',
    backgroundColor: 'var(--ws-bg-subtle)',
    border: '1px solid var(--ws-border-subtle)',
    borderRadius: 'var(--ws-radius-lg)',
    display: 'grid',
    gap: '10px',
    gridTemplateColumns: '28px minmax(0, 1fr)',
    padding: '12px',
    width: '100%',
};

const authStepNumberStyle: React.CSSProperties = {
    alignItems: 'center',
    backgroundColor: 'var(--ws-brand-secondary)',
    borderRadius: '999px',
    color: '#fff',
    display: 'inline-flex',
    fontSize: '13px',
    fontWeight: 800,
    height: '28px',
    justifyContent: 'center',
    lineHeight: 1,
    width: '28px',
};

const authStepTitleStyle: React.CSSProperties = {
    color: 'var(--ws-text-primary)',
    fontSize: '14px',
    fontWeight: 800,
    lineHeight: 1.25,
    margin: 0,
};

const authStepDescStyle: React.CSSProperties = {
    color: 'var(--ws-text-secondary)',
    fontSize: '13px',
    lineHeight: 1.45,
    margin: '3px 0 0',
};

const authSupportedStyle: React.CSSProperties = {
    backgroundColor: 'var(--ws-bg-accent)',
    border: '1px solid color-mix(in srgb, var(--ws-brand-secondary) 18%, var(--ws-border-default))',
    borderRadius: 'var(--ws-radius-lg)',
    padding: '12px',
    width: '100%',
};

const authSupportedLabelStyle: React.CSSProperties = {
    color: 'var(--ws-brand-secondary)',
    display: 'block',
    fontSize: '13px',
    fontWeight: 800,
    lineHeight: 1.2,
    marginBottom: '4px',
};

const authSupportedCopyStyle: React.CSSProperties = {
    color: 'var(--ws-text-secondary)',
    fontSize: '13px',
    lineHeight: 1.45,
    margin: 0,
};

const authCheckingStyle: React.CSSProperties = {
    alignItems: 'center',
    color: 'var(--ws-text-secondary)',
    display: 'inline-flex',
    fontSize: '13px',
    fontWeight: 700,
    gap: '8px',
    justifyContent: 'center',
    minHeight: '32px',
};

const authTrustLineStyle: React.CSSProperties = {
    color: 'var(--ws-text-secondary)',
    fontSize: '13px',
    lineHeight: 1.45,
    margin: 0,
    textAlign: 'center',
};

const authDividerStyle: React.CSSProperties = {
    alignItems: 'center',
    color: 'var(--ws-text-muted)',
    display: 'grid',
    fontSize: '13px',
    gap: '10px',
    gridTemplateColumns: '1fr auto 1fr',
    lineHeight: 1,
    width: '100%',
};

const authDividerLineStyle: React.CSSProperties = {
    backgroundColor: 'var(--ws-border-default)',
    display: 'block',
    height: '1px',
};

const googleAuthButtonStyle: React.CSSProperties = {
    alignItems: 'center',
    backgroundColor: 'var(--ws-bg-primary)',
    border: '1px solid var(--ws-border-default)',
    borderRadius: '10px',
    color: 'var(--ws-text-primary)',
    cursor: 'pointer',
    display: 'inline-flex',
    fontSize: '15px',
    fontWeight: 700,
    gap: '10px',
    justifyContent: 'center',
    minHeight: '50px',
    padding: '12px 16px',
    width: '100%',
};

function dropZoneStyle({
    error,
    isProcessing,
    state,
}: {
    error: boolean;
    isProcessing: boolean;
    state: UploadState;
}): React.CSSProperties {
    return {
        width: '100%',
        minHeight: '240px',
        border: `2px dashed ${error ? 'var(--ws-error)' : state === 'success' ? 'var(--ws-success)' : 'var(--ws-border-default)'}`,
        borderRadius: 'var(--ws-radius-xl)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '32px 24px',
        cursor: isProcessing ? 'default' : 'pointer',
        backgroundColor: isProcessing ? 'var(--ws-bg-subtle)' : 'var(--ws-bg-primary)',
        transition: 'all var(--ws-transition-normal)',
        position: 'relative',
        overflow: 'hidden',
    };
}

/**
 * Client-side image optimization using Compressor.js
 * Max 1920px wide, 80% JPEG quality — same as existing menu upload pipeline
 */
async function optimizeImage(file: File): Promise<File> {
    try {
        const Compressor = (await import('compressorjs')).default;
        return new Promise((resolve, reject) => {
            new Compressor(file, {
                maxWidth: 1920,
                maxHeight: 1920,
                quality: 0.8,
                convertTypes: ['image/png', 'image/webp'],
                convertSize: 1000000, // Convert to JPEG if > 1MB
                success: (result) => {
                    const optimized = new File([result], file.name, { type: result.type });
                    resolve(optimized);
                },
                error: (err) => {
                    // Fallback: use original file if optimization fails
                    resolve(file);
                },
            });
        });
    } catch {
        // Compressor.js not available — use original
        return file;
    }
}
