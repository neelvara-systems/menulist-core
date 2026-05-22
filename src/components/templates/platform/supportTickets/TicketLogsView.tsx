import { Descriptions, Divider, List, Modal, Tag, Typography } from "antd";
import React from "react";
import { UAParser } from "ua-parser-js";

const { Text } = Typography;

interface AdminTicketLogsProps {
    open: boolean;
    onClose: () => void;
    logs: { timestamp: number; message: string; level?: "info" | "warn" | "error" }[];
    clientDebugContext?: {
        userAgent?: string | null;
        capturedAt?: number | null;
    };
}

const getLevelColor = (level?: "info" | "warn" | "error") => {
    switch (level) {
        case "error":
            return "red";
        case "warn":
            return "orange";
        default:
            return "blue";
    }
};

const formatPair = (...parts: Array<string | undefined>) => parts.filter(Boolean).join(" ") || "-";

const parseUserAgent = (userAgent?: string | null) => {
    if (!userAgent) return null;

    try {
        const result = new UAParser(userAgent).getResult();
        const deviceType = result.device.type || "desktop";
        const deviceName = [result.device.vendor, result.device.model].filter(Boolean).join(" ") || deviceType;
        return {
            browser: formatPair(result.browser.name, result.browser.version),
            os: formatPair(result.os.name, result.os.version),
            device: deviceName,
            type: deviceType,
            engine: formatPair(result.engine.name, result.engine.version),
            cpu: result.cpu.architecture || "-",
        };
    } catch {
        return null;
    }
};

const TicketLogsView: React.FC<AdminTicketLogsProps> = ({ open, onClose, logs, clientDebugContext }) => {
    const userAgent = clientDebugContext?.userAgent?.trim();
    const parsedUserAgent = parseUserAgent(userAgent);

    return (
        <Modal
            title="Ticket Logs"
            open={open}
            onCancel={onClose}
            footer={null}
            width="min(700px, calc(100vw - 24px))"
        >
            {userAgent ? (
                <>
                    <div
                        style={{
                            border: "1px solid rgba(5, 5, 5, 0.06)",
                            borderRadius: 10,
                            marginBottom: 12,
                            padding: 12,
                        }}
                    >
                        <Text strong>Browser context</Text>
                        <Descriptions
                            column={1}
                            colon={false}
                            size="small"
                            style={{ marginTop: 8 }}
                        >
                            {clientDebugContext?.capturedAt ? (
                                <Descriptions.Item label="Captured">
                                    <Text type="secondary">
                                        {new Date(clientDebugContext.capturedAt).toLocaleString()}
                                    </Text>
                                </Descriptions.Item>
                            ) : null}
                            <Descriptions.Item label="Browser">
                                {parsedUserAgent?.browser || "-"}
                            </Descriptions.Item>
                            <Descriptions.Item label="Operating system">
                                {parsedUserAgent?.os || "-"}
                            </Descriptions.Item>
                            <Descriptions.Item label="Device">
                                {parsedUserAgent ? `${parsedUserAgent.device} (${parsedUserAgent.type})` : "-"}
                            </Descriptions.Item>
                            <Descriptions.Item label="Engine">
                                {parsedUserAgent?.engine || "-"}
                            </Descriptions.Item>
                            <Descriptions.Item label="CPU">
                                {parsedUserAgent?.cpu || "-"}
                            </Descriptions.Item>
                            <Descriptions.Item label="User agent">
                                <Text
                                    code
                                    copyable={{ text: userAgent }}
                                    style={{
                                        display: "block",
                                        maxWidth: "100%",
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                    }}
                                >
                                    {userAgent}
                                </Text>
                            </Descriptions.Item>
                        </Descriptions>
                    </div>
                    <Divider style={{ margin: "12px 0" }} />
                </>
            ) : null}
            {logs?.length ? (
                <List
                    size="small"
                    dataSource={logs}
                    renderItem={(log) => (
                        <List.Item>
                            <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <Tag color={getLevelColor(log.level)}>{log.level || "info"}</Tag>
                                    <Text type="secondary">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </Text>
                                </div>
                                <Text style={{ whiteSpace: "pre-wrap" }}>{log.message}</Text>
                            </div>
                        </List.Item>
                    )}
                />
            ) : (
                <Text type="secondary">No logs available for this ticket.</Text>
            )}
        </Modal>
    );
};

export default TicketLogsView;
