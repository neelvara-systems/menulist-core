'use client'

import { getBoundedStaffStringContext, logStaffClientFailure } from "@lib/staffManagement/diagnostics";
import {
    buildStaffLoginDetailsText,
    copyTextToClipboard,
    hasStaffLoginClipboardWrite,
    hasStaffLoginCopyFallback,
    isNativeStaffShareAvailable,
    openWhatsAppWebShare,
    shareStaffLoginDetails,
} from "@lib/staffManagement/shareLoginDetails";
import { Button, message, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import { LuCopy, LuSend, LuShare2 } from "react-icons/lu";

const { Text } = Typography;

type StaffLoginDetailsDiagnosticContext = Record<string, boolean | number | string | undefined>;

type StaffLoginDetailsContentProps = {
    countryCode?: string;
    diagnosticContext?: StaffLoginDetailsDiagnosticContext;
    dialCode?: string;
    phoneNumber?: string;
    productName?: string;
    staffLoginId: string;
    temporaryPasscode: string;
};

export default function StaffLoginDetailsContent({ countryCode, diagnosticContext = {}, dialCode, phoneNumber, productName, staffLoginId, temporaryPasscode }: StaffLoginDetailsContentProps) {
    const [supportsNativeShare, setSupportsNativeShare] = useState(false);
    const details = { countryCode, dialCode, phoneNumber, productName, staffLoginId, temporaryPasscode };
    const fullText = buildStaffLoginDetailsText(details);
    const buildLoginShareLogContext = (flow: string, metadata: StaffLoginDetailsDiagnosticContext = {}): StaffLoginDetailsDiagnosticContext => ({
        ...diagnosticContext,
        flow,
        hasCountryCode: Boolean(countryCode),
        hasDialCode: Boolean(dialCode),
        hasPhoneNumber: Boolean(phoneNumber),
        fullTextLength: fullText.length,
        ...getBoundedStaffStringContext('staffLoginId', staffLoginId),
        ...getBoundedStaffStringContext('temporaryPasscode', temporaryPasscode),
        ...metadata,
    });
    const getCopySupportContext = (): StaffLoginDetailsDiagnosticContext => ({
        hasClipboardWrite: hasStaffLoginClipboardWrite(),
        hasCopyFallback: hasStaffLoginCopyFallback(),
    });

    useEffect(() => {
        setSupportsNativeShare(isNativeStaffShareAvailable());
    }, []);

    const copyValue = async (value: string, label: string) => {
        const copied = await copyTextToClipboard(value);
        if (copied) {
            message.success(`${label} copied`);
            return;
        }
        logStaffClientFailure('desktop_staff_login_details_copy_failed', new Error('staff_login_details_copy_failed'), buildLoginShareLogContext('copy_login_detail', {
            ...getBoundedStaffStringContext('copyLabel', label),
            ...getCopySupportContext(),
            copyValueLength: value.length,
        }));
        message.error(`Could not copy ${label.toLowerCase()}`);
    };

    const shareOnWhatsAppWeb = async () => {
        const opened = openWhatsAppWebShare(details);
        const copied = await copyTextToClipboard(fullText);
        if (!opened) {
            logStaffClientFailure('desktop_staff_login_details_whatsapp_open_failed', new Error('staff_login_details_whatsapp_open_failed'), buildLoginShareLogContext('whatsapp_login_details', {
                copiedFallback: copied,
            }));
        }
        if (!copied) {
            logStaffClientFailure('desktop_staff_login_details_copy_failed', new Error('staff_login_details_copy_failed'), buildLoginShareLogContext('whatsapp_fallback_copy', {
                ...getCopySupportContext(),
                copyValueLength: fullText.length,
                whatsappOpened: opened,
            }));
        }
        if (opened) {
            message.success(copied ? 'WhatsApp opened. Login details copied too.' : 'WhatsApp opened');
            return;
        }
        if (copied) {
            message.success('Login details copied. Paste them in WhatsApp.');
            return;
        }
        message.error('Could not open WhatsApp');
    };

    const shareFromDevice = async () => {
        const result = await shareStaffLoginDetails(details);
        if (result === 'shared') {
            message.success('Share sheet opened');
            return;
        }
        if (result === 'cancelled') return;
        logStaffClientFailure('desktop_staff_login_details_native_share_failed', new Error('staff_login_details_native_share_failed'), buildLoginShareLogContext('native_share_login_details', {
            ...getBoundedStaffStringContext('shareResult', result),
        }));
        const copied = await copyTextToClipboard(fullText);
        if (!copied) {
            logStaffClientFailure('desktop_staff_login_details_copy_failed', new Error('staff_login_details_copy_failed'), buildLoginShareLogContext('native_share_fallback_copy', {
                ...getCopySupportContext(),
                copyValueLength: fullText.length,
                ...getBoundedStaffStringContext('shareResult', result),
            }));
        }
        message[copied ? 'success' : 'error'](copied ? 'Login details copied' : 'Could not share login details');
    };

    return (
        <Space direction="vertical" size={10}>
            <Text>Share these details with the staff member. This passcode is shown once.</Text>
            <Text strong>Staff ID: {staffLoginId}</Text>
            <Text strong>Passcode: {temporaryPasscode}</Text>
            <Space wrap>
                <Button icon={<LuCopy />} onClick={() => void copyValue(staffLoginId, 'Staff ID')}>
                    Copy Staff ID
                </Button>
                <Button icon={<LuCopy />} onClick={() => void copyValue(temporaryPasscode, 'Passcode')}>
                    Copy passcode
                </Button>
                <Button icon={<LuCopy />} onClick={() => void copyValue(fullText, 'Login details')}>
                    Copy both
                </Button>
                {supportsNativeShare ? (
                    <Button icon={<LuShare2 />} onClick={() => void shareFromDevice()}>
                        Share
                    </Button>
                ) : null}
                <Button icon={<LuSend />} onClick={() => void shareOnWhatsAppWeb()} type="primary">
                    WhatsApp
                </Button>
            </Space>
            <Text type="secondary">They can log in from the normal sign-in page.</Text>
        </Space>
    );
}
