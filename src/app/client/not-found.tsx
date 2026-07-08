/**
 * Client Menu Not Found Page (Customer Infra Hardening - TASK 8)
 *
 * Branded 404 page for customer-facing menu.
 * Lightweight — no Ant Design, no dashboard dependencies.
 * Shows professional message instead of generic Next.js 404.
 *
 * 3-Year Freeze: This is what customers see if they
 * hit a bad URL. Must look professional, not broken.
 */

import PublicMenuListAttribution from '@/components/customer/PublicMenuListAttribution';

export default function ClientMenuNotFound() {
    return (
        <div
            style={{
                minHeight: "100dvh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "calc(24px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom))",
                background: "#fafafa",
                fontFamily: "system-ui, -apple-system, sans-serif",
                textAlign: "center",
                color: "#333",
            }}
        >
            <div
                style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    background: "#e3f2fd",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "20px",
                    fontSize: "28px",
                }}
            >
                ML
            </div>

            <h1
                style={{
                    fontSize: "22px",
                    fontWeight: 600,
                    margin: "0 0 8px",
                    color: "#1a1a1a",
                }}
            >
                Menu not found
            </h1>

            <p
                style={{
                    fontSize: "15px",
                    color: "#666",
                    margin: "0 0 24px",
                    maxWidth: "320px",
                    lineHeight: 1.5,
                }}
            >
                This public link does not seem to be active. The business may
                have updated their MenuList link.
            </p>

            <a
                href="/"
                style={{
                    padding: "12px 32px",
                    fontSize: "16px",
                    fontWeight: 500,
                    background: "#1a1a1a",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    textDecoration: "none",
                    marginBottom: "16px",
                    display: "inline-block",
                }}
            >
                Go to Homepage
            </a>

            <p
                style={{
                    fontSize: "13px",
                    color: "#999",
                    margin: 0,
                }}
            >
                Please ask the business for the correct link.
            </p>

            <PublicMenuListAttribution />
        </div>
    );
}
