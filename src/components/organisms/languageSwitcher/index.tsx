import { APP_LANGUAGES } from "@constant/common";
import { setUserLocale } from "@lib/localization";
import { defaultLocale, Locale } from "@lib/localization/config";
import { Flex, Select, Typography } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
const { Text } = Typography;

function LanguageSwitcher() {

    const t = useTranslations('Settings');
    const locale = useLocale();
    const [isPending, startTransition] = useTransition();

    const onChangeLocale = (value: string) => {
        const locale = value as Locale;
        startTransition(() => {
            setUserLocale(locale);
        });
    }

    return (
        <Flex gap={10} vertical>
            <Text strong>{t('language')}</Text>
            <Select
                placeholder={t('selectLanguage')}
                optionFilterProp="label"
                showSearch
                loading={isPending}
                defaultValue={defaultLocale}
                value={locale}
                style={{ width: "100%" }}
                onChange={(value) => onChangeLocale(value)}
                optionLabelProp="label"
                options={APP_LANGUAGES}
            />
        </Flex>
    )
}

export default LanguageSwitcher