import { List, Modal, Tag, Typography } from "antd";
import React from "react";

const { Text } = Typography;

interface AdminTicketLogsProps {
    open: boolean;
    onClose: () => void;
    logs: { timestamp: number; message: string; level?: "info" | "warn" | "error" }[];
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

const TicketLogsView: React.FC<AdminTicketLogsProps> = ({ open, onClose, logs }) => {
    return (
        <Modal
            title="Ticket Logs"
            open={open}
            onCancel={onClose}
            footer={null}
            width={700}
        >
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
