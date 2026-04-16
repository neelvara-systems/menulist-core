import TIMEZONES_LIST from "@data/timeZones";
import { setUserTimezone } from "@lib/localization";
import { APP_TIMEZONE_COOKIES_KEY, defaultTimezone } from "@lib/localization/config";
import { getUTCDate } from "@util/dateTime";
import { Flex, Select, Typography } from "antd";
import { getCookie } from "cookies-next";
import { useFormatter, useTimeZone, useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
const { Text } = Typography;

function TimezoneSwitcher() {

    const t = useTranslations('Settings');
    const timezone = useTimeZone();
    const [currentTimezone, setCurrentTimezone] = useState<string>(() => {
        const tz = getCookie(APP_TIMEZONE_COOKIES_KEY);
        return (typeof tz === 'string' && tz) ? tz : (timezone || defaultTimezone);
    });
    const [isPending, startTransition] = useTransition();
    const format = useFormatter();

    useEffect(() => {
        const tz = getCookie(APP_TIMEZONE_COOKIES_KEY);
        if (typeof tz === 'string' && tz) {
            setCurrentTimezone(tz);
        }
    }, []);

    const onChange = (value: string) => {
        setCurrentTimezone(value);
        startTransition(() => {
            setUserTimezone(value);
        });
    }

    return (
        <Flex gap={10} vertical>
            <Text strong>{t('timezone')}   <Text>({format.dateTime(getUTCDate().newDate, "date")} {format.dateTime(getUTCDate().newDate, "time")})</Text></Text>
            <Select
                showSearch
                placeholder={t('selectTimezone')}
                optionFilterProp="label"
                loading={isPending}
                value={currentTimezone}
                style={{ width: "100%" }}
                onChange={(value) => onChange(value)}
                optionLabelProp="label"
                options={TIMEZONES_LIST.map((tz) => ({ label: tz.label, value: tz.tzCode }))}
            />

        </Flex>
    )
}

export default TimezoneSwitcher