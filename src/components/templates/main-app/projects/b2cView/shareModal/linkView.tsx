import { useOfferingLabels } from '@hook/useOfferingLabels';
import { Button, Flex, message, Typography } from 'antd';
import { LuCopy, LuExternalLink } from 'react-icons/lu';

const { Text, Link } = Typography;

interface LinkViewProps {
    shareUrl: string;
}



function LinkView({ shareUrl }: LinkViewProps) {
    const labels = useOfferingLabels();


    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            message.success('Link copied to clipboard!');
        } catch (err) {
            message.error('Failed to copy link');
        }
    };

    const handleOpenLink = () => {
        window.location.assign(shareUrl);
    };



    return (
        <Flex vertical gap={24}>
            <Flex vertical gap={8}>
                <Text strong style={{ marginBottom: '12px' }}>
                    Share this link with others to let them view your {labels.offeringLower}:
                </Text>
                <Link
                    style={{
                        fontSize: '12px',
                        padding: '10px',
                        background: '#f5f5f5',
                        borderRadius: '6px',
                        wordBreak: 'break-all'
                    }}
                    onClick={handleCopyLink}
                >
                    {shareUrl}
                </Link>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                    Click the link to copy to clipboard
                </Text>
            </Flex>

            <Flex gap={12}>
                <Button
                    block
                    icon={<LuCopy />}
                    onClick={handleCopyLink}
                >
                    Copy Link
                </Button>
                <Button
                    block
                    type="primary"
                    icon={<LuExternalLink />}
                    onClick={handleOpenLink}
                >
                    Open Link
                </Button>
            </Flex>


        </Flex>
    );
}

export default LinkView;
