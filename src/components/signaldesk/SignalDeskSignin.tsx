"use client";

import { Alert, Button, Card, Form, Input, Space, theme, Typography } from "antd";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LuLock, LuUser } from "react-icons/lu";
import styles from "./SignalDeskSignin.module.scss";

type SigninValues = {
    email: string;
    password: string;
};

function getSafeCallbackUrl(value: string | null): string {
    if (!value) return "/signaldesk";
    try {
        const parsed = new URL(value, "https://signaldesk.local");
        const isSignalDeskPath = parsed.pathname === "/signaldesk"
            || parsed.pathname.startsWith("/signaldesk/")
            || parsed.pathname === "/sd"
            || parsed.pathname.startsWith("/sd/");
        return parsed.origin === "https://signaldesk.local" && isSignalDeskPath
            ? `${parsed.pathname}${parsed.search}${parsed.hash}`
            : "/signaldesk";
    } catch {
        return "/signaldesk";
    }
}

export default function SignalDeskSignin() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { token } = theme.useToken();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const submit = async (values: SigninValues) => {
        setSubmitting(true);
        setError("");
        try {
            const result = await signIn("credentials", {
                email: values.email.trim(),
                password: values.password,
                redirect: false,
            });
            if (!result?.ok || result.error) {
                setError("Sign in failed. Check your details and try again.");
                return;
            }
            router.replace(getSafeCallbackUrl(searchParams?.get("callbackUrl") ?? null));
            router.refresh();
        } catch {
            setError("Sign in failed. Try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className={styles.page} style={{ background: token.colorBgLayout }}>
            <Card className={styles.panel}>
                <section aria-labelledby="signaldesk-signin-title">
                <Space className={styles.heading} direction="vertical" size={4}>
                    <Typography.Text type="secondary">MenuList internal</Typography.Text>
                    <Typography.Title id="signaldesk-signin-title" level={2}>SignalDesk</Typography.Title>
                    <Typography.Text type="secondary">Sign in with your approved internal account.</Typography.Text>
                </Space>

                {error ? <Alert message={error} showIcon type="error" /> : null}

                <Form<SigninValues>
                    layout="vertical"
                    onFinish={submit}
                    requiredMark={false}
                    style={{ marginTop: error ? 20 : 0 }}
                >
                    <Form.Item
                        label="Email"
                        name="email"
                        rules={[
                            { required: true, message: "Enter your email." },
                            { type: "email", message: "Enter a valid email." },
                        ]}
                    >
                        <Input
                            autoComplete="username"
                            prefix={<LuUser aria-hidden="true" />}
                            size="large"
                        />
                    </Form.Item>
                    <Form.Item
                        label="Password"
                        name="password"
                        rules={[{ required: true, message: "Enter your password." }]}
                    >
                        <Input.Password
                            autoComplete="current-password"
                            prefix={<LuLock aria-hidden="true" />}
                            size="large"
                        />
                    </Form.Item>
                    <Button
                        className={styles.submit}
                        htmlType="submit"
                        loading={submitting}
                        size="large"
                        type="primary"
                    >
                        Sign in
                    </Button>
                </Form>
                </section>
            </Card>
        </main>
    );
}
