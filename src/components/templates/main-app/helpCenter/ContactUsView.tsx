import { Typography } from 'antd';
import { useTranslations } from 'next-intl';

const { Title, Paragraph } = Typography;

const ContactUsView = () => {
    const t = useTranslations('HelpCenter');
    return (
        <Paragraph>
            {t.rich('contactUsContent', {
                email: (chunks) => <a href="mailto:partners@menulist.ai">partners@menulist.ai</a>,
            })}
        </Paragraph>
    );
};

export default ContactUsView;
