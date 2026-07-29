"use client";

/**
 * Screen Link Section
 * Per spec v2.0: Two URLs per store: Menu Board (default) and Highlights.
 */

import { Button, QRCode, Space, Tag, Tooltip, Typography, message, theme } from "antd";
import {
    copyScreenTextToClipboard,
    getBoundedScreenStringContext,
    hasScreenClipboardWrite,
    hasScreenCopyFallback,
    logScreenSettingsFailure,
} from "@lib/screen/screenDiagnostics";
import {
    type DigitalScreenSeenTimestamp,
} from "@lib/screen/screenTimestamp";
import { getDigitalScreenHealth } from "@lib/screen/screenHealth";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { LuCheck, LuCopy, LuExternalLink, LuMonitor, LuPlay, LuQrCode } from "react-icons/lu";

const { Text, Title } = Typography;

interface ScreenLinkProps {
    screenUrl: string;
    screenLastSeenAt?: DigitalScreenSeenTimestamp;
}

type ScreenMode = "menu" | "highlights";

interface ScreenModeCardProps {
    compactUrl: string;
    copied: boolean;
    description: string;
    icon: ReactNode;
    mode: ScreenMode;
    onCopy: () => void;
    onOpen: () => void;
    qrValue: string;
    tag: string;
    title: string;
}

