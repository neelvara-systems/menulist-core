import { getSpecialMenuCapabilities } from "@config/specialMenuConfig";
import type { SpecialMenuListItem } from "@hook/useSpecialMenus";
import { PlatformGlobalDataContext } from "@providers/platformProviders/platformGlobalDataProvider";
import {
    fromNativeDateInputValue,
    fromNativeDateTimeInputValue,
    toNativeDateInputValue,
    toNativeDateTimeInputValue,
} from "@util/dateTime";
import { Form, Input, Modal, Typography } from "antd";
import { useContext, useEffect, useMemo, useRef, useState } from "react";

const { Paragraph, Text } = Typography;

type EditSpecialMenuScheduleModalProps = {
    item: SpecialMenuListItem | null;
    onClose: () => void;
    onSubmit: (data: {
        description?: string;
        displayName: string;
        endsAt: string;
        projectId: string;
        startsAt: string;
    }) => Promise<{ success: boolean; error?: string }>;
    open: boolean;
    specialMenus: SpecialMenuListItem[];
};

export default function EditSpecialMenuScheduleModal({
    item,
    onClose,
    onSubmit,
    open,
    specialMenus,
}: EditSpecialMenuScheduleModalProps) {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const [form] = Form.useForm<{ startsAt: string; endsAt: string }>();
    const [isSaving, setIsSaving] = useState(false);
    const submitInFlightRef = useRef(false);
    const timeZone = storeDetails?.timeZone;
    const capabilities = useMemo(
        () => getSpecialMenuCapabilities(storeDetails?.businessType, storeDetails?.businessCategory),
        [storeDetails?.businessCategory, storeDetails?.businessType],
    );

    useEffect(() => {
        if (!open || !item) return;
        form.setFieldsValue({
            startsAt: capabilities.allowTimeScheduling
                ? toNativeDateTimeInputValue(item.startsAt, timeZone)
                : toNativeDateInputValue(item.startsAt, timeZone),
            endsAt: capabilities.allowTimeScheduling
                ? toNativeDateTimeInputValue(item.endsAt, timeZone)
                : toNativeDateInputValue(item.endsAt, timeZone),
        });
    }, [capabilities.allowTimeScheduling, form, item, open, timeZone]);

    const handleSubmit = async () => {
        if (!item || submitInFlightRef.current) return;
        try {
            const values = await form.validateFields();
            if (submitInFlightRef.current) return;
            submitInFlightRef.current = true;
            setIsSaving(true);

            const startsAt = capabilities.allowTimeScheduling
                ? fromNativeDateTimeInputValue(values.startsAt, timeZone)
                : fromNativeDateInputValue(values.startsAt, timeZone);
            const endsAt = capabilities.allowTimeScheduling
                ? fromNativeDateTimeInputValue(values.endsAt, timeZone)
                : fromNativeDateInputValue(values.endsAt, timeZone);
            const startsAtMillis = Date.parse(startsAt);
            const endsAtMillis = Date.parse(endsAt);
            if (
                !startsAt
                || !endsAt
                || !Number.isFinite(startsAtMillis)
                || !Number.isFinite(endsAtMillis)
                || endsAtMillis <= startsAtMillis
            ) {
                form.setFields([{ name: "endsAt", errors: ["End must be after start."] }]);
                return;
            }

            const conflict = specialMenus.find((candidate) => (
                candidate.projectId !== item.projectId
                && candidate.status !== "expired"
                && candidate.status !== "cancelled"
                && startsAtMillis < Date.parse(candidate.endsAt)
                && endsAtMillis > Date.parse(candidate.startsAt)
            ));
            if (conflict) {
                form.setFields([{
                    name: "startsAt",
                    errors: [`This overlaps "${conflict.displayName}". Adjust the schedule so only one special menu is active.`],
                }]);
                return;
            }

            const result = await onSubmit({
                description: item.description,
                displayName: item.displayName,
                endsAt,
                projectId: item.projectId,
                startsAt,
            });
            if (!result.success) {
                Modal.error({
                    title: "Could not update schedule",
                    content: "No schedule change was confirmed. Review the dates and try again.",
                });
                return;
            }
            onClose();
        } finally {
            submitInFlightRef.current = false;
            setIsSaving(false);
        }
    };

    return (
        <Modal
            confirmLoading={isSaving}
            destroyOnHidden
            okText="Save schedule"
            onCancel={isSaving ? undefined : onClose}
            onOk={() => void handleSubmit()}
            open={open}
            title="Edit special menu schedule"
            width={480}
        >
            <Paragraph type="secondary">
                Update when <Text strong>{item?.displayName || "this special menu"}</Text> appears to customers.
                If the current time falls inside the new window, the change takes effect immediately.
            </Paragraph>
            <Form form={form} layout="vertical">
                <Form.Item
                    label={capabilities.allowTimeScheduling ? "Starts (date and time)" : "Starts (date)"}
                    name="startsAt"
                    rules={[{
                        required: true,
                        message: capabilities.allowTimeScheduling
                            ? "Set a start date and time."
                            : "Set a start date.",
                    }]}
                >
                    <Input type={capabilities.allowTimeScheduling ? "datetime-local" : "date"} />
                </Form.Item>
                <Form.Item
                    label={capabilities.allowTimeScheduling ? "Ends (date and time)" : "Ends (date)"}
                    name="endsAt"
                    rules={[{
                        required: true,
                        message: capabilities.allowTimeScheduling
                            ? "Set an end date and time."
                            : "Set an end date.",
                    }]}
                >
                    <Input type={capabilities.allowTimeScheduling ? "datetime-local" : "date"} />
                </Form.Item>
            </Form>
            {timeZone ? <Text type="secondary">{`Schedule uses ${timeZone}.`}</Text> : null}
        </Modal>
    );
}
