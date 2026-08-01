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
import { normalizeProjectLanguages } from "@lib/localization/languagePolicy";
import { applyLocalizedProjectDraftMap, getProjectLanguageLabel, getProjectPreferredLanguage } from "@lib/localization/projectContent";
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from "@providers/platformProviders/platformGlobalDataProvider";
import translateProjectPublicContent from "@services/ai/projectPublicContent/translateProjectPublicContent";
import type { SpecialMenuMode } from "@template/main-app/projects/types";
import {
    fromNativeDateInputValue,
    fromNativeDateTimeInputValue,
    getClockTimeInputFormat,
} from "@util/dateTime";
import { Button, DatePicker, Form, Input, Modal, Radio, Select, Typography, message, theme } from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useContext, useMemo, useRef, useState } from "react";
import { LuCalendar, LuInfo } from "react-icons/lu";
import {
    getBoundedProjectPageStringContext,
    getProjectPageProjectLogContext,
    getProjectPageStoreLogContext,
    logProjectPageFailure,
} from "./utils/projectPageDiagnostics";

const { Text, Paragraph } = Typography;

interface CreateSpecialMenuModalProps {
    open: boolean;
    onClose: () => void;
    baseProjectId: string;
    baseProjectLanguages?: string[];
    baseProjectName: string;
    onSubmit: (data: {
        baseProjectId: string;
        displayName: string;
        localizedDisplayName?: Record<string, string>;
        mode: SpecialMenuMode;
        startsAt: string;
        endsAt: string;
    }) => Promise<{ success: boolean; projectId?: string; error?: string }>;
}

