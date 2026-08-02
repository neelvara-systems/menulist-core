import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { Button, Flex, Typography, theme } from 'antd';
import { LuPlus } from 'react-icons/lu';

interface EmptyProjectStateProps {
    onCreate: () => void;
}

export const EmptyProjectState = ({ onCreate }: EmptyProjectStateProps) => {
    const { token } = theme.useToken();
    const labels = useOfferingLabels();
    const offeringName = labels.offeringPhrase.charAt(0).toUpperCase() + labels.offeringPhrase.slice(1);

    return (
        <Flex vertical align="center" justify="center" style={{ padding: '60px 20px', height: '100%', width: '100%' }}>
            <div style={{
                alignItems: 'center',
                background: token.colorPrimaryBg,
                borderRadius: 24,
                display: 'flex',
                justifyContent: 'center',
                marginBottom: 24,
                minHeight: 148,
                padding: '16px 22px',
                width: 176,
            }}>
                <ContextualStateIllustration
                    color={token.colorPrimary}
                    size={132}
                    style={{ opacity: 0.82 }}
                    treatment="softHalo"
                    variant="emptyWorkspace"
                />
            </div>
            <Typography.Title level={3} style={{ margin: 0, marginBottom: '8px' }}>
                No {labels.offeringPhrase} yet
            </Typography.Title>
            <Typography.Text type="secondary" style={{ marginBottom: '24px', textAlign: 'center', maxWidth: 400 }}>
                Create your first {labels.offeringPhrase} to start managing your digital content.
            </Typography.Text>
            <Button type="primary" size="large" icon={<LuPlus />} onClick={onCreate}>
                Create {offeringName}
            </Button>
        </Flex>
    );
};
