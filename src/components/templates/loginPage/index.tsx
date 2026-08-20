'use client'
import { FEATURE_FLAGS } from '@config/features';
import { EMPTY_ERROR } from "@constant/common";
import { PRODUCT_IDS } from '@constant/product';
import { CLIENT_DASHBOARD_ROUTING, HOME_ROUTING, NAVIGARIONS_ROUTINGS } from "@constant/navigations";
import { ANSWERLATTICE_LOCAL_DEV_PATH_PREFIX, isAnswerlatticeProductHostname } from '@constant/answerlattice/domains';
import { resolveProductSiteByDevPath, resolveProductSiteByHostname } from '@constant/productDomains';
import AnswerlatticeLogoMark from '@/components/atoms/answerlatticeLogoMark';
import BrandWordmark from '@/components/website/shared/BrandWordmark';
import PhoneOtpAuthPanel from '@/components/auth/PhoneOtpAuthPanel';
import { useAppSelector } from "@hook/useAppSelector";
import { canUseAnswerlatticeManagement, resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { AUTH_BROWSER_REQUEST_POLICY } from '@lib/auth/browserRequestPolicy';
import {
  clearPendingClaimToken,
  readPendingClaimToken,
  writePendingClaimToken,
} from '@lib/auth/pendingClaimStorage';
import { firebaseAuth } from "@lib/firebase/firebaseClient";
import { syncAnswerlatticeAuthWithCustomToken } from "@lib/firebase/syncAnswerlatticeAuth";
import { getBoundedAuthStringContext, logAuthFailure } from '@lib/auth/authDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { getDarkModeState, toggleDarkMode } from "@reduxSlices/clientThemeConfig";
import { startLoader, stopLoader } from "@reduxSlices/loader";
import { showErrorToast, showSuccessToast } from "@reduxSlices/toast";
import { Button, Divider, Flex, Form, Input, Space, theme, Typography } from "antd";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getSession, signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { FcGoogle } from "react-icons/fc";
import { LuLock, LuMoon, LuSun, LuUser } from "react-icons/lu";
import { useAppDispatch } from "src/hooks/useAppDispatch";
import styles from './loginPage.module.scss';

const ANSWERLATTICE_LOGIN_TAGLINE = 'The governed source behind customer answers.';

const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) return { valid: false, reason: 'Invalid email format' };
  const domain = email.split('@')[1]?.toLowerCase() || '';
  const localDomains = ['localhost', 'local', 'test', 'example.com', 'example.org'];
  if (localDomains.some(d => domain.includes(d))) return { valid: false, reason: 'Local or test email domains are not allowed' };
  if (/^\d+\.\d+\.\d+\.\d+$/.test(domain)) return { valid: false, reason: 'IP address email domains are not allowed' };
  return { valid: true };
};

const validateLoginIdentifier = (value: string) => {
  const identifier = (value || '').trim();
  if (!identifier) return { valid: false, reason: 'Email, phone, or staff ID is required' };
  if (identifier.includes('@')) return validateEmail(identifier);
  const phoneUsername = identifier.replace(/[^0-9]/g, '');
  if (phoneUsername.length < 10) return { valid: false, reason: 'Enter a valid email, phone, or staff ID' };
  return { valid: true };
};

type LoginIdentifierKind = 'empty' | 'email' | 'phone' | 'staff';
type CredentialMode = 'default' | 'passcode';

const getLoginIdentifierKind = (value: string): LoginIdentifierKind => {
  const identifier = String(value || '').trim();
  if (!identifier) return 'empty';
  if (identifier.includes('@')) return 'email';

  const digits = identifier.replace(/[^0-9]/g, '');
  const phoneLikeInput = /^[+\d\s().-]+$/.test(identifier);
  if (phoneLikeInput && digits.length >= 10) return 'phone';

  return 'staff';
};

const getSecretLabel = (kind: LoginIdentifierKind) => (
  kind === 'email' ? 'Password' : 'Passcode'
);

const getSecretPlaceholder = (kind: LoginIdentifierKind) => (
  kind === 'email' ? 'Password' : 'Passcode'
);

const sameLoginEmail = (left?: string | null, right?: string | null) => (
  String(left || '').toLowerCase().trim() === String(right || '').toLowerCase().trim()
);

const LOGIN_ERRORS = {
  "INVALID_CREAD": "invalid-login-credentials",
  "UNREGISTRED": "email-not-registred",
}
const { Text } = Typography;
const CLAIM_ACCOUNT_SETUP_FAILED_MESSAGE = 'Failed to set up account';
const LOGIN_FAILED_MESSAGE = 'Login failed. Please check your details and try again.';
const LOGIN_PAGE_RESPONSE_JSON_MAX_BYTES = 32 * 1024;
const LOGIN_PAGE_ERROR_MESSAGES = new Set([
  CLAIM_ACCOUNT_SETUP_FAILED_MESSAGE,
  LOGIN_FAILED_MESSAGE,
]);
const JOURNEY_MOTION_MEDIA = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';
const NON_MENULIST_PRODUCT_ROUTE_ROOTS = new Set([
  'answerlattice',
  'campaigncue',
  'neelvara',
  'mycodex',
  'sites',
]);

const getCallbackPathname = (callbackUrl?: string | null) => {
  if (!callbackUrl) return '';

  try {
    return new URL(callbackUrl, 'https://menulist.local').pathname;
  } catch {
    return '';
  }
};

const isNonMenuListProductPath = (pathname: string) => {
  if (!pathname || pathname === '/') return false;

  const devPathProduct = resolveProductSiteByDevPath(pathname);
  if (devPathProduct && devPathProduct.product.id !== 'menulist') return true;

  const [routeRoot] = pathname.split('/').filter(Boolean);
  return Boolean(routeRoot && NON_MENULIST_PRODUCT_ROUTE_ROOTS.has(routeRoot));
};

