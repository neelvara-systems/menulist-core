import { Button, Card, Divider, Flex, Space, TimePicker, Typography } from 'antd';
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
    return (
        <Card size='small' ref={scrollRef}>
            <Title level={5} style={{ margin: "unset" }}>{t('workingHours')}</Title>
            <Space style={{ float: 'right', marginTop: '-28px' }}>
                <Button
                    type="link"
                    onClick={() => {
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
                    }}
                >
                    {t('clearAll')}
                </Button>
            </Space>
            <Divider />

            <div style={{ marginBottom: 24 }}>
                <Text style={{ width: '100%', display: 'block', marginBottom: 16 }}>
                    {t('workingHoursDesc')}
                </Text>
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
                                setWorkingHours(newHours);

                                const formattedHours = newHours.reduce((acc, curr) => {
                                    if (curr.start && curr.end) {
                                        acc[curr.day] = `${curr.start.format('HH:mm')}-${curr.end.format('HH:mm')}`;
                                    }
                                    return acc;
                                }, {} as Record<string, string>);
                                form.setFieldValue('workingHours', formattedHours);
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
