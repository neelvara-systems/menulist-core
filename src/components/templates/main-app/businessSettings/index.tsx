"use client";

import ImageUploadInput from "@atoms/imageUploadInput";
import { FEATURE_FLAGS } from "@config/features";
import { ECOMSAI_PLATFORM_STORE_ID } from "@constant/user";
import { extractBrandChanges, propagateBrandToOutlets } from "@database/multiOutlet/brandPropagation";
import { getPlatformSummary } from "@database/platformSummary";
import { addStore, updateStore } from "@database/stores";
import { updateTenantsStoreslist } from "@database/tenants";
import { useAppDispatch } from "@hook/useAppDispatch";
import { _debounce } from "@hook/useDebounce";
import {
    APP_DATE_FORMAT_COOKIES_KEY,
    APP_TIME_FORMAT_COOKIES_KEY,
    DATE_FORMATS,
    defaultDateFormatString,
    defaultTimeFormatString,
} from "@lib/localization/config";
import { UserUploadedFileType } from "@type/common";
import { getUTCDate } from "@util/dateTime";
import { getObjectDifferance } from "@util/deepMerge";
import { Button, Card, Flex, Form, Menu, Space, Typography } from "antd";
import { getCookie } from "cookies-next";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { motion } from "framer-motion";
import { useFormatter, useTimeZone, useTranslations } from "next-intl";
import { createRef, useEffect, useMemo, useRef, useState } from "react";
import {
    LuBarChart,
    LuClock,
    LuGlobe,
    LuInfo,
    LuLink,
    LuList,
    LuMapPin,
    LuMessageSquare,
    LuSave,
    LuSearch,
    LuShield,
    LuSmartphone,
    LuTimer,
    LuTv,
    LuUpload,
    LuUser,
} from "react-icons/lu";
import { SiGooglemybusiness } from "react-icons/si";
import DigitalScreenSettings from "../settings/DigitalScreenSettings";
import {
    AnalyticsTab,
    BasicInfoTab,
    BusinessAttributesTab,
    ContactPersonTab,
    CustomerAppTab,
    DomainSettingsTab,
    FeedbackSettingsTab,
    IntegrationsTab,
    LocaleSettingsTab,
    LocationInfoTab,
    OfficialPageTab,
    PosSyncTab,
    SeoTab,
    SocialMediaTab,
    TimeSlotPresetsTab,
    WorkingHoursTab,
} from "./tabs";

dayjs.extend(customParseFormat);

interface WorkingHourSlot {
    day: string;
    start: dayjs.Dayjs | null;
    end: dayjs.Dayjs | null;
}

