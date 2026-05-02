import { useOfferingLabels } from '@hook/useOfferingLabels';
import { Alert, Space, Typography } from 'antd';
import React from 'react';

const { Text, Paragraph } = Typography;

const AiDisclaimerAlert: React.FC = () => {
    const labels = useOfferingLabels();

    return (
        <Alert
            type="info"
            showIcon
            style={{ margin: '16px 0' }}
            message={<Text strong>Generated Content Review</Text>}
            description={
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Paragraph>
                        Some features in this project create descriptions, images, and translations automatically. Please review the results carefully before you publish them.
                    </Paragraph>

                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        <li>
                            <Text>Generated text, images, and translations may still need owner review and editing.</Text>
                        </li>
                        <li>
                            <Text>Automatic generation can make mistakes. Always review and verify the final content.</Text>
                        </li>
                        <li>
                            <Text>Inaccuracies, inconsistencies, or unexpected results may occur in text, images, or translations.</Text>
                        </li>
                        <li>
                            <Text>Some results may sound correct at first but still contain wrong or unsuitable details.</Text>
                        </li>
                        <li>
                            <Text>It is crucial to verify all critical details: prices, ingredients, allergen information, visual representations in images, and the contextual accuracy of translations.</Text>
                        </li>
                        <li>
                            <Text>Do not rely on generated responses as medical, legal, financial, or other professional advice.</Text>
                        </li>
                    </ul>

                    <Paragraph style={{ marginBottom: 0 }}>
                        Review, edit, and validate every generated result before publishing so the final version matches your business accurately.
                    </Paragraph>
                </Space>
            }
        />
    );
};

export default AiDisclaimerAlert;
