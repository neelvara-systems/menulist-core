'use client'
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { FEATURE_FLAGS } from '@config/features';
import { EMPTY_ERROR, LOGO_SMALL } from "@constant/common";
import { CLIENT_DASHBOARD_ROUTING, HOME_ROUTING, NAVIGARIONS_ROUTINGS } from "@constant/navigations";
import { useAppSelector } from "@hook/useAppSelector";
import { firebaseAuth } from "@lib/firebase/firebaseClient";
import { syncCanonicaAuthWithCustomToken } from "@lib/firebase/syncCanonicaAuth";
import { getDarkModeState, toggleDarkMode } from "@reduxSlices/clientThemeConfig";
import { startLoader, stopLoader } from "@reduxSlices/loader";
import { showErrorToast, showSuccessToast } from "@reduxSlices/toast";
import { Button, Divider, Flex, Form, Input, Space, theme, Typography } from "antd";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getSession, signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { LuMoon, LuSun } from "react-icons/lu";
import { useAppDispatch } from "src/hooks/useAppDispatch";
import styles from './loginPage.module.scss';

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

const LOGIN_ERRORS = {
  "INVALID_CREAD": "invalid-login-credentials",
  "UNREGISTRED": "email-not-registred",
}
const { Text } = Typography;

function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: sessionData, update: updateSession } = useSession();
  const dispatch = useAppDispatch();
  const [error, setError] = useState({ id: '', message: '' });
  const { token } = theme.useToken();
  const isDarkMode = useAppSelector(getDarkModeState)

  // Claim account flow (messaging onboarding → Google account linking OR email/password setup)
  const [claimInfo, setClaimInfo] = useState<{ businessName: string; phone: string | null } | null>(null);
  const [claimProcessing, setClaimProcessing] = useState(false);
  const [showClaimEmailSetup, setShowClaimEmailSetup] = useState(false);
  const [showClaimPhoneSetup, setShowClaimPhoneSetup] = useState(false);
  const [claimSetupSuccess, setClaimSetupSuccess] = useState(false);
  const [claimSetupLoginLabel, setClaimSetupLoginLabel] = useState('your login details');

  // Check for claim token in URL on mount (gated by feature flag)
  useEffect(() => {
    if (!FEATURE_FLAGS.ENABLE_CLAIM_ACCOUNT) return;
    const claimToken = searchParams?.get('claim');
    if (claimToken && claimToken.length >= 20) {
      // Store claim token for post-OAuth processing
      localStorage.setItem('pendingClaimToken', claimToken);
      // Validate the token and get business info
      fetch(`/api/auth/validate-claim?token=${encodeURIComponent(claimToken)}`)
        .then(res => res.json())
        .then(data => {
          if (data.valid) {
            setClaimInfo({ businessName: data.businessName, phone: data.phone });
          } else {
            // Token invalid/expired — clear it, let normal login proceed
            localStorage.removeItem('pendingClaimToken');
          }
        })
        .catch(() => {
          localStorage.removeItem('pendingClaimToken');
        });
    }
  }, [searchParams]);

  // Apply theme changes when dark mode changes
  useEffect(() => {
    console.log("isDarkMode changed to:", isDarkMode);
    // Force re-render when theme changes
  }, [isDarkMode]);

  // Handle post-login setup (for both Google and redirect-based logins)
  useEffect(() => {
    const setupFirebaseAuth = async () => {
      if (Boolean(sessionData?.user) && sessionData?.user?.email) {
        console.log("User found, setting up Firebase Auth...");

        const syncFirebaseAuthForCurrentSession = async () => {
          // Check if Firebase Auth is already signed in
          const currentUser = firebaseAuth.currentUser;

          if (!currentUser) {
            // User is logged in with NextAuth but not Firebase Auth
            // This happens after Google OAuth redirect
            console.log("Setting up Firebase Auth for OAuth user...");

            try {
              // Get custom token from server for OAuth users
              const setClaimsResponse = await fetch('/api/auth/set-claims', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}) // No UID - will create token
              });

              if (setClaimsResponse.ok) {
                const data = await setClaimsResponse.json();

                if (data.customToken) {
                  // Sign in with custom token
                  const { signInWithCustomToken } = await import('firebase/auth');
                  await signInWithCustomToken(firebaseAuth, data.customToken);
                  await syncCanonicaAuthWithCustomToken(data.canonicaCustomToken);
                  console.log('✅ Firebase Auth established with custom token');
                  console.log('✅ Custom claims:', data.claims);
                }
              } else {
                console.warn('⚠️ Failed to get custom token for OAuth user');
              }
            } catch (error) {
              console.error("Firebase Auth setup error:", error);
            }
          } else {
            console.log("✅ Firebase Auth already active");

            // Ensure custom claims are set
            try {
              const setClaimsResponse = await fetch('/api/auth/set-claims', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: currentUser.uid })
              });

              if (setClaimsResponse.ok) {
                const data = await setClaimsResponse.json();
                console.log('✅ Custom claims verified/set');
                await currentUser.getIdToken(true); // Refresh token
                await syncCanonicaAuthWithCustomToken(data.canonicaCustomToken);
              }
            } catch (error) {
              console.warn('Custom claims check failed:', error);
            }
          }
        };

        // Claim account flow: If there's a pending claim token, link accounts before redirecting
        const pendingClaim = localStorage.getItem('pendingClaimToken');
        if (pendingClaim && !claimProcessing) {
          setClaimProcessing(true);
          try {
            const claimRes = await fetch('/api/auth/claim-account', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ claimToken: pendingClaim }),
            });
            const claimData = await claimRes.json();

            if (claimRes.ok && claimData.success) {
              localStorage.removeItem('pendingClaimToken');
              await updateSession();
              await syncFirebaseAuthForCurrentSession();
              dispatch(showSuccessToast("Your business has been linked to your Google account!"));
              // Use a hard navigation so the dashboard starts from the refreshed auth context.
              window.location.href = CLIENT_DASHBOARD_ROUTING;
              return;
            } else {
              // Claim failed — clear token, continue to dashboard normally
              localStorage.removeItem('pendingClaimToken');
              console.warn('[Login] Claim account failed:', claimData.error);
            }
          } catch (claimError) {
            localStorage.removeItem('pendingClaimToken');
            console.warn('[Login] Claim account error:', claimError);
          } finally {
            setClaimProcessing(false);
          }
        }

        await syncFirebaseAuthForCurrentSession();

        // Redirect to dashboard
        router.push(CLIENT_DASHBOARD_ROUTING);
      }
    };

    setupFirebaseAuth();
  }, [sessionData, router, claimProcessing, dispatch, updateSession])

  // Handle email/password setup for messaging-onboarded users (claim flow MODE 2)
  const handleClaimEmailSetup = async (values: any) => {
    const requestId = "LoginPage:claimEmailSetup";
    try {
      dispatch(startLoader(requestId));
      const claimToken = localStorage.getItem('pendingClaimToken');
      if (!claimToken) {
        dispatch(showErrorToast('Claim token missing. Please use the link from your message.'));
        return;
      }

      const res = await fetch('/api/auth/claim-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimToken,
          email: values.email,
          password: values.password,
          name: claimInfo?.businessName,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.removeItem('pendingClaimToken');
        setClaimSetupSuccess(true);
        setClaimSetupLoginLabel('your email and password');
        dispatch(showSuccessToast('Account created! You can now log in.'));
        // Reset claim state so normal login form shows
        setClaimInfo(null);
        setShowClaimEmailSetup(false);
      } else {
        dispatch(showErrorToast(data.error || 'Failed to set up account'));
      }
    } catch (err) {
      dispatch(showErrorToast('An error occurred. Please try again.'));
    } finally {
      dispatch(stopLoader(requestId));
    }
  };

  const handleClaimPhoneSetup = async (values: any) => {
    const requestId = "LoginPage:claimPhoneSetup";
    try {
      dispatch(startLoader(requestId));
      const claimToken = localStorage.getItem('pendingClaimToken');
      if (!claimToken) {
        dispatch(showErrorToast('Claim token missing. Please use the link from your message.'));
        return;
      }

      const res = await fetch('/api/auth/claim-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimToken,
          password: values.password,
          name: claimInfo?.businessName,
          useWhatsappPhone: true,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.removeItem('pendingClaimToken');
        setClaimSetupSuccess(true);
        setClaimSetupLoginLabel('your WhatsApp number and passcode');
        dispatch(showSuccessToast('Account created! You can now log in.'));
        setClaimInfo(null);
        setShowClaimPhoneSetup(false);
      } else {
        dispatch(showErrorToast(data.error || 'Failed to set up account'));
      }
    } catch (err) {
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
        dispatch(showErrorToast(response.error));
        return;
      }

      // Step 2: Sign in with Firebase Auth (client-side) 
      // This ensures Firebase Functions can access request.auth
      try {
        const activeSession = await getSession();
        const firebaseLoginEmail = activeSession?.user?.email || values.email;
        const userCredential = await signInWithEmailAndPassword(firebaseAuth, firebaseLoginEmail, values.password);
        console.log('✅ Firebase Auth client session established');

        // Step 3: Set custom claims on Firebase Auth token
        try {
          const setClaimsResponse = await fetch('/api/auth/set-claims', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: userCredential.user.uid })
          });

          if (setClaimsResponse.ok) {
            const data = await setClaimsResponse.json();
            console.log('✅ Custom claims set on Firebase Auth token');
            // Force token refresh to get new claims
            await userCredential.user.getIdToken(true);
            await syncCanonicaAuthWithCustomToken(data.canonicaCustomToken);
          } else {
            console.warn('⚠️ Failed to set custom claims');
          }
        } catch (claimsError) {
          console.warn('⚠️ Custom claims error:', claimsError);
        }
      } catch (firebaseError: any) {
        console.warn('⚠️ Firebase Auth signin failed, but NextAuth succeeded:', firebaseError.message);
        // Continue anyway - NextAuth is working
      }

      dispatch(stopLoader(requestId))
      router.push(HOME_ROUTING)
    } catch (error) {
      dispatch(stopLoader(requestId))
      dispatch(showErrorToast("An error occurred during sign in"));
    }
  };

  const onValuesChange = () => {
    setError(EMPTY_ERROR)
  };

  const validateMessages = {
    required: "'${name}' is required!",
    // ...
  };

  return <div className={styles.loginPageWrap}
    style={{
      background: token.colorBgBase,
      backgroundImage: `radial-gradient(circle at 10px 10px, ${token.colorTextDisabled} 1px, transparent 0)`,
    }}>
    <Space className={styles.headerWrap} align="center">
      <div className={styles.itemWrap}>
        <img src={LOGO_SMALL} />
      </div>
      <Button
        icon={isDarkMode ? <LuSun /> : <LuMoon />}
        size="large"
        onClick={() => {
          console.log("Toggling dark mode from", isDarkMode, "to", !isDarkMode);
          dispatch(toggleDarkMode(!isDarkMode));
        }}
      />
    </Space>
    <div className={styles.bodyWrap} style={{
      // background: "url(assets/images/loginPage/login_screen_bg.png)"
    }}>
      <div className={styles.bgWrap}></div>
      <div className={styles.bodyContent}>
        <div className={styles.rightContent}>
          <div className={styles.formWrap}
            style={{
              // background: token.colorBgBase,
              // backgroundImage: `radial-gradient(circle at 10px 10px, ${token.colorTextDisabled} 1px, transparent 0)`,
              borderColor: token.colorBorder,
              background: `linear-gradient(0deg,rgba(186,207,247,.04),rgba(186,207,247,.04)), ${token.colorBgBase}`,
              boxShadow: `inset 0 1px 1px 0 rgba(216,236,248,.2), inset 0 24px 48px 0 rgba(168,216,245,.06), 0 16px 32px rgba(0,0,0,.3)`,
            }}>
            {claimInfo && !claimSetupSuccess ? (
              <>
                <h3 className={`${styles.heading}`} style={{ color: token.colorTextLabel }}>Welcome, {claimInfo.businessName}!</h3>
                <h1 onClick={() => router.push(HOME_ROUTING)} className={`heading ${styles.heading} ${styles.title}`}>Menulist Ai</h1>
                <div className={styles.subHeading} style={{ color: token.colorTextHeading }}>Set up your account to manage your digital menu</div>
              </>
            ) : claimSetupSuccess ? (
              <>
                <h3 className={`${styles.heading}`} style={{ color: token.colorSuccess }}>Account created!</h3>
                <h1 onClick={() => router.push(HOME_ROUTING)} className={`heading ${styles.heading} ${styles.title}`}>Menulist Ai</h1>
                <div className={styles.subHeading} style={{ color: token.colorTextHeading }}>You can now log in with {claimSetupLoginLabel} below</div>
              </>
            ) : (
              <>
                <h3 className={`${styles.heading}`} style={{ color: token.colorTextLabel }}>Welcome to</h3>
                <h1 onClick={() => router.push(HOME_ROUTING)} className={`heading ${styles.heading} ${styles.title}`}>Menulist Ai</h1>
                <div className={styles.subHeading} style={{ color: token.colorTextHeading }}>Take your business beyond the four walls</div>
              </>
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
                    <Input className={styles.inputElement} size="large" prefix={<UserOutlined className="site-form-item-icon" />} allowClear placeholder="Your email" />
                  </Form.Item>
                  <Form.Item
                    className={styles.formItem}
                    name="password"
                    rules={[{ required: true, message: 'Please choose a password!' }, { min: 6, message: 'Password must be at least 6 characters' }]}
                  >
                    <Input.Password className={styles.inputElement} size="large" prefix={<LockOutlined className="site-form-item-icon" />} allowClear placeholder="Choose a password" />
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
                    <Input.Password className={styles.inputElement} size="large" prefix={<LockOutlined className="site-form-item-icon" />} allowClear placeholder="Confirm password" />
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
                    <Input.Password className={styles.inputElement} size="large" prefix={<LockOutlined className="site-form-item-icon" />} allowClear placeholder="Choose passcode" />
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
                    <Input.Password className={styles.inputElement} size="large" prefix={<LockOutlined className="site-form-item-icon" />} allowClear placeholder="Confirm passcode" />
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
                <div className={styles.googleLoginWrap}>
                  <Button type="default"
                    size="large"
                    icon={<FcGoogle />}
                    onClick={() => {
                      dispatch(startLoader("LoginPage:signInWithGoogle"));
                      signIn('google', { callbackUrl: `${location.origin}${NAVIGARIONS_ROUTINGS.SIGNIN}` });
                    }}
                  >
                    Sign in with Google</Button>
                </div>
                <Divider className={styles.saperator}>Or</Divider>
                <Form
                  name="normal_login"
                  className={`${styles.form} login-form`}
                  initialValues={{}}
                  onFinish={handleSignIn}
                  onValuesChange={onValuesChange}
                  validateMessages={validateMessages}
                >
                  <Form.Item
                    className={styles.formItem}
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
                      className={styles.inputElement}
                      size="large"
                      prefix={<UserOutlined className="site-form-item-icon" />}
                      allowClear
                      placeholder="Email, phone, or staff ID"
                    />
                  </Form.Item>
                  <Form.Item
                    className={styles.formItem}
                    name="password"
                    rules={[{ required: true, message: 'Please input your Password!' }, { min: 6, message: "Password must be at least 6 characters" }]}
                  >
                    <Input.Password className={styles.inputElement} size="large" prefix={<LockOutlined className="site-form-item-icon" />} allowClear placeholder="Password"
                    />
                  </Form.Item>
                  {error.message && <div className={styles.error}>
                    {error.message}
                  </div>}
                  <Space direction="vertical" align="center" style={{ width: "100%" }} >
                    <Button type="link" className="login-form-button" onClick={() => router.push(`/${NAVIGARIONS_ROUTINGS.FORGOT_PASSWORD}`)}>Forgot password</Button>
                    <Button type="primary" size="large" htmlType="submit" style={{ width: 200 }} className="login-form-button">Log in</Button>
                  </Space>
                  <Divider />
                  <Flex align="center" justify='center' style={{ width: "100%" }} gap={2}>
                    <Text>Dont have an account?</Text>
                    <Button type="link" onClick={() => router.push(`/pricing`)}>Sign up</Button>
                  </Flex>
                  <Space direction="vertical" align="center" style={{ width: "100%", marginTop: 20 }} >
                    <Button type="text" className="login-form-button" style={{ color: token.colorTextLabel }}>Not able to login please contact owner</Button>
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
