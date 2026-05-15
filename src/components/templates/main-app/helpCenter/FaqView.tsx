import { Collapse, Typography } from 'antd';
import { useTranslations } from 'next-intl';

const { Text } = Typography;

const FaqView = () => {
    const t = useTranslations('HelpCenter');

    const faqs = [
        { key: '1', label: t('faqUpgrade'), children: <Text>{t('faqUpgradeAnswer')}</Text> },
        { key: '2', label: t('faqFormats'), children: <Text>{t('faqFormatsAnswer')}</Text> },
        { key: '3', label: t('faqProcessing'), children: <Text>{t('faqProcessingAnswer')}</Text> },
        { key: '4', label: t('faqEdit'), children: <Text>{t('faqEditAnswer')}</Text> },
    ];

    return (
        <Collapse accordion items={faqs} />
    );
};

export default FaqView;
