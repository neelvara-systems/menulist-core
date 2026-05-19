'use client'

import { buildStaffLoginDetailsText, copyTextToClipboard, isNativeStaffShareAvailable, openWhatsAppWebShare, shareStaffLoginDetails } from "@lib/staffManagement/shareLoginDetails";
import { Button, message, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import { LuCopy, LuSend, LuShare2 } from "react-icons/lu";

const { Text } = Typography;

type StaffLoginDetailsContentProps = {
    countryCode?: string;
    dialCode?: string;
    phoneNumber?: string;
    staffLoginId: string;
    temporaryPasscode: string;
};

export default function StaffLoginDetailsContent({ countryCode, dialCode, phoneNumber, staffLoginId, temporaryPasscode }: StaffLoginDetailsContentProps) {
    const [supportsNativeShare, setSupportsNativeShare] = useState(false);
    const details = { countryCode, dialCode, phoneNumber, staffLoginId, temporaryPasscode };
    const fullText = buildStaffLoginDetailsText(details);

    useEffect(() => {
        setSupportsNativeShare(isNativeStaffShareAvailable());
    }, []);

    const copyValue = async (value: string, label: string) => {
        const copied = await copyTextToClipboard(value);
        if (copied) {
            message.success(`${label} copied`);
            return;
        }
        message.error(`Could not copy ${label.toLowerCase()}`);
    };

    const shareOnWhatsAppWeb = () => {
        const opened = openWhatsAppWebShare(details);
        if (opened) {
            message.success('WhatsApp Web opened');
            return;
        }
        message.error('Could not open WhatsApp Web');
    };

    const shareFromDevice = async () => {
        const result = await shareStaffLoginDetails(details);
        if (result === 'shared') {
            message.success('Share sheet opened');
            return;
        }
        if (result === 'cancelled') return;
        message.error('Could not share login details');
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
                <Button icon={<LuSend />} onClick={shareOnWhatsAppWeb} type="primary">
                    Open WhatsApp Web
                </Button>
            </Space>
            <Text type="secondary">They can log in from the normal sign-in page.</Text>
        </Space>
    );
}
