import { useOfferingLabels } from '@hook/useOfferingLabels';
import { Button, Flex, Typography, theme } from 'antd';
import { LuFolderOpen, LuPlus } from 'react-icons/lu';

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
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: token.colorFillSecondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px'
            }}>
                <LuFolderOpen size={40} color={token.colorTextSecondary} />
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