const getLoginPageErrorMessage = (message?: string) => {
  const normalized = String(message || '').trim();
  return LOGIN_PAGE_ERROR_MESSAGES.has(normalized) ? normalized : '';
};

type LoginPageResponseAction = 'validate_claim' | 'set_claims' | 'claim_account';

type LoginClaimValidationResponse = {
  businessName?: unknown;
  phone?: unknown;
  preview?: unknown;
  status?: unknown;
  valid?: boolean;
};

type LoginClaimAccountResponse = {
  mode?: unknown;
  storeId?: unknown;
  success?: boolean;
  tenantId?: unknown;
};

type LoginSetClaimsResponse = {
  answerlatticeCustomToken?: unknown;
  customToken?: unknown;
};

type LoginClaimAccountMode = 'email-password' | 'google' | 'whatsapp-phone';

const isNonEmptyString = (value: unknown): value is string => (
  typeof value === 'string' && value.trim().length > 0
);

const getOptionalResponseString = (value: unknown): string | undefined => (
  isNonEmptyString(value) ? value : undefined
);

const getOptionalMaskedClaimPhone = (value: unknown): string | undefined => {
  const phone = getOptionalResponseString(value);
  if (!phone) return undefined;
  return /^\*{4}\d{2,6}$/.test(phone) ? phone : undefined;
};

const isClaimIdentityValue = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0;
  return isNonEmptyString(value);
};

const isClaimAccountMode = (value: unknown): value is LoginClaimAccountMode => (
  value === 'email-password' || value === 'google' || value === 'whatsapp-phone'
);

const isSuccessfulClaimValidationResponse = (
  value: LoginClaimValidationResponse | null | undefined,
): value is LoginClaimValidationResponse & {
  businessName: string;
  preview: 'claim-token';
  status: 'valid';
  valid: true;
} => (
  value?.valid === true
  && value.preview === 'claim-token'
  && value.status === 'valid'
  && isNonEmptyString(value.businessName)
);

const isSuccessfulClaimAccountResponse = (
  value: LoginClaimAccountResponse | null | undefined,
  expectedMode: LoginClaimAccountMode,
): value is LoginClaimAccountResponse & {
  mode: LoginClaimAccountMode;
  storeId: number | string;
  success: true;
  tenantId: number | string;
} => (
  value?.success === true
  && value.mode === expectedMode
  && isClaimIdentityValue(value.tenantId)
  && isClaimIdentityValue(value.storeId)
);

const logClaimAccountResponseInvalid = (
  value: LoginClaimAccountResponse | null | undefined,
  expectedMode: LoginClaimAccountMode,
  context: Record<string, boolean | number | string | null | undefined> = {},
) => {
  logAuthFailure(
    'login_page_claim_account_response_invalid',
    new Error('login_page_claim_account_response_invalid'),
    {
      ...context,
      expectedMode,
      hasExpectedMode: value?.mode === expectedMode,
      hasStoreId: isClaimIdentityValue(value?.storeId),
      hasTenantId: isClaimIdentityValue(value?.tenantId),
      modeKnown: isClaimAccountMode(value?.mode),
      success: value?.success === true,
    },
  );
};

const logClaimValidationResponseInvalid = (
  value: LoginClaimValidationResponse | null | undefined,
  context: Record<string, boolean | number | string | null | undefined> = {},
) => {
  logAuthFailure(
    'login_page_validate_claim_response_invalid',
    new Error('login_page_validate_claim_response_invalid'),
    {
      ...context,
      hasBusinessName: isNonEmptyString(value?.businessName),
      hasExpectedPreview: value?.preview === 'claim-token',
      hasValidStatus: value?.status === 'valid',
      responseValid: value?.valid === true,
    },
  );
};

const readLoginPageResponseJson = async <T,>(
  response: Response,
  action: LoginPageResponseAction,
  context: Record<string, boolean | number | string | null | undefined> = {},
): Promise<T | null> => {
  const logContext = {
    ...context,
    action,
    maxBytes: LOGIN_PAGE_RESPONSE_JSON_MAX_BYTES,
    responseOk: response.ok,
    responseStatus: response.status,
  };

  let payload: unknown;
  try {
    payload = await readJsonResponseWithLimit<unknown>(response, LOGIN_PAGE_RESPONSE_JSON_MAX_BYTES);
  } catch (error) {
    logAuthFailure('login_page_response_parse_failed', error, logContext);
    return null;
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    logAuthFailure(
      'login_page_response_invalid',
      new Error('login_page_response_invalid'),
      logContext,
    );
    return null;
  }

  return payload as T;
};

