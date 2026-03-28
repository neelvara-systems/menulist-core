import TIMEZONES_LIST from "@data/timeZones";
import { setUserTimezone } from "@lib/localization";
import { defaultTimezone } from "@lib/localization/config";
import { getUTCDate } from "@util/dateTime";
import { Flex, Select, Typography } from "antd";
import { useFormatter, useTimeZone, useTranslations } from "next-intl";
import { useTransition } from "react";
const { Text } = Typography;

function TimezoneSwitcher() {

    const t = useTranslations('Settings');
    const timezone = useTimeZone();
    const [isPending, startTransition] = useTransition();
    const format = useFormatter();

    const onChange = (value: string) => {
        const tz = value as string;
        startTransition(() => {
            setUserTimezone(tz);
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
                defaultValue={defaultTimezone}
                value={timezone}
                style={{ width: "100%" }}
                onChange={(value) => onChange(value)}
                optionLabelProp="label"
                options={TIMEZONES_LIST.map((tz) => ({ label: tz.label, value: tz.tzCode }))}
            />

        </Flex>
    )
}

export default TimezoneSwitcher