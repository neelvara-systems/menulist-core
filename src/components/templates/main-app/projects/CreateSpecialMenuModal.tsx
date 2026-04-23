/**
 * Create Special Menu Modal
 *
 * Modal for creating a new special menu from an existing base project.
 * Collects: display name, mode (replace/overlay), schedule (start/end).
 * Business-type-aware: mode options determined by behavior template.
 *
 * @see __docs__/special-menu-switching/special-menu-switching_impl.md
 */
import { getSpecialMenuCapabilities } from "@config/specialMenuConfig";
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from "@providers/platformProviders/platformGlobalDataProvider";
import type { SpecialMenuMode } from "@template/main-app/projects/types";
import { getClockTimeInputFormat } from "@util/dateTime";
import { DatePicker, Form, Input, Modal, Radio, Typography, message } from "antd";
import dayjs from "dayjs";
import { useContext, useState } from "react";
import { LuCalendar, LuInfo } from "react-icons/lu";

const { Text, Paragraph } = Typography;

interface CreateSpecialMenuModalProps {
    open: boolean;
    onClose: () => void;
    baseProjectId: string;
    baseProjectName: string;
    onSubmit: (data: {
        baseProjectId: string;
        displayName: string;
        mode: SpecialMenuMode;
        startsAt: string;
        endsAt: string;
    }) => Promise<{ success: boolean; projectId?: string; error?: string }>;
}

export default function CreateSpecialMenuModal({
    open,
    onClose,
    baseProjectId,
    baseProjectName,
    onSubmit,
}: CreateSpecialMenuModalProps) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const dateTimePickerFormat = `YYYY-MM-DD ${getClockTimeInputFormat()}`;

    const capabilities = getSpecialMenuCapabilities(storeDetails?.businessType);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            const startsAt = values.startsAt.toISOString();
            const endsAt = values.endsAt.toISOString();

            const result = await onSubmit({
                baseProjectId,
                displayName: values.displayName.trim(),
                mode: values.mode,
                startsAt,
                endsAt,
            });

            if (result.success) {
                message.success(`"${values.displayName}" created! It will activate on schedule.`);
                form.resetFields();
                onClose();
            } else {
                message.error(result.error || "Failed to create special menu");
            }
        } catch {
            // Form validation error — handled by antd
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Create Special Menu"
            open={open}
            onCancel={onClose}
            onOk={handleSubmit}
            okText="Create Special Menu"
            confirmLoading={loading}
            destroyOnClose
            width={520}
        >
            <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                Create a temporary menu based on <strong>{baseProjectName}</strong>.
                Your regular menu stays untouched and comes back automatically.
            </Paragraph>

            <Form
                form={form}
                layout="vertical"
                initialValues={{
                    mode: capabilities.availableModes[0] || "overlay",
                }}
            >
                <Form.Item
                    name="displayName"
                    label="Special Menu Name"
                    rules={[
                        { required: true, message: "Give your special menu a name" },
                        { max: 100, message: "Maximum 100 characters" },
                    ]}
                >
                    <Input
                        placeholder="e.g., Diwali Menu, Sunday Brunch, IPL Night"
                        maxLength={100}
                    />
                </Form.Item>

                {capabilities.availableModes.length > 1 && (
                    <Form.Item
                        name="mode"
                        label="How should customers see it?"
                        extra="Choose whether the special menu replaces your regular menu during this period or appears as an extra section alongside it."
                        rules={[{ required: true }]}
                    >
                        <Radio.Group>
                            {capabilities.allowReplace && (
                                <Radio value="replace" style={{ display: "block", marginBottom: 8 }}>
                                    <strong>Replace my regular menu</strong>
                                    <br />
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Customers see only the special menu
                                    </Text>
                                </Radio>
                            )}
                            {capabilities.allowOverlay && (
                                <Radio value="overlay" style={{ display: "block" }}>
                                    <strong>Add as special section</strong>
                                    <br />
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Special items appear alongside your regular menu
                                    </Text>
                                </Radio>
                            )}
                        </Radio.Group>
                    </Form.Item>
                )}

                {capabilities.availableModes.length === 1 && (
                    <div style={{ marginBottom: 16, padding: "8px 12px", background: "#f6f6f6", borderRadius: 6 }}>
                        <LuInfo size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Special items will appear alongside your regular menu.
                        </Text>
                    </div>
                )}

                <Form.Item
                    name="startsAt"
                    label={
                        <span>
                            <LuCalendar size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
                            Starts
                        </span>
                    }
                    rules={[{ required: true, message: "Set a start date" }]}
                >
                    <DatePicker
                        showTime={capabilities.allowTimeScheduling}
                        format={capabilities.allowTimeScheduling ? dateTimePickerFormat : "YYYY-MM-DD"}
                        disabledDate={(current) => current && current < dayjs().startOf("day")}
                        style={{ width: "100%" }}
                        placeholder="Select start date"
                    />
                </Form.Item>

                <Form.Item
                    name="endsAt"
                    label={
                        <span>
                            <LuCalendar size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
                            Ends
                        </span>
                    }
                    rules={[
                        { required: true, message: "Set an end date" },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || !getFieldValue("startsAt")) return Promise.resolve();
                                if (value.isAfter(getFieldValue("startsAt"))) return Promise.resolve();
                                return Promise.reject(new Error("End date must be after start date"));
                            },
                        }),
                    ]}
                >
                    <DatePicker
                        showTime={capabilities.allowTimeScheduling}
                        format={capabilities.allowTimeScheduling ? dateTimePickerFormat : "YYYY-MM-DD"}
                        disabledDate={(current) => current && current < dayjs().startOf("day")}
                        style={{ width: "100%" }}
                        placeholder="Select end date"
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
}
