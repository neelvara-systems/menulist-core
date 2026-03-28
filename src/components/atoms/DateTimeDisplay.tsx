import {
    getFormatedDate,
    getFormatedDateAndTime,
    getFormatedTime,
    toDate,
} from "@util/dateTime";
import { timeAgo } from "@util/dateTime/timeAgo";
import { Space, Typography } from "antd";
import { Timestamp } from "firebase/firestore";
import { useFormatter } from "next-intl";
import React from "react";

const { Text } = Typography;

type DisplayMode = "date" | "time" | "datetime" | "fromnow";

interface GenericDateTimeDisplayProps {
    value?: Timestamp | Date | string | null;
    mode?: DisplayMode; // default 'date'
    label?: string;
    style?: React.CSSProperties;
}

const DateTimeDisplay: React.FC<GenericDateTimeDisplayProps> = ({ value, mode = "date", label, style }) => {
    const formatter = useFormatter();
    if (!value) return null;

    // Normalize any date-like value into a plain JS Date
    const dateObj = toDate(value as any);

    // Pick correct formatter
    let displayValue: string | null = null;
    switch (mode) {
        case "datetime":
            displayValue = getFormatedDateAndTime(formatter, dateObj);
            break;
        case "time":
            displayValue = getFormatedTime(formatter, dateObj);
            break;
        case "fromnow":
            displayValue = timeAgo(dateObj);
            break;
        case "date":
        default:
            displayValue = getFormatedDate(formatter, dateObj);
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
