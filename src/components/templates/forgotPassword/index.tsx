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
    const { token } = theme.useToken();
    const isDarkMode = useAppSelector(getDarkModeState)
    const router = useRouter();

    useEffect(() => {
        if (Boolean(session?.data?.user)) {
            console.log("user found")
            redirect(HOME_ROUTING)
        }
    }, [])

    const forgotPassword = async (email: string) => {
        return sendPasswordResetEmail(firebaseAuth, email)
            .then(() => {
                return { success: true };
            })
            .catch((error) => {
                if (error.code.includes(LOGIN_ERRORS.INVALID_EMAIL)) {
                    return { success: false, message: "Invalid email" };
                } else if (error.code.includes(LOGIN_ERRORS.UNREGISTRED)) {
                    return { success: false, message: "Email not registered" };
                } else {
                    return { success: false, message: "Somthing went wrong, please try again !" };
                }
            });
    }

    const onValuesChange = () => {
        setError(EMPTY_ERROR)
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
                <img src={'https://firebasestorage.googleapis.com/v0/b/ecomsai.appspot.com/o/ecomsAi%2Flogo%2Flogo.png?alt=media&token=af824138-7ebb-4a72-b873-57298fd0a430'} />
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
                        <div className={styles.subHeading} style={{ color: token.colorTextHeading }}>Please enter the email address associated with your account and We will email you a link to reset your password.</div>
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
                            <Space direction="vertical" align="center" style={{ width: "100%" }} >
                                <Button type="primary" size="large" htmlType="submit" style={{ width: 275 }} className="login-form-button">Send Forgot Password Email</Button>
                            </Space>

                            <Space direction="vertical" align="center" style={{ width: "100%", marginTop: 20 }} onClick={() => router.push(`/${NAVIGARIONS_ROUTINGS.SIGNIN}`)}>
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
