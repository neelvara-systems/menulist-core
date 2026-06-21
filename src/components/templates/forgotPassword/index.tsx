'use client'
import { UserOutlined } from '@ant-design/icons';
import { EMPTY_ERROR } from "@constant/common";
import { HOME_ROUTING, NAVIGARIONS_ROUTINGS } from "@constant/navigations";
import { useAppSelector } from "@hook/useAppSelector";
import { firebaseAuth } from "@lib/firebase/firebaseClient";
import { getDarkModeState, toggleDarkMode } from "@reduxSlices/clientThemeConfig";
import { Button, Form, Input, Space, theme } from "antd";
import { sendPasswordResetEmail } from "firebase/auth";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from 'next/navigation';
import { useEffect, useState } from "react";
import { LuArrowLeft, LuSun } from "react-icons/lu";
import { useAppDispatch } from "src/hooks/useAppDispatch";
import styles from '../loginPage/loginPage.module.scss';

const LOGIN_ERRORS = {
    "INVALID_EMAIL": "auth/invalid-email",
    "UNREGISTRED": "email-not-registred",
}

function ForgotPasswordPage() {

    const session = useSession();
    const dispatch = useAppDispatch();
    const [error, setError] = useState({ id: '', message: '' });
    const [successMessage, setSuccessMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const { token } = theme.useToken();
    const isDarkMode = useAppSelector(getDarkModeState)
    const router = useRouter();

    useEffect(() => {
        if (Boolean(session?.data?.user)) {
            console.log("user found")
            redirect(HOME_ROUTING)
        }
    }, [])

    const forgotPassword = async ({ email }: { email: string }) => {
        setIsSending(true);
        setSuccessMessage('');
        setError(EMPTY_ERROR);

        try {
            await sendPasswordResetEmail(firebaseAuth, email);
            setSuccessMessage("Password reset email sent. Check your inbox and follow the link to choose a new password.");
        } catch (error: any) {
            if (error.code?.includes(LOGIN_ERRORS.INVALID_EMAIL)) {
                setError({ id: LOGIN_ERRORS.INVALID_EMAIL, message: "Invalid email" });
            } else if (error.code?.includes(LOGIN_ERRORS.UNREGISTRED)) {
                setError({ id: LOGIN_ERRORS.UNREGISTRED, message: "Email not registered" });
            } else {
                setError({ id: 'RESET_FAILED', message: "Something went wrong, please try again." });
            }
        } finally {
            setIsSending(false);
        }
    }

    const onValuesChange = () => {
        setError(EMPTY_ERROR)
        setSuccessMessage('')
    };

    const validateMessages = {
        required: "'${name}' is required!",
    };

    return <div className={styles.loginPageWrap}
        style={{
            background: token.colorBgBase,
            backgroundImage: `radial-gradient(circle at 10px 10px, ${token.colorTextDisabled} 1px, transparent 0)`,
        }}>
        <Space className={styles.headerWrap} align="center">
            <div className={styles.itemWrap}>
                <img src={'/icons/icon-192x192.png'} />
            </div>
            <Button icon={<LuSun />} size="large" onClick={() => dispatch(toggleDarkMode(!isDarkMode))} />
        </Space>
        <div className={styles.bodyWrap} style={{
            // background: "url(assets/images/loginPage/login_screen_bg.png)"
        }}>
            <div className={styles.bgWrap}></div>
            <div className={styles.bodyContent}>
                <div className={styles.leftContent}>
                    <img src="assets/images/loginPage/login_screen_bg.png" />
                </div>
                <div className={styles.rightContent}>
                    <div className={styles.formWrap}
                        style={{
                            borderColor: token.colorBorder,
                            background: `linear-gradient(0deg,rgba(186,207,247,.04),rgba(186,207,247,.04)), ${token.colorBgBase}`,
                            boxShadow: `inset 0 1px 1px 0 rgba(216,236,248,.2), inset 0 24px 48px 0 rgba(168,216,245,.06), 0 16px 32px rgba(0,0,0,.3)`,
                        }}>
                        <h3 className={`${styles.heading}`} style={{ color: token.colorTextLabel }}>Forgot your password?</h3>
                        {/* <h1 className={`heading ${styles.heading} ${styles.title}`}>EcomsAi</h1> */}
                        <div className={styles.subHeading} style={{ color: token.colorTextHeading }}>Enter the email address on your account. We will email you a link to reset your password.</div>
                        <div style={{ color: token.colorTextSecondary, fontSize: 13, margin: '0 auto 16px', maxWidth: 360, textAlign: 'center' }}>
                            If you use a Staff ID or phone passcode and do not have an email, ask the owner to create a new temporary passcode from Staff.
                        </div>
                        <Form
                            name="forgot-password"
                            className={`${styles.form} login-form`}
                            initialValues={{}}
                            onFinish={forgotPassword}
                            onValuesChange={onValuesChange}
                            validateMessages={validateMessages}
                        >
                            <Form.Item
                                className={styles.formItem}
                                name="email"
                                rules={[{ required: true, message: 'Please enter your email!' }]}
                            >
                                <Input className={styles.inputElement} size="large" prefix={<UserOutlined className="site-form-item-icon" />} allowClear placeholder="your-email@domain.com" />
                            </Form.Item>
                            {/* <Form.Item
                                    className={styles.formItem}
                                    name="password"
                                    rules={[{ required: true, message: 'Please input your Password!' }]}
                                >
                                    <Input.Password className={styles.inputElement} size="large" prefix={<LockOutlined className="site-form-item-icon" />} allowClear placeholder="Password"
                                    />
                                </Form.Item> */}
                            {error.message && <div className={styles.error}>{error.message}</div>}
                            {successMessage && <div style={{ color: token.colorSuccess, textAlign: 'center' }}>{successMessage}</div>}
                            <Space direction="vertical" align="center" style={{ width: "100%" }} >
                                <Button loading={isSending} type="primary" size="large" htmlType="submit" style={{ width: 275 }} className="login-form-button">Send Forgot Password Email</Button>
                            </Space>

                            <Space direction="vertical" align="center" style={{ width: "100%", marginTop: 20 }} onClick={() => router.push(NAVIGARIONS_ROUTINGS.SIGNIN)}>
                                <Button type="dashed" className="login-form-button" icon={<LuArrowLeft />} style={{ color: token.colorTextLabel }}>Return to sign in</Button>
                            </Space>
                        </Form>
                    </div>
                </div>
            </div>
        </div>
    </div>
}

export default ForgotPasswordPage;