function compactScreenUrl(url: string): string {
    try {
        const parsed = new URL(url);
        return `${parsed.host}${parsed.pathname}${parsed.search}`;
    } catch {
        return url.replace(/^https?:\/\//, "");
    }
}

function ScreenModeCard({
    compactUrl,
    copied,
    description,
    icon,
    mode,
    onCopy,
    onOpen,
    qrValue,
    tag,
    title,
}: ScreenModeCardProps) {
    return (
        <section className={`screen-mode-card ${mode}`}>
            <div className="screen-mode-main">
                <div className="screen-mode-top">
                    <span className="screen-mode-icon">{icon}</span>
                    <div>
                        <Title level={5} style={{ margin: 0 }}>{title}</Title>
                        <Text type="secondary">{description}</Text>
                    </div>
                    <Tag className="screen-mode-tag">{tag}</Tag>
                </div>

                <div className={`screen-preview ${mode}`} aria-hidden="true">
                    {mode === "menu" ? (
                        <>
                            <span className="preview-title" />
                            <span className="preview-category" />
                            <span className="preview-row" />
                            <span className="preview-row short" />
                            <span className="preview-row" />
                        </>
                    ) : (
                        <>
                            <span className="preview-image" />
                            <span className="preview-caption" />
                            <span className="preview-price" />
                        </>
                    )}
                </div>

                <div className="screen-url-row">
                    <LuQrCode size={16} />
                    <Text ellipsis className="screen-compact-url">{compactUrl}</Text>
                </div>

                <Space wrap>
                    <Tooltip title={copied ? "Copied" : "Copy TV link"}>
                        <Button icon={copied ? <LuCheck /> : <LuCopy />} onClick={onCopy} type="primary">
                            {copied ? "Copied" : "Copy link"}
                        </Button>
                    </Tooltip>
                    <Button icon={<LuExternalLink />} onClick={onOpen}>
                        Open
                    </Button>
                </Space>
            </div>

            <div className="screen-mode-qr">
                <QRCode
                    value={qrValue}
                    size={106}
                    color="#172033"
                    bgColor="#ffffff"
                    errorLevel="H"
                    style={{ borderRadius: 8 }}
                />
                <Text type="secondary">Screen QR</Text>
            </div>
        </section>
    );
}

export default function ScreenLink({ screenUrl, screenLastSeenAt }: ScreenLinkProps) {
    const { token } = theme.useToken();
    const [copiedMenu, setCopiedMenu] = useState(false);
    const [copiedHighlights, setCopiedHighlights] = useState(false);

    const highlightsUrl = `${screenUrl}?mode=highlights`;
    const menuCompactUrl = useMemo(() => compactScreenUrl(screenUrl), [screenUrl]);
    const highlightsCompactUrl = useMemo(() => compactScreenUrl(highlightsUrl), [highlightsUrl]);
    const screenHealth = useMemo(() => getDigitalScreenHealth(screenLastSeenAt), [screenLastSeenAt]);
    const hasSeenSignal = screenHealth.state !== "link_ready";

    const handleOpen = (url: string, type: ScreenMode) => {
        try {
            const opened = window.open(url, "_blank", "noopener,noreferrer");
            if (!opened) {
                throw new Error("desktop_digital_screen_link_open_blocked");
            }
        } catch (error) {
            logScreenSettingsFailure("desktop_digital_screen_link_open_failed", error, {
                surface: "desktop_digital_screen_settings",
                flow: "screen_link_open",
                mode: type,
                hasScreenUrl: Boolean(screenUrl),
                hasSeenSignal,
                ...getBoundedScreenStringContext("screenOpenUrl", url),
            });
            message.error("Unable to open screen link");
        }
    };

    const handleCopy = async (url: string, type: ScreenMode) => {
        try {
            await copyScreenTextToClipboard(url);
            if (type === "menu") {
                setCopiedMenu(true);
                setTimeout(() => setCopiedMenu(false), 2000);
            } else {
                setCopiedHighlights(true);
                setTimeout(() => setCopiedHighlights(false), 2000);
            }
            message.success("Screen link copied");
        } catch (error) {
            logScreenSettingsFailure("desktop_digital_screen_link_copy_failed", error, {
                surface: "desktop_digital_screen_settings",
                flow: "screen_link_copy",
                mode: type,
                hasScreenUrl: Boolean(screenUrl),
                hasSeenSignal,
                hasClipboardWrite: hasScreenClipboardWrite(),
                hasCopyFallback: hasScreenCopyFallback(),
                ...getBoundedScreenStringContext("screenCopyUrl", url),
            });
            message.error("Unable to copy screen link");
        }
    };

    return (
        <div className="screen-link-section">
            <div className="screen-setup-header">
                <div>
                    <Text strong>TV setup</Text>
                    <Text type="secondary" className="screen-setup-subtitle">
                        Two screen types are ready for this store.
                    </Text>
                </div>
                <Tag color={screenHealth.state === "recent" ? "success" : screenHealth.state === "stale" ? "warning" : "default"}>
                    {screenHealth.detail}
                </Tag>
            </div>

            <div className="screen-mode-grid">
                <ScreenModeCard
                    compactUrl={menuCompactUrl}
                    copied={copiedMenu}
                    description="Full menu with categories and prices"
                    icon={<LuMonitor size={20} />}
                    mode="menu"
                    onCopy={() => void handleCopy(screenUrl, "menu")}
                    onOpen={() => handleOpen(screenUrl, "menu")}
                    qrValue={screenUrl}
                    tag="Counter TV"
                    title="Menu Board"
                />
                <ScreenModeCard
                    compactUrl={highlightsCompactUrl}
                    copied={copiedHighlights}
                    description="Featured items and custom slides"
                    icon={<LuPlay size={20} />}
                    mode="highlights"
                    onCopy={() => void handleCopy(highlightsUrl, "highlights")}
                    onOpen={() => handleOpen(highlightsUrl, "highlights")}
                    qrValue={highlightsUrl}
                    tag="Entrance TV"
                    title="Highlights"
                />
            </div>

            <div className="screen-setup-steps">
                <span>Open the link on the TV</span>
                <span>Make it full screen</span>
                <span>Leave the TV awake</span>
            </div>

            <style jsx>{`
                .screen-link-section {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }
                .screen-setup-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                }
                .screen-setup-subtitle {
                    display: block;
                    margin-top: 2px;
                }
                .screen-mode-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 14px;
                }
                .screen-mode-card {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) 136px;
                    gap: 16px;
                    min-height: 248px;
                    padding: 16px;
                    border: 1px solid ${token.colorBorderSecondary};
                    border-radius: 8px;
                    background: ${token.colorBgContainer};
                }
                .screen-mode-card.menu {
                    border-top: 3px solid ${token.colorPrimary};
                }
                .screen-mode-card.highlights {
                    border-top: 3px solid ${token.colorWarning};
                }
                .screen-mode-main {
                    display: flex;
                    min-width: 0;
                    flex-direction: column;
                    gap: 14px;
                }
                .screen-mode-top {
                    display: grid;
                    grid-template-columns: 34px minmax(0, 1fr) auto;
                    align-items: start;
                    gap: 10px;
                }
                .screen-mode-icon {
                    display: inline-flex;
                    width: 34px;
                    height: 34px;
                    align-items: center;
                    justify-content: center;
                    border-radius: 8px;
                    background: ${token.colorFillAlter};
                    color: ${token.colorPrimary};
                }
                .screen-mode-tag {
                    margin: 0;
                    border-radius: 6px;
                    font-weight: 600;
                }
                .screen-preview {
                    position: relative;
                    height: 78px;
                    overflow: hidden;
                    border-radius: 8px;
                    background: #07101f;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .screen-preview.menu {
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 7px;
                }
                .preview-title,
                .preview-category,
                .preview-row {
                    display: block;
                    border-radius: 4px;
                }
                .preview-title {
                    width: 44%;
                    height: 8px;
                    background: #ffffff;
                }
                .preview-category {
                    width: 32%;
                    height: 6px;
                    background: #fbbf24;
                }
                .preview-row {
                    height: 7px;
                    background: rgba(255, 255, 255, 0.46);
                }
                .preview-row.short {
                    width: 72%;
                }
                .screen-preview.highlights {
                    background: linear-gradient(135deg, #111827 0%, #273449 100%);
                }
                .preview-image {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(135deg, rgba(251, 191, 36, 0.52), rgba(96, 165, 250, 0.42));
                }
                .preview-caption {
                    position: absolute;
                    left: 12px;
                    right: 44px;
                    bottom: 20px;
                    height: 10px;
                    border-radius: 4px;
                    background: rgba(255, 255, 255, 0.92);
                }
                .preview-price {
                    position: absolute;
                    left: 12px;
                    bottom: 8px;
                    width: 56px;
                    height: 7px;
                    border-radius: 4px;
                    background: #86efac;
                }
                .screen-url-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    min-width: 0;
                    padding: 9px 10px;
                    border: 1px solid ${token.colorBorderSecondary};
                    border-radius: 8px;
                    background: ${token.colorFillAlter};
                }
                .screen-compact-url {
                    min-width: 0;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                    font-size: 12px;
                }
                .screen-mode-qr {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-direction: column;
                    gap: 8px;
                    min-width: 0;
                    padding: 12px 8px;
                    border-radius: 8px;
                    background: ${token.colorFillAlter};
                    text-align: center;
                }
                .screen-setup-steps {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 8px;
                }
                .screen-setup-steps span {
                    min-height: 34px;
                    padding: 8px 10px;
                    border-radius: 8px;
                    background: ${token.colorFillAlter};
                    color: ${token.colorTextSecondary};
                    font-size: 13px;
                    font-weight: 600;
                    text-align: center;
                }
                @media (max-width: 1080px) {
                    .screen-mode-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
}
