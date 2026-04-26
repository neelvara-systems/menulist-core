import { FEATURE_FLAGS } from "@config/features";
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from "@providers/platformProviders/platformGlobalDataProvider";
import { Alert, Button, Flex, Typography } from "antd";
import { ReactNode, useContext } from "react";
import { LuCheck } from "react-icons/lu";
import OBPLinkCard from "../../../businessSettings/OBPLinkCard";
import TempStatusCard from "../../../businessSettings/TempStatusCard";

const { Text } = Typography;

const EmptyState = ({
    canGenerate = false,
    isGenerating = false,
    onGenerate,
    selectorContent,
}: {
    canGenerate?: boolean;
    isGenerating?: boolean;
    onGenerate?: () => void;
    selectorContent?: ReactNode;
}) => {
    const { storeDetails, setStoreDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);

    return (
        <Flex gap={16} vertical style={{ maxWidth: 640 }}>
            <Alert
                icon={<LuCheck size={16} />}
                message={<Text strong>No actions right now</Text>}
                description="Check back later — content suggestions will appear here when ready."
                type="success"
                showIcon
            />
            {selectorContent || null}
            {onGenerate ? (
                <Button
                    type="primary"
                    loading={isGenerating}
                    disabled={!canGenerate}
                    onClick={onGenerate}
                    style={{ width: 'fit-content' }}
                >
                    Generate Today Action
                </Button>
            ) : null}

            {FEATURE_FLAGS.ENABLE_TEMP_STATUS && storeDetails && (
                <TempStatusCard
                    storeDetails={storeDetails}
                    setStoreDetails={setStoreDetails}
                />
            )}

            {storeDetails && (
                <OBPLinkCard storeDetails={storeDetails} />
            )}
        </Flex>
    );
};

export default EmptyState;
