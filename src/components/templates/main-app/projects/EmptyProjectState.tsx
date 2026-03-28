import { Button, Flex, Typography, theme } from 'antd';
import { LuFolderOpen, LuPlus } from 'react-icons/lu';

interface EmptyProjectStateProps {
    onCreate: () => void;
}

export const EmptyProjectState = ({ onCreate }: EmptyProjectStateProps) => {
    const { token } = theme.useToken();
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
                No catalogs yet
            </Typography.Title>
            <Typography.Text type="secondary" style={{ marginBottom: '24px', textAlign: 'center', maxWidth: 400 }}>
                Create your first catalog to start managing your digital content.
            </Typography.Text>
            <Button type="primary" size="large" icon={<LuPlus />} onClick={onCreate}>
                Create First Catalog
            </Button>
        </Flex>
    );
};
