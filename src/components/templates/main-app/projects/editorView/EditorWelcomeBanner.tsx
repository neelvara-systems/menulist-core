import { FEATURE_FLAGS } from '@config/features';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { Alert, Button, Flex, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { LuLink, LuSparkles } from 'react-icons/lu';

const { Text } = Typography;

const STORAGE_KEYS = {
    WELCOME_DISMISSED: 'editor_welcome_dismissed',
    OUTLET_ONBOARDING_SEEN: 'editor_outlet_onboarding_seen',
};

interface EditorWelcomeBannerProps {
    isMasterLinked: boolean;
}

export default function EditorWelcomeBanner({
    isMasterLinked
}: EditorWelcomeBannerProps) {
    const [showWelcome, setShowWelcome] = useState(false);
    const [showOutletBanner, setShowOutletBanner] = useState(false);
    const labels = useOfferingLabels();

    useEffect(() => {
        if (!FEATURE_FLAGS.ENABLE_EDITOR_ONBOARDING) return;

        // Check if welcome banner should show (first-time Editor visit)
        const welcomeDismissed = localStorage.getItem(STORAGE_KEYS.WELCOME_DISMISSED);
        if (!welcomeDismissed) {
            setShowWelcome(true);
        }

        // Check if outlet banner should show (first-time outlet store)
        if (isMasterLinked) {
            const outletSeen = localStorage.getItem(STORAGE_KEYS.OUTLET_ONBOARDING_SEEN);
            if (!outletSeen) {
                setShowOutletBanner(true);
            }
        }
    }, [isMasterLinked]);

    const dismissWelcome = () => {
        setShowWelcome(false);
        localStorage.setItem(STORAGE_KEYS.WELCOME_DISMISSED, 'true');
    };

    const dismissOutletBanner = () => {
        setShowOutletBanner(false);
        localStorage.setItem(STORAGE_KEYS.OUTLET_ONBOARDING_SEEN, 'true');
    };

    if (!FEATURE_FLAGS.ENABLE_EDITOR_ONBOARDING) return null;
    if (!showWelcome && !showOutletBanner) return null;

    return (
        <Flex vertical gap={12} style={{ marginBottom: 16 }}>
            {/* First-time Editor Welcome Banner */}
            {showWelcome && (
                <Alert
                    type="info"
                    icon={<LuSparkles size={18} />}
                    message={labels.editorWelcome}
                    description={
                        <Flex vertical gap={8}>
                            <Text>{labels.editorWelcomeDesc}</Text>
                            <Flex gap={8}>
                                <Button size="small" onClick={dismissWelcome}>
                                    Got it
                                </Button>
                            </Flex>
                        </Flex>
                    }
                    closable
                    onClose={dismissWelcome}
                />
            )}

            {/* Outlet Store Onboarding Banner */}
            {showOutletBanner && isMasterLinked && (
                <Alert
                    type="info"
                    icon={<LuLink size={18} />}
                    message={labels.outletLinkedLabel}
                    description={
                        <Flex vertical gap={4}>
                            <Text>• Brand items (name, description, images) stay consistent across stores</Text>
                            <Text>• You CAN change: prices, availability, bestsellers</Text>
                            <Text>• Use <strong>More Actions → Store Customization</strong> for quick changes</Text>
                        </Flex>
                    }
                    closable
                    onClose={dismissOutletBanner}
                />
            )}
        </Flex>
    );
}
