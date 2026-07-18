import {
    formatDateTime,
    toDate,
    type DateLike,
} from "@util/dateTime";
import { timeAgo } from "@util/dateTime/timeAgo";
import { Space, Typography } from "antd";
import { Timestamp } from "firebase/firestore";
import { useFormatter, useLocale } from "next-intl";
import React from "react";

const { Text } = Typography;

type DisplayMode = "date" | "time" | "datetime" | "fromnow";

interface GenericDateTimeDisplayProps {
    value?: DateLike;
    mode?: DisplayMode; // default 'date'
    label?: string;
    style?: React.CSSProperties;
    fallback?: string;
}

const DateTimeDisplay: React.FC<GenericDateTimeDisplayProps> = ({ value, mode = "date", label, style, fallback = "" }) => {
    const formatter = useFormatter();
    const locale = useLocale();
    if (!value) return fallback ? <Text type="secondary" style={style}>{fallback}</Text> : null;

    // Normalize any date-like value into a plain JS Date
    const dateObj = toDate(value as any);

    // Pick correct formatter
    let displayValue: string | null = null;
    switch (mode) {
        case "datetime":
            displayValue = formatDateTime(dateObj, "datetime", formatter);
            break;
        case "time":
            displayValue = formatDateTime(dateObj, "time", formatter);
            break;
        case "fromnow":
            displayValue = timeAgo(dateObj, locale);
            break;
        case "date":
        default:
            displayValue = formatDateTime(dateObj, "date", formatter);
            break;
    }

    return (
        <>
            {Boolean(label) ?
                <Space style={style}>
                    <Text type="secondary">{label}:</Text>
                    <Text type="secondary">{displayValue}</Text>
                </Space> : <Text type="secondary" style={style}>{displayValue}</Text>}
        </>
    );
};

export default DateTimeDisplay;