export default function CreateSpecialMenuModal({
    open,
    onClose,
    baseProjectId,
    baseProjectLanguages,
    baseProjectName,
    onSubmit,
}: CreateSpecialMenuModalProps) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const { token } = theme.useToken();
    const tBusiness = useTranslations('BusinessSettings');
    const { storeDetails, userPermissions } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const canTranslatePublicContent = userPermissions?.canGenerateDescriptions === true;
    const dateTimePickerFormat = `YYYY-MM-DD ${getClockTimeInputFormat()}`;
    const managedLanguages = useMemo(
        () => normalizeProjectLanguages([...(baseProjectLanguages || []), storeDetails?.defaultLanguage || 'en']),
        [baseProjectLanguages, storeDetails?.defaultLanguage]
    );
    const referenceLanguage = getProjectPreferredLanguage({
        languages: managedLanguages,
        defaultLanguage: storeDetails?.defaultLanguage,
    });
    const [selectedLanguage, setSelectedLanguage] = useState(referenceLanguage);
    const [displayNameDrafts, setDisplayNameDrafts] = useState<Record<string, string>>({ [referenceLanguage]: '' });
    const [isTranslatingPublicContent, setIsTranslatingPublicContent] = useState(false);
    const submitInFlightRef = useRef(false);

    const capabilities = getSpecialMenuCapabilities(storeDetails?.businessType, storeDetails?.businessCategory);

    const handleSubmit = async () => {
        if (submitInFlightRef.current) return;
        try {
            const values = await form.validateFields();
            if (submitInFlightRef.current) return;
            submitInFlightRef.current = true;
            setLoading(true);

            const storeTimeZone = storeDetails?.timeZone;
            const startsAt = capabilities.allowTimeScheduling
                ? fromNativeDateTimeInputValue(values.startsAt.format("YYYY-MM-DDTHH:mm"), storeTimeZone)
                : fromNativeDateInputValue(values.startsAt.format("YYYY-MM-DD"), storeTimeZone);
            const endsAt = capabilities.allowTimeScheduling
                ? fromNativeDateTimeInputValue(values.endsAt.format("YYYY-MM-DDTHH:mm"), storeTimeZone)
                : fromNativeDateInputValue(values.endsAt.format("YYYY-MM-DD"), storeTimeZone);
            const localizedDisplayName = applyLocalizedProjectDraftMap(undefined, displayNameDrafts);
            const displayName = (displayNameDrafts[selectedLanguage] || '').trim();

            if (!displayName || !localizedDisplayName || !startsAt || !endsAt) {
                setLoading(false);
                return;
            }

            const result = await onSubmit({
                baseProjectId,
                displayName,
                localizedDisplayName,
                mode: capabilities.availableModes.length === 1
                    ? capabilities.availableModes[0]
                    : values.mode,
                startsAt,
                endsAt,
            });

            if (result.success) {
                message.success(
                    Date.parse(startsAt) <= Date.now()
                        ? `"${displayName}" created and active.`
                        : `"${displayName}" created. It will switch within a few minutes of the scheduled time.`,
                );
                form.resetFields();
                setDisplayNameDrafts({ [referenceLanguage]: '' });
                setSelectedLanguage(referenceLanguage);
                onClose();
            } else {
                message.error("Could not create special menu.");
            }
        } catch (error) {
            const validationError = error as { errorFields?: unknown[] } | null;
            if (Array.isArray(validationError?.errorFields)) return;
            logProjectPageFailure('projects_page_special_menu_create_failed', error, {
                ...getProjectPageProjectLogContext(baseProjectId),
                ...getProjectPageStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                ...getBoundedProjectPageStringContext('selectedLanguage', selectedLanguage),
                languageCount: managedLanguages.length,
                draftCount: Object.keys(displayNameDrafts).length,
            });
            message.error("Could not create special menu.");
        } finally {
            submitInFlightRef.current = false;
            setLoading(false);
        }
    };

    const handleTranslatePublicContent = async () => {
        if (!canTranslatePublicContent) return;
        try {
            setIsTranslatingPublicContent(true);
            const translated = await translateProjectPublicContent({
                projectDetails: {
                    languages: managedLanguages,
                    _specialMenu: {
                        displayName: applyLocalizedProjectDraftMap(undefined, displayNameDrafts),
                    },
                },
                projectId: baseProjectId,
                storeDetails,
            });

            if (!translated?.specialMenuDisplayName) {
                message.info("No missing special menu name translations found.");
                return;
            }

            const nextDrafts = Object.fromEntries(
                managedLanguages.map((languageCode) => [
                    languageCode,
                    typeof translated.specialMenuDisplayName?.[languageCode] === 'string'
                        ? translated.specialMenuDisplayName[languageCode]
                        : displayNameDrafts[languageCode] || '',
                ]),
            );
            setDisplayNameDrafts(nextDrafts);
            message.success("Special menu name translations added.");
        } catch (error) {
            logProjectPageFailure('projects_page_special_menu_name_translation_failed', error, {
                ...getProjectPageProjectLogContext(baseProjectId),
                ...getProjectPageStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                ...getBoundedProjectPageStringContext('selectedLanguage', selectedLanguage),
                languageCount: managedLanguages.length,
                draftCount: Object.keys(displayNameDrafts).length,
            });
            message.error("Could not translate the special menu name.");
        } finally {
            setIsTranslatingPublicContent(false);
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
            destroyOnHidden
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
                    label="Special Menu Name"
                >
                    <div style={{ display: 'grid', gap: 12 }}>
                        {managedLanguages.length > 1 ? (
                            <>
                                <Typography.Text strong>{tBusiness('contentLanguageTitle')}</Typography.Text>
                                <Select
                                    onChange={setSelectedLanguage}
                                    options={managedLanguages.map((languageCode) => ({
                                        label: getProjectLanguageLabel(languageCode),
                                        value: languageCode,
                                    }))}
                                    value={selectedLanguage}
                                />
                                {canTranslatePublicContent ? (
                                    <Button
                                        loading={isTranslatingPublicContent}
                                        onClick={() => void handleTranslatePublicContent()}
                                        size="small"
                                    >
                                        Translate missing public content
                                    </Button>
                                ) : null}
                            </>
                        ) : null}
                        <Input
                            maxLength={100}
                            onChange={(event) => setDisplayNameDrafts((previous) => ({
                                ...previous,
                                [selectedLanguage]: event.target.value,
                            }))}
                            placeholder="e.g., Diwali Menu, Sunday Brunch, IPL Night"
                            value={displayNameDrafts[selectedLanguage] || ''}
                        />
                        {selectedLanguage !== referenceLanguage ? (
                            <div
                                style={{
                                    background: token.colorFillAlter,
                                    border: `1px solid ${token.colorBorderSecondary}`,
                                    borderRadius: token.borderRadius,
                                    padding: 12,
                                }}
                            >
                                <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <Typography.Text type="secondary">{`${getProjectLanguageLabel(referenceLanguage)} reference`}</Typography.Text>
                                        <div>
                                            <Typography.Text>{displayNameDrafts[referenceLanguage] || 'No reference content available yet.'}</Typography.Text>
                                        </div>
                                    </div>
                                    {displayNameDrafts[referenceLanguage] ? (
                                        <Button onClick={() => setDisplayNameDrafts((previous) => ({
                                            ...previous,
                                            [selectedLanguage]: previous[referenceLanguage] || '',
                                        }))} size="small">
                                            Use reference
                                        </Button>
                                    ) : null}
                                </div>
                            </div>
                        ) : null}
                    </div>
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
                    <div style={{ marginBottom: 16, padding: "8px 12px", background: token.colorFillQuaternary, borderRadius: 6 }}>
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
                {storeDetails?.timeZone ? (
                    <Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: -16, marginBottom: 16 }}>
                        Schedule uses {storeDetails.timeZone}.
                    </Text>
                ) : null}

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