function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: sessionData, update: updateSession } = useSession();
  const dispatch = useAppDispatch();
  const [error, setError] = useState({ id: '', message: '' });
  const { token } = theme.useToken();
  const isDarkMode = useAppSelector(getDarkModeState)
  const [loginForm] = Form.useForm();
  const loginPageRef = useRef<HTMLDivElement | null>(null);
  const journeyArtRef = useRef<HTMLSpanElement | null>(null);
  const journeyMotionEnabledRef = useRef(false);
  const journeyMotionFrame = useRef<number | null>(null);
  const loginIdentifier = Form.useWatch('email', loginForm) || '';
  const [credentialMode, setCredentialMode] = useState<CredentialMode>('default');
  const [otpPanelKey, setOtpPanelKey] = useState(0);
  const [loginHostname, setLoginHostname] = useState('');
  const loginIdentifierKind = getLoginIdentifierKind(loginIdentifier);
  const shouldOfferPhoneOtp = FEATURE_FLAGS.ENABLE_PHONE_OTP_AUTH
    && loginIdentifierKind === 'phone'
    && credentialMode !== 'passcode';
  const shouldShowSecretInput = loginIdentifierKind !== 'empty' && !shouldOfferPhoneOtp;
  const secretLabel = getSecretLabel(loginIdentifierKind);
  const secretPlaceholder = getSecretPlaceholder(loginIdentifierKind);
  const callbackPathname = getCallbackPathname(searchParams?.get('callbackUrl'));
  const hostProduct = loginHostname ? resolveProductSiteByHostname(loginHostname) : undefined;
  const callbackProduct = resolveProductSiteByDevPath(callbackPathname)?.product;
  const isAnswerlatticeExperience = isAnswerlatticeProductHostname(loginHostname)
    || hostProduct?.id === 'answerlattice'
    || callbackProduct?.id === 'answerlattice'
    || callbackPathname === '/answerlattice'
    || callbackPathname.startsWith('/answerlattice/');
  const shouldOfferGoogleAuth = !isAnswerlatticeExperience;
  const loginProductName = isAnswerlatticeExperience ? 'AnswerLattice' : 'MenuList';
  const loginTagline = isAnswerlatticeExperience
    ? ANSWERLATTICE_LOGIN_TAGLINE
    : 'Take your business beyond the four walls.';
  const loginManagementDescription = isAnswerlatticeExperience
    ? 'Log in to manage reviewed answers and support knowledge.'
    : 'Log in to manage your menus.';
  const claimManagementDescription = isAnswerlatticeExperience
    ? 'Set up your account to manage reviewed answers and support knowledge'
    : 'Set up your account to manage your digital menu';
  const usesGenericProductArtwork = Boolean(hostProduct && hostProduct.id !== 'menulist')
    || isNonMenuListProductPath(callbackPathname);

  const getLoginHomeRoute = () => {
    if (!isAnswerlatticeExperience) return HOME_ROUTING;
    return isAnswerlatticeProductHostname(loginHostname)
      ? HOME_ROUTING
      : ANSWERLATTICE_LOCAL_DEV_PATH_PREFIX;
  };

	  const getPostLoginRedirect = () => {
	    const callbackUrl = searchParams?.get('callbackUrl');
	    if (!callbackUrl) return CLIENT_DASHBOARD_ROUTING;

	    try {
	      const parsedUrl = new URL(callbackUrl, window.location.origin);
	      if (parsedUrl.origin === window.location.origin) {
	        return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
	      }
    } catch {
      return CLIENT_DASHBOARD_ROUTING;
    }

    return CLIENT_DASHBOARD_ROUTING;
  };

  const getAnswerlatticeSubscriptionRedirect = () => {
    if (typeof window === 'undefined') return `${ANSWERLATTICE_LOCAL_DEV_PATH_PREFIX}/pricing`;
    return isAnswerlatticeProductHostname(window.location.hostname)
      ? '/pricing'
      : `${ANSWERLATTICE_LOCAL_DEV_PATH_PREFIX}/pricing`;
  };

  const isAnswerlatticeRedirectTarget = (target: string, isAnswerlatticeHost = false) => (
    target === '/answerlattice'
    || target.startsWith('/answerlattice/')
    || target === ANSWERLATTICE_LOCAL_DEV_PATH_PREFIX
    || target.startsWith(`${ANSWERLATTICE_LOCAL_DEV_PATH_PREFIX}/`)
    || (isAnswerlatticeHost && (target === CLIENT_DASHBOARD_ROUTING || target.startsWith('/dashboard')))
  );

  const shouldRequestAnswerlatticeClaims = () => {
    if (typeof window === 'undefined') return false;
    const isAnswerlatticeHost = isAnswerlatticeProductHostname(window.location.hostname);
    return isAnswerlatticeHost || isAnswerlatticeRedirectTarget(getPostLoginRedirect(), isAnswerlatticeHost);
  };

  const getSetClaimsBody = (payload: Record<string, unknown> = {}) => ({
    ...payload,
    ...(shouldRequestAnswerlatticeClaims() ? { productId: PRODUCT_IDS.ANSWERLATTICE } : {}),
  });

  const resetJourneyMotion = useCallback(() => {
    if (typeof window !== 'undefined' && journeyMotionFrame.current !== null) {
      window.cancelAnimationFrame(journeyMotionFrame.current);
      journeyMotionFrame.current = null;
    }

    const journeyArt = journeyArtRef.current;
    if (!journeyArt) return;

    journeyArt.style.setProperty('--auth-journey-shift-x', '0px');
    journeyArt.style.setProperty('--auth-journey-shift-y', '0px');
    journeyArt.style.setProperty('--auth-journey-tilt-x', '0deg');
    journeyArt.style.setProperty('--auth-journey-tilt-y', '0deg');
    journeyArt.style.setProperty('--auth-journey-rotate', '0deg');
  }, []);

  const handleJourneyPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || typeof window === 'undefined') return;
    if (!journeyMotionEnabledRef.current) return;

    const x = ((event.clientX / window.innerWidth) - 0.5) * 2;
    const y = ((event.clientY / window.innerHeight) - 0.5) * 2;

    if (journeyMotionFrame.current !== null) {
      window.cancelAnimationFrame(journeyMotionFrame.current);
    }

    journeyMotionFrame.current = window.requestAnimationFrame(() => {
      const journeyArt = journeyArtRef.current;
      if (!journeyArt) return;

      journeyArt.style.setProperty('--auth-journey-shift-x', `${(x * 18).toFixed(2)}px`);
      journeyArt.style.setProperty('--auth-journey-shift-y', `${(y * 10).toFixed(2)}px`);
      journeyArt.style.setProperty('--auth-journey-tilt-x', `${(-y * 1.2).toFixed(2)}deg`);
      journeyArt.style.setProperty('--auth-journey-tilt-y', `${(x * 1.8).toFixed(2)}deg`);
      journeyArt.style.setProperty('--auth-journey-rotate', `${(x * 0.35).toFixed(2)}deg`);
      journeyMotionFrame.current = null;
    });
  }, [resetJourneyMotion]);

  useEffect(() => {
    if (typeof window === 'undefined') return resetJourneyMotion;

    const media = window.matchMedia(JOURNEY_MOTION_MEDIA);
    const syncJourneyMotionPreference = () => {
      journeyMotionEnabledRef.current = media.matches;
      if (!media.matches) resetJourneyMotion();
    };

    syncJourneyMotionPreference();
    media.addEventListener('change', syncJourneyMotionPreference);

    return () => {
      media.removeEventListener('change', syncJourneyMotionPreference);
      resetJourneyMotion();
    };
  }, [resetJourneyMotion]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setLoginHostname(window.location.hostname);
  }, []);

  const getSafePostLoginRedirect = () => {
    const target = getPostLoginRedirect();
    if (typeof window === 'undefined') return target;

    const isAnswerlatticeHost = isAnswerlatticeProductHostname(window.location.hostname);
    const isAnswerlatticeTarget = isAnswerlatticeRedirectTarget(target, isAnswerlatticeHost);
    const hasAnswerlatticeAccess = Boolean(resolveAnswerlatticeSessionScope(sessionData)) || canUseAnswerlatticeManagement(sessionData);

    if (isAnswerlatticeTarget && !hasAnswerlatticeAccess) {
      return getAnswerlatticeSubscriptionRedirect();
    }

    return target;
  };

  // Claim account flow (messaging onboarding → Google account linking OR email/password setup)
  const [claimInfo, setClaimInfo] = useState<{ businessName: string; phone: string | null } | null>(null);
  const [claimProcessing, setClaimProcessing] = useState(false);
  const claimProcessingRef = useRef(false);
  const [showClaimEmailSetup, setShowClaimEmailSetup] = useState(false);
  const [showClaimPhoneSetup, setShowClaimPhoneSetup] = useState(false);
  const [claimSetupSuccess, setClaimSetupSuccess] = useState(false);
  const [claimSetupLoginLabel, setClaimSetupLoginLabel] = useState('your login details');

  // Check for claim token in URL on mount (gated by feature flag)
  useEffect(() => {
    if (!FEATURE_FLAGS.ENABLE_CLAIM_ACCOUNT) return;
    const claimToken = searchParams?.get('claim');
    clearPendingClaimToken(window.localStorage);
    if (!claimToken) return;
    if (writePendingClaimToken(window.sessionStorage, claimToken)) {
      // Validate the token and get business info
      const validateClaimToken = async () => {
        try {
          const response = await fetch(`/api/auth/validate-claim?token=${encodeURIComponent(claimToken)}`, {
            ...AUTH_BROWSER_REQUEST_POLICY,
            headers: { Accept: 'application/json' },
          });
          const data = await readLoginPageResponseJson<LoginClaimValidationResponse>(
            response,
            'validate_claim',
            getBoundedAuthStringContext('claimToken', claimToken),
          );
          if (response.ok && isSuccessfulClaimValidationResponse(data)) {
            setClaimInfo({
              businessName: data.businessName.trim(),
              phone: getOptionalMaskedClaimPhone(data.phone) || null,
            });
          } else {
            if (response.ok) {
              logClaimValidationResponseInvalid(
                data,
                getBoundedAuthStringContext('claimToken', claimToken),
              );
            }
            // Token invalid/expired — clear it, let normal login proceed
            clearPendingClaimToken(window.sessionStorage);
          }
        } catch {
          clearPendingClaimToken(window.sessionStorage);
        }
      };
      validateClaimToken();
    }
  }, [searchParams]);

  // Handle post-login setup (for both Google and redirect-based logins)
  useEffect(() => {
    const setupFirebaseAuth = async () => {
      if (Boolean(sessionData?.user) && sessionData?.user?.email) {
        const syncFirebaseAuthForCurrentSession = async () => {
          // Check if Firebase Auth is already signed in
          const currentUser = firebaseAuth.currentUser;

          if (!currentUser) {
            // User is logged in with NextAuth but not Firebase Auth
            // This happens after Google OAuth redirect
            try {
              // Get custom token from server for OAuth users
              const setClaimsResponse = await fetch('/api/auth/set-claims', {
                ...AUTH_BROWSER_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(getSetClaimsBody({})) // No UID - will create token
              });

              if (setClaimsResponse.ok) {
                const data = await readLoginPageResponseJson<LoginSetClaimsResponse>(
                  setClaimsResponse,
                  'set_claims',
                );

                const customToken = getOptionalResponseString(data?.customToken);
                if (customToken) {
                  // Sign in with custom token
                  const { signInWithCustomToken } = await import('firebase/auth');
                  await signInWithCustomToken(firebaseAuth, customToken);
                  await syncAnswerlatticeAuthWithCustomToken(getOptionalResponseString(data?.answerlatticeCustomToken));
                }
              }
            } catch {
              // NextAuth remains the source of truth; server-side auth routes own detailed security logging.
            }
          } else if (sameLoginEmail(currentUser.email, sessionData.user.email)) {
            // Ensure custom claims are set
            try {
              const setClaimsResponse = await fetch('/api/auth/set-claims', {
                ...AUTH_BROWSER_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(getSetClaimsBody({ uid: currentUser.uid }))
              });

              if (setClaimsResponse.ok) {
                const data = await readLoginPageResponseJson<LoginSetClaimsResponse>(
                  setClaimsResponse,
                  'set_claims',
                );
                await currentUser.getIdToken(true); // Refresh token
                await syncAnswerlatticeAuthWithCustomToken(getOptionalResponseString(data?.answerlatticeCustomToken));
              }
            } catch {
              // Keep the login flow resilient; token refresh can be retried by downstream guarded calls.
            }
          } else {
            try {
              const setClaimsResponse = await fetch('/api/auth/set-claims', {
                ...AUTH_BROWSER_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(getSetClaimsBody({}))
              });

              if (setClaimsResponse.ok) {
                const data = await readLoginPageResponseJson<LoginSetClaimsResponse>(
                  setClaimsResponse,
                  'set_claims',
                );

                const customToken = getOptionalResponseString(data?.customToken);
                if (customToken) {
                  const { signInWithCustomToken } = await import('firebase/auth');
                  await signInWithCustomToken(firebaseAuth, customToken);
                  await syncAnswerlatticeAuthWithCustomToken(getOptionalResponseString(data?.answerlatticeCustomToken));
                }
              }
            } catch {
              // NextAuth remains active even if Firebase client sync must retry later.
            }
          }
        };

        // Claim account flow: If there's a pending claim token, link accounts before redirecting
        const pendingClaim = readPendingClaimToken(window.sessionStorage);
        if (pendingClaim && claimProcessingRef.current) return;
        if (pendingClaim) {
          claimProcessingRef.current = true;
          setClaimProcessing(true);
          try {
            const claimRes = await fetch('/api/auth/claim-account', {
              ...AUTH_BROWSER_REQUEST_POLICY,
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ claimToken: pendingClaim }),
            });
            const claimContext = getBoundedAuthStringContext('claimToken', pendingClaim);
            const claimData = await readLoginPageResponseJson<LoginClaimAccountResponse>(
              claimRes,
              'claim_account',
              claimContext,
            );

            if (claimRes.ok && isSuccessfulClaimAccountResponse(claimData, 'google')) {
              clearPendingClaimToken(window.sessionStorage);
              await updateSession();
              await syncFirebaseAuthForCurrentSession();
              dispatch(showSuccessToast("Your business has been linked to your Google account!"));
              // Use a hard navigation so the dashboard starts from the refreshed auth context.
              window.location.href = getSafePostLoginRedirect();
              return;
            } else {
              if (claimRes.ok) {
                logClaimAccountResponseInvalid(claimData, 'google', claimContext);
              }
              // Claim failed — clear token, continue to dashboard normally
              clearPendingClaimToken(window.sessionStorage);
            }
          } catch {
            clearPendingClaimToken(window.sessionStorage);
          } finally {
            claimProcessingRef.current = false;
            setClaimProcessing(false);
          }
        }

        await syncFirebaseAuthForCurrentSession();

        router.push(getSafePostLoginRedirect());
      }
    };

    setupFirebaseAuth();
  }, [sessionData, router, dispatch, updateSession])

  // Handle email/password setup for messaging-onboarded users (claim flow MODE 2)
  const handleClaimEmailSetup = async (values: any) => {
    const requestId = "LoginPage:claimEmailSetup";
    try {
      dispatch(startLoader(requestId));
      const claimToken = readPendingClaimToken(window.sessionStorage);
      if (!claimToken) {
        dispatch(showErrorToast('Claim token missing. Please use the link from your message.'));
        return;
      }

      const res = await fetch('/api/auth/claim-account', {
        ...AUTH_BROWSER_REQUEST_POLICY,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimToken,
          email: values.email,
          password: values.password,
          name: claimInfo?.businessName,
        }),
      });
      const claimContext = getBoundedAuthStringContext('claimToken', claimToken);
      const data = await readLoginPageResponseJson<LoginClaimAccountResponse>(
        res,
        'claim_account',
        claimContext,
      );

      if (res.ok && isSuccessfulClaimAccountResponse(data, 'email-password')) {
        clearPendingClaimToken(window.sessionStorage);
        setClaimSetupSuccess(true);
        setClaimSetupLoginLabel('your email and password');
        dispatch(showSuccessToast('Account created! You can now log in.'));
        // Reset claim state so normal login form shows
        setClaimInfo(null);
        setShowClaimEmailSetup(false);
      } else {
        if (res.ok) {
          logClaimAccountResponseInvalid(data, 'email-password', claimContext);
        }
        dispatch(showErrorToast(CLAIM_ACCOUNT_SETUP_FAILED_MESSAGE));
      }
    } catch {
      dispatch(showErrorToast('An error occurred. Please try again.'));
    } finally {
      dispatch(stopLoader(requestId));
    }
  };

  const handleClaimPhoneSetup = async (values: any) => {
    const requestId = "LoginPage:claimPhoneSetup";
    try {
      dispatch(startLoader(requestId));
      const claimToken = readPendingClaimToken(window.sessionStorage);
      if (!claimToken) {
        dispatch(showErrorToast('Claim token missing. Please use the link from your message.'));
        return;
      }

      const res = await fetch('/api/auth/claim-account', {
        ...AUTH_BROWSER_REQUEST_POLICY,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimToken,
          password: values.password,
          name: claimInfo?.businessName,
          useWhatsappPhone: true,
        }),
      });
      const claimContext = getBoundedAuthStringContext('claimToken', claimToken);
      const data = await readLoginPageResponseJson<LoginClaimAccountResponse>(
        res,
        'claim_account',
        claimContext,
      );

      if (res.ok && isSuccessfulClaimAccountResponse(data, 'whatsapp-phone')) {
        clearPendingClaimToken(window.sessionStorage);
        setClaimSetupSuccess(true);
        setClaimSetupLoginLabel('your WhatsApp number and passcode');
        dispatch(showSuccessToast('Account created! You can now log in.'));
        setClaimInfo(null);
        setShowClaimPhoneSetup(false);
      } else {
        if (res.ok) {
          logClaimAccountResponseInvalid(data, 'whatsapp-phone', claimContext);
        }
        dispatch(showErrorToast(CLAIM_ACCOUNT_SETUP_FAILED_MESSAGE));
      }
    } catch {
      dispatch(showErrorToast('An error occurred. Please try again.'));
    } finally {
      dispatch(stopLoader(requestId));
    }
  };

  const handleSignIn = async (values: any) => {
    const requestId = "LoginPage:signInWithCredentials";
    try {
      dispatch(startLoader(requestId))

      // Step 1: Sign in with NextAuth (server-side)
      const response = await signIn("credentials", {
        redirect: false,
        email: values.email,
        password: values.password,
      });

      if (response?.error) {
        dispatch(stopLoader(requestId))
        dispatch(showErrorToast(LOGIN_FAILED_MESSAGE));
        return;
      }

      // Step 2: Sign in with Firebase Auth (client-side) 
      // This ensures Firebase Functions can access request.auth
      try {
        const activeSession = await getSession();
        const firebaseLoginEmail = activeSession?.user?.email || values.email;
        const userCredential = await signInWithEmailAndPassword(firebaseAuth, firebaseLoginEmail, values.password);

        // Step 3: Set custom claims on Firebase Auth token
        try {
          const setClaimsResponse = await fetch('/api/auth/set-claims', {
            ...AUTH_BROWSER_REQUEST_POLICY,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(getSetClaimsBody({ uid: userCredential.user.uid }))
          });

          if (setClaimsResponse.ok) {
            const data = await readLoginPageResponseJson<LoginSetClaimsResponse>(
              setClaimsResponse,
              'set_claims',
            );
            // Force token refresh to get new claims
            await userCredential.user.getIdToken(true);
            await syncAnswerlatticeAuthWithCustomToken(getOptionalResponseString(data?.answerlatticeCustomToken));
          }
        } catch {
          // Keep credentials login resilient; downstream guarded calls can refresh claims again.
        }
      } catch {
        // Continue anyway - NextAuth is working
      }

      dispatch(stopLoader(requestId))
      router.push(getPostLoginRedirect())
    } catch {
      dispatch(stopLoader(requestId))
      dispatch(showErrorToast("An error occurred during sign in"));
    }
  };

  const onValuesChange = (changedValues?: Record<string, unknown>) => {
    setError(EMPTY_ERROR)
    if (changedValues && Object.hasOwn(changedValues, 'email')) {
      setCredentialMode('default');
      setOtpPanelKey((value) => value + 1);
      loginForm.setFieldsValue({ password: undefined });
    }
  };

  const validateMessages = {
    required: "'${name}' is required!",
    // ...
  };
  const displayErrorMessage = getLoginPageErrorMessage(error.message);
  const renderBrandIntro = (
    statusText: string,
    statusColor: string,
    subHeading: string,
    subHeadingColor: string,
  ) => (
    <>
      <span className={styles.cardLogoShell}>
        {isAnswerlatticeExperience ? (
          <AnswerlatticeLogoMark
            idPrefix="answerlattice-login-card"
            height={44}
            className={styles.cardLogoMark}
          />
        ) : (
          <BrandWordmark
            showText={false}
            iconHeight={44}
            className={styles.cardLogoMark}
          />
        )}
      </span>
      <h3 className={`${styles.heading}`} style={{ color: statusColor }}>{statusText}</h3>
      <h1 onClick={() => router.push(getLoginHomeRoute())} className={`heading ${styles.heading} ${styles.title}`}>
        {isAnswerlatticeExperience ? (
          <span className={styles.brandTitleText}>AnswerLattice</span>
        ) : (
          <BrandWordmark
            showLogo={false}
            textClassName={styles.brandTitleText}
          />
        )}
      </h1>
      <div className={styles.subHeading} style={{ color: subHeadingColor }}>{subHeading}</div>
    </>
  );

  return <div
    ref={loginPageRef}
    className={`${styles.loginPageWrap} ${isDarkMode ? styles.loginPageDark : styles.loginPageLight}`}
    onPointerCancel={resetJourneyMotion}
    onPointerLeave={resetJourneyMotion}
    onPointerMove={handleJourneyPointerMove}
  >
    <div className={styles.staticBackdrop} aria-hidden="true">
      <span
        ref={journeyArtRef}
        className={`${styles.journeyArt} ${usesGenericProductArtwork ? styles.genericJourneyArt : styles.menuListJourneyArt}`}
      />
    </div>
    <header className={styles.topBar}>
      <Space className={styles.headerWrap} align="center">
        <Button
          aria-label={isDarkMode ? 'Use light theme' : 'Use dark theme'}
          icon={isDarkMode ? <LuSun /> : <LuMoon />}
          size="large"
          title={isDarkMode ? 'Use light theme' : 'Use dark theme'}
          onClick={() => dispatch(toggleDarkMode(!isDarkMode))}
        />
      </Space>
    </header>
    <div className={styles.bodyWrap}>
      <div className={styles.bodyContent}>
        <section className={styles.heroPanel}>
          <button
            aria-label={`Go to ${loginProductName} home`}
            className={styles.heroBrand}
            type="button"
            onClick={() => router.push(getLoginHomeRoute())}
          >
            {isAnswerlatticeExperience ? (
              <span className={styles.heroBrandMark}>
                <AnswerlatticeLogoMark
                  idPrefix="answerlattice-login-hero"
                  height={118}
                  className={styles.heroBrandLogo}
                />
                <span className={styles.heroBrandText}>AnswerLattice</span>
              </span>
            ) : (
              <BrandWordmark
                className={styles.heroBrandMark}
                iconHeight={118}
                logoClassName={styles.heroBrandLogo}
                textClassName={styles.heroBrandText}
              />
            )}
          </button>
          <p>{loginTagline}</p>
        </section>
        <div className={styles.rightContent}>
          <div className={`${styles.formWrap} ${isDarkMode ? styles.formWrapDark : styles.formWrapLight}`}
          >
            {claimInfo && !claimSetupSuccess ? (
              renderBrandIntro(
                `Welcome, ${claimInfo.businessName}!`,
                token.colorTextLabel,
                claimManagementDescription,
                token.colorTextHeading,
              )
            ) : claimSetupSuccess ? (
              renderBrandIntro(
                'Account created!',
                token.colorSuccess,
                `You can now log in with ${claimSetupLoginLabel} below`,
                token.colorTextHeading,
              )
            ) : (
              <div className={styles.normalBrandIntro}>
                {renderBrandIntro(
                  'Welcome to',
                  token.colorTextLabel,
                  loginTagline,
                  token.colorTextHeading,
                )}
              </div>
            )}
            {/* ━━━ CLAIM FLOW: Email/Password Setup Form ━━━ */}
            {claimInfo && showClaimEmailSetup && !claimSetupSuccess ? (
              <>
                <Form
                  name="claim_email_setup"
                  className={`${styles.form} login-form`}
                  initialValues={{}}
                  onFinish={handleClaimEmailSetup}
                  validateMessages={validateMessages}
                  style={{ marginTop: 16 }}
                >
                  <Form.Item
                    className={styles.formItem}
                    name="email"
                    rules={[
                      { required: true, message: 'Please input your email!' },
                      { type: 'email', message: 'Please enter a valid email address!' },
                      {
                        validator: async (_, value) => {
                          if (!value) return Promise.resolve();
                          const result = validateEmail(value);
                          if (!result.valid) return Promise.reject(new Error(result.reason || 'Invalid email address'));
                          return Promise.resolve();
                        }
                      }
                    ]}
                    validateTrigger={['onBlur', 'onChange']}
                  >
                    <Input className={styles.inputElement} size="large" prefix={<LuUser className="site-form-item-icon" />} allowClear placeholder="Your email" />
                  </Form.Item>
                  <Form.Item
                    className={styles.formItem}
                    name="password"
                    rules={[{ required: true, message: 'Please choose a password!' }, { min: 6, message: 'Password must be at least 6 characters' }]}
                  >
                    <Input.Password className={styles.inputElement} size="large" prefix={<LuLock className="site-form-item-icon" />} allowClear placeholder="Choose a password" />
                  </Form.Item>
                  <Form.Item
                    className={styles.formItem}
                    name="confirmPassword"
                    dependencies={['password']}
                    rules={[
                      { required: true, message: 'Please confirm your password!' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('password') === value) return Promise.resolve();
                          return Promise.reject(new Error('Passwords do not match'));
                        },
                      }),
                    ]}
                  >
                    <Input.Password className={styles.inputElement} size="large" prefix={<LuLock className="site-form-item-icon" />} allowClear placeholder="Confirm password" />
                  </Form.Item>
                  <Space direction="vertical" align="center" style={{ width: '100%' }}>
                    <Button type="primary" size="large" htmlType="submit" style={{ width: 200 }}>Create Account</Button>
                    <Button type="link" onClick={() => setShowClaimEmailSetup(false)}>Back to options</Button>
                  </Space>
                </Form>
              </>
            ) : claimInfo && showClaimPhoneSetup && !claimSetupSuccess ? (
              <>
                <Form
                  name="claim_phone_setup"
                  className={`${styles.form} login-form`}
                  initialValues={{}}
                  onFinish={handleClaimPhoneSetup}
                  validateMessages={validateMessages}
                  style={{ marginTop: 16 }}
                >
                  <Form.Item
                    className={styles.formItem}
                    name="password"
                    rules={[{ required: true, message: 'Please choose a passcode!' }, { min: 6, message: 'Passcode must be at least 6 characters' }]}
                  >
                    <Input.Password className={styles.inputElement} size="large" prefix={<LuLock className="site-form-item-icon" />} allowClear placeholder="Choose passcode" />
                  </Form.Item>
                  <Form.Item
                    className={styles.formItem}
                    name="confirmPassword"
                    dependencies={['password']}
                    rules={[
                      { required: true, message: 'Please confirm your passcode!' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('password') === value) return Promise.resolve();
                          return Promise.reject(new Error('Passcodes do not match'));
                        },
                      }),
                    ]}
                  >
                    <Input.Password className={styles.inputElement} size="large" prefix={<LuLock className="site-form-item-icon" />} allowClear placeholder="Confirm passcode" />
                  </Form.Item>
                  <Space direction="vertical" align="center" style={{ width: '100%' }}>
                    <Button type="primary" size="large" htmlType="submit" style={{ width: 220 }}>Use WhatsApp Number</Button>
                    <Button type="link" onClick={() => setShowClaimPhoneSetup(false)}>Back to options</Button>
                  </Space>
                </Form>
              </>
            ) : claimInfo && !claimSetupSuccess ? (
              /* ━━━ CLAIM FLOW: Choose Google or Email ━━━ */
              <>
                {shouldOfferGoogleAuth ? (
                  <>
                    <div className={styles.googleLoginWrap}>
                      <Button type="default"
                        size="large"
                        icon={<FcGoogle />}
                        loading={claimProcessing}
                        onClick={() => {
                          dispatch(startLoader("LoginPage:signInWithGoogle"));
                          signIn('google', { callbackUrl: `${location.origin}${NAVIGARIONS_ROUTINGS.SIGNIN}` });
                        }}
                      >
                        Sign in with Google</Button>
                    </div>
                    <Divider className={styles.saperator}>Or</Divider>
                  </>
                ) : null}
                <Button type="default" size="large" style={{ width: '100%' }} onClick={() => setShowClaimEmailSetup(true)}>
                  Set up with email and password
                </Button>
                {claimInfo.phone ? (
                  <Button type="default" size="large" style={{ width: '100%', marginTop: 12 }} onClick={() => setShowClaimPhoneSetup(true)}>
                    Use WhatsApp number {claimInfo.phone}
                  </Button>
                ) : null}
              </>
            ) : (
              /* ━━━ NORMAL LOGIN FLOW ━━━ */
              <>
                <div className={styles.desktopAuthHeader}>
                  <h2>Welcome back</h2>
                  <p>{loginManagementDescription}</p>
                </div>
                {shouldOfferGoogleAuth ? (
                  <>
                    <div className={styles.googleLoginWrap}>
                      <Button type="default"
                        size="large"
                        icon={<FcGoogle />}
                        onClick={() => {
                          dispatch(startLoader("LoginPage:signInWithGoogle"));
                          signIn('google', { callbackUrl: `${location.origin}${NAVIGARIONS_ROUTINGS.SIGNIN}` });
                        }}
                      >
                        Continue with Google</Button>
                    </div>
                    <Divider className={styles.saperator}>Or use email</Divider>
                  </>
                ) : null}
                <Form
                  form={loginForm}
                  name="normal_login"
                  className={`${styles.form} login-form`}
                  initialValues={{}}
                  onFinish={(values) => {
                    if (shouldOfferPhoneOtp) return;
                    handleSignIn(values);
                  }}
                  onValuesChange={onValuesChange}
                  validateMessages={validateMessages}
                >
                  {!shouldOfferPhoneOtp ? (
                    <label className={styles.fieldLabel} htmlFor="login-identifier">Email, phone, or staff ID</label>
                  ) : null}
                  <Form.Item
                    className={`${styles.formItem} ${shouldOfferPhoneOtp ? styles.hiddenFormItem : ''}`}
                    name="email"
                    rules={[
                      { required: true, message: 'Please input your email, phone, or staff ID!' },
                      {
                        validator: async (_, value) => {
                          if (!value) return Promise.resolve();
                          const result = validateLoginIdentifier(value);
                          if (!result.valid) {
                            return Promise.reject(new Error(result.reason || 'Invalid email, phone, or staff ID'));
                          }
                          return Promise.resolve();
                        }
                      }
                    ]}
                    validateTrigger={['onBlur', 'onChange']}
                  >
                    <Input
                      id="login-identifier"
                      className={styles.inputElement}
                      size="large"
                      prefix={<LuUser className="site-form-item-icon" />}
                      allowClear
                      placeholder="Enter your credentials"
                    />
                  </Form.Item>
                  {shouldOfferPhoneOtp ? (
                    <PhoneOtpAuthPanel
                      key={`phone-otp-${otpPanelKey}`}
                      buttonLabel="Send WhatsApp code"
                      defaultPhone={loginIdentifier}
                      fallbackLabel="Use passcode instead"
                      hint="Use the phone number connected to your business. We will send a one-time WhatsApp code."
                      onAuthenticated={async () => {
                        await updateSession();
                      }}
                      onPhoneChange={({ phone }) => {
                        loginForm.setFieldValue('email', phone);
                      }}
                      onFallback={() => {
                        setCredentialMode('passcode');
                        window.setTimeout(() => {
                          document.querySelector<HTMLInputElement>('input[name="password"]')?.focus();
                        }, 0);
                      }}
                      phoneLabel="WhatsApp phone number"
                      phonePlaceholder="98765 43210"
                      purpose="dashboard_login"
                      showHeader={false}
                      title="Log in with WhatsApp"
                      wrapInForm={false}
                    />
                  ) : null}
                  {shouldShowSecretInput ? (
                    <>
                      {loginIdentifierKind === 'phone' && FEATURE_FLAGS.ENABLE_PHONE_OTP_AUTH && credentialMode === 'passcode' ? (
                        <Button
                          type="link"
                          style={{ padding: 0, height: 30, marginTop: -12, marginBottom: 8 }}
                          onClick={() => {
                            setCredentialMode('default');
                            setOtpPanelKey((value) => value + 1);
                          }}
                        >
                          Send WhatsApp code instead
                        </Button>
                      ) : null}
                      <div className={styles.fieldLabelRow}>
                        <label className={styles.fieldLabel} htmlFor="login-secret">{secretLabel}</label>
                        <Button
                          type="link"
                          className={styles.inlineHelpButton}
                          onClick={() => router.push(NAVIGARIONS_ROUTINGS.FORGOT_PASSWORD)}
                        >
                          Forgot?
                        </Button>
                      </div>
                      <Form.Item
                        className={styles.formItem}
                        name="password"
                        preserve={false}
                        rules={[
                          { required: true, message: `Please input your ${secretLabel}!` },
                          { min: 6, message: `${secretLabel} must be at least 6 characters` },
                        ]}
                      >
                        <Input.Password
                          id="login-secret"
                          className={styles.inputElement}
                          size="large"
                          prefix={<LuLock className="site-form-item-icon" />}
                          allowClear
                          placeholder={secretPlaceholder}
                        />
                      </Form.Item>
                    </>
                  ) : null}
                  {displayErrorMessage && <div className={styles.error}>
                    {displayErrorMessage}
                  </div>}
                  {!shouldShowSecretInput && !shouldOfferPhoneOtp ? (
                    <Button type="primary" size="large" htmlType="submit" style={{ width: '100%' }} className="login-form-button">Continue with email</Button>
                  ) : null}
                  {shouldShowSecretInput ? (
                    <Space direction="vertical" align="center" style={{ width: "100%" }} >
                      <Button type="primary" size="large" htmlType="submit" style={{ width: '100%' }} className="login-form-button">Log in</Button>
                    </Space>
                  ) : null}
                  <Divider />
                  <Flex align="center" justify='center' style={{ width: "100%" }} gap={2}>
                    <Text>Don&apos;t have an account?</Text>
                    <Button type="link" onClick={() => router.push(`/pricing`)}>Sign up</Button>
                  </Flex>
                  <Space direction="vertical" align="center" style={{ width: "100%", marginTop: 8 }} >
                    <Button type="text" className="login-form-button" style={{ color: token.colorTextLabel }}>Need help? Contact the owner.</Button>
                  </Space>
                </Form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
}

export default LoginPage;
