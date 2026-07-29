import { FEATURE_FLAGS } from '@config/features';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import {
    EDITOR_ONBOARDING_MARKER,
    getEditorOnboardingStorageKeys,
    isEditorOnboardingMarker,
} from '@lib/browserStorage/editorOnboarding';
import { Alert, Button, Flex, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { LuLink, LuSparkles } from 'react-icons/lu';
import {
    getBoundedMenuEditorStringContext,
    logMenuEditorFailure,
} from '../utils/editorDiagnostics';

const { Text } = Typography;

type EditorOnboardingStorageOperation = 'read' | 'remove_invalid' | 'write';
const reportedStorageFailures = new Set<EditorOnboardingStorageOperation>();

interface EditorWelcomeBannerProps {
    isMasterLinked: boolean;
    storeId: unknown;
    tenantId: unknown;
}

export default function EditorWelcomeBanner({
    isMasterLinked,
    storeId,
    tenantId,
}: EditorWelcomeBannerProps) {
    const [showWelcome, setShowWelcome] = useState(false);
    const [showOutletBanner, setShowOutletBanner] = useState(false);
    const labels = useOfferingLabels();

    useEffect(() => {
        setShowWelcome(false);
        setShowOutletBanner(false);
        if (!FEATURE_FLAGS.ENABLE_EDITOR_ONBOARDING) return;

        const storageKeys = getEditorOnboardingStorageKeys(tenantId, storeId);
        if (!storageKeys) return;

        try {
            const welcomeDismissed = localStorage.getItem(storageKeys.welcomeDismissed);
            const outletSeen = localStorage.getItem(storageKeys.outletSeen);

            setShowWelcome(!isEditorOnboardingMarker(welcomeDismissed));
            setShowOutletBanner(isMasterLinked && !isEditorOnboardingMarker(outletSeen));

            const invalidKeys = [
                welcomeDismissed !== null && !isEditorOnboardingMarker(welcomeDismissed)
                    ? storageKeys.welcomeDismissed
                    : null,
                outletSeen !== null && !isEditorOnboardingMarker(outletSeen)
                    ? storageKeys.outletSeen
                    : null,
            ].filter((key): key is string => Boolean(key));
            for (const key of invalidKeys) {
                try {
                    localStorage.removeItem(key);
                } catch (error) {
                    logStorageFailure('remove_invalid', error, key, tenantId, storeId);
                }
            }
        } catch (error) {
            logStorageFailure('read', error, storageKeys.welcomeDismissed, tenantId, storeId);
            // The banner is optional UI; unavailable storage must not break the editor.
            setShowWelcome(true);
            setShowOutletBanner(isMasterLinked);
        }
    }, [isMasterLinked, storeId, tenantId]);

    const dismissWelcome = () => {
        setShowWelcome(false);
        persistDismissal('welcomeDismissed');
    };

    const dismissOutletBanner = () => {
        setShowOutletBanner(false);
        persistDismissal('outletSeen');
    };

    const persistDismissal = (keyName: 'outletSeen' | 'welcomeDismissed'): void => {
        const storageKeys = getEditorOnboardingStorageKeys(tenantId, storeId);
        if (!storageKeys) return;
        try {
            localStorage.setItem(storageKeys[keyName], EDITOR_ONBOARDING_MARKER);
        } catch (error) {
            logStorageFailure('write', error, storageKeys[keyName], tenantId, storeId);
        }
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
                            <Text>• Shared {labels.itemsPlural} stay consistent across stores</Text>
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

function logStorageFailure(
    operation: EditorOnboardingStorageOperation,
    error: unknown,
    storageKey: string,
    tenantId: unknown,
    storeId: unknown,
): void {
    if (reportedStorageFailures.has(operation)) return;
    reportedStorageFailures.add(operation);
    logMenuEditorFailure('menu_editor_onboarding_storage_failed', error, {
        operation,
        ...getBoundedMenuEditorStringContext('storageKey', storageKey),
        ...getBoundedMenuEditorStringContext('tenantId', tenantId),
        ...getBoundedMenuEditorStringContext('storeId', storeId),
    });
}