function BusinessSettings({ storeDetails, setStoreDetails, tenantDetails }) {
    const t = useTranslations('BusinessSettings');
    const format = useFormatter();
    const now = getUTCDate().newDate;
    const [form] = Form.useForm();
    const timezone = useTimeZone();
    const dispatch = useAppDispatch();
    const [availableDateFormats, setAvailableDateFormats] =
        useState(DATE_FORMATS);
    const [selectedFile, setSelectedFile] = useState<UserUploadedFileType>({
        name: "",
        size: 0,
        type: "",
        url: null,
    });
    const [activeSection, setActiveSection] = useState(0);
    const fileInputRef = useRef(null);
    const [socialMedia, setSocialMedia] = useState<Record<string, string>>({});
    const [timeSlotPresets, setTimeSlotPresets] = useState(
        storeDetails?.timeSlotPresets || [],
    );

    const [workingHours, setWorkingHours] = useState<WorkingHourSlot[]>([
        { day: "sun", start: null, end: null },
        { day: "mon", start: null, end: null },
        { day: "tue", start: null, end: null },
        { day: "wed", start: null, end: null },
        { day: "thu", start: null, end: null },
        { day: "fri", start: null, end: null },
        { day: "sat", start: null, end: null },
    ]);

    // Feedback settings state
    const [feedbackEnabled, setFeedbackEnabled] = useState<boolean>(
        storeDetails?.feedbackEnabled !== false
    );
    const [feedbackDefaults, setFeedbackDefaults] = useState({
        collectComment: storeDetails?.feedbackDefaults?.collectComment ?? true,
        collectCommentRequired: storeDetails?.feedbackDefaults?.collectCommentRequired ?? false,
        collectName: storeDetails?.feedbackDefaults?.collectName ?? false,
        collectNameRequired: storeDetails?.feedbackDefaults?.collectNameRequired ?? false,
        collectPhone: storeDetails?.feedbackDefaults?.collectPhone ?? true,
        collectPhoneRequired: storeDetails?.feedbackDefaults?.collectPhoneRequired ?? false,
        collectEmail: storeDetails?.feedbackDefaults?.collectEmail ?? true,
        collectEmailRequired: storeDetails?.feedbackDefaults?.collectEmailRequired ?? false,
    });
    const [reviewUrl, setReviewUrl] = useState<string>(
        storeDetails?.reviewUrl || ''
    );

    const scrollRefs = useRef(
        Array(16)
            .fill(0)
            .map(() => createRef<HTMLDivElement>()),
    );

    const TAB_ITEMS_LIST = [
        {
            key: "basic",
            label: t('basicInformation'),
            icon: <LuInfo />,
            tab: <BasicInfoTab scrollRef={scrollRefs.current[0]} />,
        },
        {
            key: "domain",
            label: t('domain'),
            icon: <LuLink />,
            tab: (
                <DomainSettingsTab
                    scrollRef={scrollRefs.current[1]}
                    storeDetails={storeDetails}
                    onStoreUpdate={(updates) => {
                        const storeUpdate = { storeId: storeDetails.storeId, ...updates };
                        updateStore(storeUpdate).then(() => {
                            setStoreDetails({ ...storeDetails, ...updates });
                        });
                    }}
                />
            ),
        },
        {
            key: "official-page",
            label: t('officialPage'),
            icon: <LuGlobe />,
            tab: (
                <OfficialPageTab
                    scrollRef={scrollRefs.current[2]}
                    publicPresence={storeDetails?.publicPresence}
                    subdomain={storeDetails?.subdomain}
                    customDomain={storeDetails?.customDomain}
                    onGoogleLinkDone={() => {
                        const updates = {
                            storeId: storeDetails?.storeId,
                            publicPresence: {
                                ...(storeDetails?.publicPresence || {}),
                                googleLinkUpdated: true,
                                googleLinkUpdatedAt: new Date().toISOString(),
                            },
                        };
                        updateStore(updates).then(() => {
                            setStoreDetails({
                                ...storeDetails,
                                publicPresence: {
                                    ...(storeDetails?.publicPresence || {}),
                                    googleLinkUpdated: true,
                                    googleLinkUpdatedAt: new Date().toISOString(),
                                },
                            });
                        });
                    }}
                    onGoogleLinkDismiss={() => {
                        // Silently dismiss — no persistence needed
                    }}
                />
            ),
        },
        {
            key: "location",
            label: t('locationInformation'),
            icon: <LuMapPin />,
            tab: <LocationInfoTab scrollRef={scrollRefs.current[3]} />,
        },
        ...(FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED ? [{
            key: "digital-screens",
            label: t('digitalScreens'),
            icon: <LuTv />,
            tab: (
                <div ref={scrollRefs.current[4]}>
                    <DigitalScreenSettings />
                </div>
            ),
        }] : []),
        {
            key: "locale",
            label: t('localeSettings'),
            icon: <LuGlobe />,
            tab: <LocaleSettingsTab scrollRef={scrollRefs.current[FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED ? 5 : 4]} />,
        },
        {
            key: "contact",
            label: t('contactPerson'),
            icon: <LuUser />,
            tab: <ContactPersonTab scrollRef={scrollRefs.current[FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED ? 6 : 5]} />,
        },
        {
            key: "hours",
            label: t('workingHours'),
            icon: <LuClock />,
            tab: (
                <WorkingHoursTab
                    scrollRef={scrollRefs.current[FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED ? 7 : 6]}
                    workingHours={workingHours}
                    setWorkingHours={setWorkingHours}
                    form={form}
                />
            ),
        },
        {
            key: "timeslots",
            label: t('timeSlotPresets'),
            icon: <LuTimer />,
            tab: (
                <TimeSlotPresetsTab
                    scrollRef={scrollRefs.current[FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED ? 8 : 7]}
                    tenantId={storeDetails?.tenantId}
                    storeId={storeDetails?.storeId}
                    presets={timeSlotPresets}
                    onPresetsChange={setTimeSlotPresets}
                />
            ),
        },
        {
            key: "social",
            label: t('socialMedia'),
            icon: <LuLink />,
            tab: (
                <SocialMediaTab
                    scrollRef={scrollRefs.current[FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED ? 9 : 8]}
                    socialMedia={socialMedia}
                    setSocialMedia={setSocialMedia}
                />
            ),
        },
        ...(FEATURE_FLAGS.ENABLE_BUSINESS_ATTRIBUTES ? [{
            key: "business-attributes",
            label: t('businessAttributes'),
            icon: <LuList />,
            tab: <BusinessAttributesTab scrollRef={scrollRefs.current[FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED ? 10 : 9]} />,
        }] : []),
        {
            key: "seo",
            label: t('seoSettings'),
            icon: <LuSearch />,
            tab: <SeoTab scrollRef={scrollRefs.current[(FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED ? 11 : 10) + (FEATURE_FLAGS.ENABLE_BUSINESS_ATTRIBUTES ? 1 : 0)]} />,
        },
        {
            key: "analytics",
            label: t('analytics'),
            icon: <LuBarChart />,
            tab: <AnalyticsTab scrollRef={scrollRefs.current[(FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED ? 12 : 11) + (FEATURE_FLAGS.ENABLE_BUSINESS_ATTRIBUTES ? 1 : 0)]} form={form} />,
        },
        {
            key: "integrations",
            label: t('integrations'),
            icon: <SiGooglemybusiness />,
            tab: (
                <IntegrationsTab
                    scrollRef={scrollRefs.current[(FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED ? 13 : 12) + (FEATURE_FLAGS.ENABLE_BUSINESS_ATTRIBUTES ? 1 : 0)]}
                    storeDetails={storeDetails}
                />
            ),
        },
        {
            key: "feedback",
            label: t('feedback'),
            icon: <LuMessageSquare />,
            tab: (
                <FeedbackSettingsTab
                    scrollRef={scrollRefs.current[(FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED ? 14 : 13) + (FEATURE_FLAGS.ENABLE_BUSINESS_ATTRIBUTES ? 1 : 0)]}
                    feedbackEnabled={feedbackEnabled}
                    setFeedbackEnabled={setFeedbackEnabled}
                    feedbackDefaults={feedbackDefaults}
                    setFeedbackDefaults={setFeedbackDefaults}
                    reviewUrl={reviewUrl}
                    setReviewUrl={setReviewUrl}
                />
            ),
        },
        {
            key: "pos-sync",
            label: t('posSync'),
            icon: <LuShield />,
            tab: (
                <PosSyncTab
                    scrollRef={scrollRefs.current[(FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED ? 15 : 14) + (FEATURE_FLAGS.ENABLE_BUSINESS_ATTRIBUTES ? 1 : 0)]}
                    storeDetails={storeDetails}
                    onStoreUpdate={(updates) => {
                        const storeUpdate = { storeId: storeDetails.storeId, ...updates };
                        updateStore(storeUpdate).then(() => {
                            setStoreDetails({ ...storeDetails, ...updates });
                        });
                    }}
                />
            ),
        },
        // Customer App (PWA) — appended last so existing scrollRef indices above
        // remain stable regardless of which feature flags are toggled.
        ...(FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA ? [{
            key: "customer-app",
            label: "Customer App",
            icon: <LuSmartphone />,
            tab: (
                <CustomerAppTab
                    scrollRef={
                        scrollRefs.current[
                        (FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED ? 16 : 15) +
                        (FEATURE_FLAGS.ENABLE_BUSINESS_ATTRIBUTES ? 1 : 0)
                        ]
                    }
                />
            ),
        }] : []),
    ];
    scrollRefs.current = TAB_ITEMS_LIST.map(
        (_, i) => scrollRefs.current[i] ?? createRef(),
    );

    const onScrollSetActive = () => {
        scrollRefs.current?.forEach((element, index) => {
            if (element?.current?.getBoundingClientRect().top < 100) {
                setActiveSection(index);
            }
        });
    };

    const onScroll = useMemo(() => _debounce(onScrollSetActive, 500), []);

    useEffect(() => {
        const scrollContainer = document.querySelector(".scroll-container");
        if (scrollContainer) {
            scrollContainer.addEventListener("scroll", onScroll);
            return () => scrollContainer.removeEventListener("scroll", onScroll);
        }
    }, [onScroll]);

    const scrollToSection = (index: number) => {
        scrollRefs.current[index]?.current?.scrollIntoView({ behavior: "smooth" });
        setActiveSection(index);
    };

    // Initialize imageUrl from storeDetails if it exists
    useEffect(() => {
        if (storeDetails?.socialMedia) {
            setSocialMedia(storeDetails?.socialMedia);
        }
        if (storeDetails?.workingHours) {
            const hours = Object.entries(storeDetails?.workingHours).map(
                ([day, timeRange]) => {
                    if (timeRange) {
                        const [start, end] = (timeRange as string).split("-");
                        return {
                            day,
                            start: dayjs(`2025-04-02 ${start}`, "YYYY-MM-DD HH:mm"),
                            end: dayjs(`2025-04-02 ${end}`, "YYYY-MM-DD HH:mm"),
                        };
                    }
                    return { day, start: null, end: null };
                },
            );
            setWorkingHours(hours);
            form.setFieldsValue({ workingHours: hours });
        }

        //date format
        if (!storeDetails?.dateFormat) {
            //get cookie value
            let currentDateFormat: any = getCookie(APP_DATE_FORMAT_COOKIES_KEY);
            if (!currentDateFormat) {
                //if cookies not present then use defult value
                currentDateFormat = defaultDateFormatString;
            }

            // local format
            let isPresent = availableDateFormats.find(
                (t) => t.label == currentDateFormat,
            );
            if (!Boolean(isPresent)) {
                const [day, month, year] = currentDateFormat.split("|");
                setAvailableDateFormats([
                    { label: currentDateFormat, value: { day, month, year } },
                    ...DATE_FORMATS,
                ]);
            }
            form.setFieldsValue({ dateFormat: currentDateFormat });
        }

        //time format
        if (!storeDetails?.timeFormat) {
            //get cookie value
            let currentTimeFormat: any = getCookie(APP_TIME_FORMAT_COOKIES_KEY);
            if (!currentTimeFormat) {
                //if cookies not present then use defult value
                currentTimeFormat = defaultTimeFormatString;
            }
            form.setFieldsValue({ timeFormat: currentTimeFormat });
        }

        //timezone
        if (!storeDetails?.timeZone) {
            form.setFieldsValue({ timeZone: timezone });
        }
    }, [storeDetails, form]);

    const getFormatedWorkingHours = (workingHours: any) => {
        const updatedHours = workingHours.reduce(
            (acc, curr) => {
                // Only add the day if it has both start and end times
                if (curr.start && curr.end) {
                    acc[curr.day] =
                        `${curr.start.format("HH:mm")}-${curr.end.format("HH:mm")}`;
                }
                return acc;
            },
            {} as Record<string, string>,
        );

        // If no working hours are set, return null
        return Object.keys(updatedHours).length === 0 ? null : updatedHours;
    };

    const addUpdateDetails = async (changesToUpload: any) => {
        if (selectedFile.url) {
            changesToUpload.imageToUpdate = selectedFile.url;
            changesToUpload.imageType = selectedFile.type;
        }

        changesToUpload.socialMedia = socialMedia;
        changesToUpload.workingHours = getFormatedWorkingHours(workingHours);

        // Feedback settings (managed as React state, not Form fields)
        changesToUpload.feedbackEnabled = feedbackEnabled;
        changesToUpload.feedbackDefaults = feedbackDefaults;
        if (reviewUrl.trim()) {
            changesToUpload.reviewUrl = reviewUrl.trim();
        } else if (storeDetails?.reviewUrl) {
            // If cleared, explicitly set to empty string so diff detects the removal
            changesToUpload.reviewUrl = '';
        }
        if (
            Boolean(storeDetails?.storeId) ||
            storeDetails?.storeId == ECOMSAI_PLATFORM_STORE_ID
        ) {
            console.log("changesToUpload update request", changesToUpload);

            const updatedChanges: any = getObjectDifferance(
                changesToUpload,
                storeDetails,
            );
            if (Object.keys(updatedChanges).length > 0) {
                updatedChanges.storeId = storeDetails.storeId;
                if ("name" in updatedChanges) {
                    updatedChanges.storeKey = updatedChanges.name
                        .toLowerCase()
                        .replaceAll(" ", "_");
                }
                updateStore(updatedChanges).then((savedDetails) => {
                    // Brand propagation: if master store changed brand fields, propagate to outlets
                    if (storeDetails?.isMaster && storeDetails?.tenantId) {
                        const brandChanges = extractBrandChanges({ ...updatedChanges, ...savedDetails });
                        if (brandChanges) {
                            propagateBrandToOutlets(
                                storeDetails.tenantId,
                                storeDetails.storeId,
                                brandChanges,
                            ).catch(() => { }); // Non-blocking
                        }
                    }

                    //created new store
                    if ("name" in updatedChanges) {
                        const savedstoresList = tenantDetails.storesList;
                        const index = savedstoresList.findIndex(
                            (s) => s.storeId == storeDetails.storeId,
                        );
                        if (index != -1) {
                            console.log("stores Updated in tenant");
                            savedstoresList[index].name = updatedChanges.name;
                            const tenantData = {
                                tenantId: tenantDetails.tenantId,
                                storesList: savedstoresList,
                            };
                            updateTenantsStoreslist(tenantData).then(() => {
                                setStoreDetails({
                                    ...storeDetails,
                                    ...updatedChanges,
                                    ...savedDetails,
                                });
                            });
                        } else {
                            setStoreDetails({
                                ...storeDetails,
                                ...updatedChanges,
                                ...savedDetails,
                            });
                        }
                    } else {
                        setStoreDetails({
                            ...storeDetails,
                            ...updatedChanges,
                            ...savedDetails,
                        });
                    }
                });
            } else {
                console.log("No changes detected.");
            }
        } else {
            console.log("changesToUpload create request", changesToUpload);
            let newId = 0;
            const summary = await getPlatformSummary();
            newId = summary.stores?.count + 1;
            changesToUpload = {
                ...changesToUpload,
                storeId: newId,
                tenantId: tenantDetails.tenantId,
                storeKey: changesToUpload.name?.toLowerCase().replaceAll(" ", "_"),
                email: tenantDetails.email,
                phoneNumber: tenantDetails.phoneNumber,
                tenantName: tenantDetails.name,
            };

            addStore(changesToUpload).then((savedDetails) => {
                const tenantData = {
                    tenantId: tenantDetails.tenantId,
                    storesList: [
                        ...tenantDetails.storesList,
                        { storeId: changesToUpload.storeId, name: changesToUpload.name },
                    ],
                };
                updateTenantsStoreslist(tenantData).then(() => {
                    console.log("store details Updated in tenant");
                    setStoreDetails({ ...changesToUpload, ...savedDetails });
                });
            });
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <Card title={t('title')}>
                <Flex
                    gap={16}
                    style={{
                        width: "100%",
                        height: "calc(100vh - 120px)",
                        position: "relative",
                    }}
                >
                    <Flex
                        vertical
                        gap={16}
                        style={{
                            maxWidth: 300,
                            width: "100%",
                            height: "100%",
                            position: "sticky",
                            top: 0,
                            zIndex: 1,
                        }}
                    >
                        <Card hoverable onClick={() => fileInputRef.current.click()}>
                            <Flex
                                vertical
                                gap={16}
                                align="center"
                                style={{ cursor: "pointer" }}
                            >
                                {selectedFile.url ? (
                                    <img
                                        src={selectedFile.url}
                                        style={{ width: "auto", height: 100, borderRadius: 8 }}
                                    />
                                ) : (
                                    <>
                                        {storeDetails?.logo ? (
                                            <img
                                                src={storeDetails?.logo}
                                                style={{ width: "auto", height: 100, borderRadius: 8 }}
                                            />
                                        ) : (
                                            <Button
                                                icon={<LuUpload />}
                                                type="dashed"
                                                style={{ height: 100, width: 100 }}
                                            >
                                                {t('uploadLogo' as any)}
                                            </Button>
                                        )}
                                    </>
                                )}
                                <Typography.Text
                                    type="secondary"
                                    style={{ textAlign: "center" }}
                                >
                                    {t('uploadLogoDesc' as any)}
                                </Typography.Text>
                            </Flex>
                        </Card>
                        <Menu
                            style={{ width: "100%" }}
                            selectedKeys={[TAB_ITEMS_LIST[activeSection].key]}
                            items={TAB_ITEMS_LIST}
                            onClick={({ key }) => {
                                const index = TAB_ITEMS_LIST.findIndex(
                                    (item) => item.key === key,
                                );
                                scrollToSection(index);
                            }}
                        />
                    </Flex>
                    <Flex
                        vertical
                        style={{ width: "100%", height: "100%", overflow: "auto" }}
                    >
                        <Form
                            style={{ width: "100%" }}
                            form={form}
                            layout="vertical"
                            onFinish={addUpdateDetails}
                            initialValues={{
                                ...storeDetails,
                                currencyCode: storeDetails?.currencyCode || "INR",
                                currencySymbol: storeDetails?.currencySymbol || "\u20b9",
                                country: storeDetails?.country || "India",
                                workingHours: storeDetails?.workingHours || {
                                    sun: null,
                                    mon: null,
                                    tue: null,
                                    wed: null,
                                    thu: null,
                                    fri: null,
                                    sat: null,
                                },
                            }}
                        >
                            <Flex vertical style={{ width: "100%", height: "100%" }} gap={16}>
                                {TAB_ITEMS_LIST.map((item) => (
                                    <div key={item.key}>{item.tab}</div>
                                ))}

                                <Form.Item
                                    style={{
                                        margin: "unset",
                                        position: "sticky",
                                        bottom: 10,
                                        right: 10,
                                        width: "100%",
                                        display: "flex",
                                        justifyContent: "end",
                                        alignItems: "center",
                                    }}
                                >
                                    <Space>
                                        <Button
                                            size="large"
                                            onClick={() => {
                                                form.setFieldsValue({
                                                    ...storeDetails,
                                                    currencyCode: storeDetails?.currencyCode,
                                                    currencySymbol: storeDetails?.currencySymbol,
                                                    country: storeDetails?.country,
                                                });
                                                if (storeDetails?.logo) {
                                                    setSelectedFile({
                                                        name: storeDetails?.logo,
                                                        size: 0,
                                                        type: "",
                                                        url: storeDetails?.logo,
                                                    });
                                                } else {
                                                    setSelectedFile({
                                                        name: "",
                                                        size: 0,
                                                        type: "",
                                                        url: null,
                                                    });
                                                }
                                            }}
                                        >
                                            {t('reset' as any)}
                                        </Button>
                                        <Button
                                            size="large"
                                            type="primary"
                                            htmlType="submit"
                                            icon={<LuSave />}
                                        >
                                            {t('saveChanges')}
                                        </Button>
                                    </Space>
                                </Form.Item>
                            </Flex>
                        </Form>
                    </Flex>
                </Flex>
            </Card>

            <ImageUploadInput
                onUploadFile={(selectedFile: UserUploadedFileType) =>
                    setSelectedFile(selectedFile)
                }
                fileInputRef={fileInputRef}
            />
        </motion.div>
    );
}

export default BusinessSettings;
