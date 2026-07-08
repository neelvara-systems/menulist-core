import { Alert, Button, Card, Divider, Flex, Modal, Space, TimePicker, Typography } from 'antd';
import { FormInstance } from 'antd/lib';
import { getClockTimeInputFormat } from '@util/dateTime';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
const { Title, Text } = Typography;

interface WorkingHourSlot {
    day: string;
    start: dayjs.Dayjs | null;
    end: dayjs.Dayjs | null;
}

interface WorkingHoursTabProps {
    scrollRef?: React.RefObject<HTMLDivElement>;
    workingHours: WorkingHourSlot[];
    setWorkingHours: (hours: WorkingHourSlot[]) => void;
    form: FormInstance;
}

const WorkingHoursTab: React.FC<WorkingHoursTabProps> = ({ scrollRef, workingHours, setWorkingHours, form }) => {
    const t = useTranslations('BusinessSettings');
    const timePickerFormat = getClockTimeInputFormat();
    const persistWorkingHours = (nextHours: WorkingHourSlot[]) => {
        setWorkingHours(nextHours);

        const formattedHours = nextHours.reduce((acc, curr) => {
            if (curr.start && curr.end) {
                acc[curr.day] = `${curr.start.format('HH:mm')}-${curr.end.format('HH:mm')}`;
            }
            return acc;
        }, {} as Record<string, string>);
        form.setFieldValue('workingHours', formattedHours);
    };
    const mondayHours = workingHours.find((slot) => slot.day === 'mon' || slot.day.toLowerCase() === 'monday');
    const clearWeeklyHours = () => {
        Modal.confirm({
            title: 'Clear regular weekly hours?',
            content: 'Customers will not see regular opening hours after you save this change.',
            okText: 'Clear hours',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: () => {
                form.setFieldsValue({
                    workingHours: {
                        sun: null,
                        mon: null,
                        tue: null,
                        wed: null,
                        thu: null,
                        fri: null,
                        sat: null
                    }
                });
                setWorkingHours(workingHours.map(slot => ({ ...slot, start: null, end: null })));
            },
        });
    };
    const formatPreviewSlot = (slot: WorkingHourSlot) => (
        slot.start && slot.end
            ? `${slot.start.format(timePickerFormat)} - ${slot.end.format(timePickerFormat)}`
            : 'Closed'
    );

    return (
        <Card size='small' ref={scrollRef}>
            <Title level={5} style={{ margin: "unset" }}>Regular weekly hours</Title>
            <Space style={{ float: 'right', marginTop: '-28px' }}>
                <Button
                    type="link"
                    onClick={() => {
                        if (!mondayHours) return;
                        persistWorkingHours(workingHours.map(slot => ({
                            ...slot,
                            end: mondayHours.end,
                            start: mondayHours.start,
                        })));
                    }}
                >
                    Copy Monday to all days
                </Button>
                <Button
                    type="link"
                    onClick={clearWeeklyHours}
                >
                    {t('clearAll')}
                </Button>
            </Space>
            <Divider />

            <div style={{ marginBottom: 24 }}>
                <Alert
                    message="Customers see these as your normal weekly hours."
                    description="Use temporary status or special hours for one-day changes instead of changing the regular schedule."
                    showIcon
                    style={{ marginBottom: 16 }}
                    type="info"
                />
                <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, marginBottom: 16, padding: 12 }}>
                    <Flex gap={8} vertical>
                        <Text strong>Customer preview</Text>
                        <div style={{ display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                            {workingHours.map((slot) => (
                                <Flex key={`preview-${slot.day}`} justify="space-between" gap={8}>
                                    <Text type="secondary" style={{ textTransform: 'capitalize' }}>{slot.day}</Text>
                                    <Text>{formatPreviewSlot(slot)}</Text>
                                </Flex>
                            ))}
                        </div>
                    </Flex>
                </div>
                {workingHours.map((timeSlot, index) => (
                    <Flex key={timeSlot.day} align="center" gap={8} style={{ marginBottom: 16 }}>
                        <Text style={{ minWidth: 120, textTransform: 'capitalize' }}>{timeSlot.day}</Text>
                        <TimePicker.RangePicker
                            format={timePickerFormat}
                            placeholder={[t('startTime'), t('endTime')]}
                            value={timeSlot.start && timeSlot.end ? [timeSlot.start, timeSlot.end] : null}
                            onChange={(times) => {
                                const newHours = [...workingHours];
                                newHours[index] = {
                                    ...newHours[index],
                                    start: times?.[0] || null,
                                    end: times?.[1] || null
                                };
                                persistWorkingHours(newHours);
                            }}
                            style={{ width: 250 }}
                            minuteStep={15}
                            allowClear
                        />
                    </Flex>
                ))}
            </div>
        </Card>
    );
};

export default WorkingHoursTab;
