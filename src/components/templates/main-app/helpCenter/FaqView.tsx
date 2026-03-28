import { Collapse, Typography } from 'antd';
import { useTranslations } from 'next-intl';

const { Panel } = Collapse;
const { Text } = Typography;

const FaqView = () => {
    const t = useTranslations('HelpCenter');

    const faqs = [
        { key: '1', question: t('faqUpgrade'), answer: t('faqUpgradeAnswer') },
        { key: '2', question: t('faqFormats'), answer: t('faqFormatsAnswer') },
        { key: '3', question: t('faqProcessing'), answer: t('faqProcessingAnswer') },
        { key: '4', question: t('faqEdit'), answer: t('faqEditAnswer') },
    ];

    return (
        <Collapse accordion>
            {faqs.map(faq => (
                <Panel header={faq.question} key={faq.key}>
                    <Text>{faq.answer}</Text>
                </Panel>
            ))}
        </Collapse>
    );
};

export default FaqView;
