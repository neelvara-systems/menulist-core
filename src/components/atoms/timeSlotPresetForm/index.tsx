import { antdTagsColorCodes } from '@data/common';
import { getClockTimeInputFormat } from '@util/dateTime';
import { Flex, Input, TimePicker, Typography } from 'antd';
import dayjs from 'dayjs';
import { LuCheck } from 'react-icons/lu';

const { Text } = Typography;

// Use Ant Design tag colors for consistency
export const DEFAULT_PRESET_COLORS = Object.values(antdTagsColorCodes).map(c => c.color);

export interface TimeSlotFormData {
    label: string;
    startTime: string;
    endTime: string;
    color: string;
}

interface TimeSlotPresetFormProps {
    formData: TimeSlotFormData;
    onChange: (data: TimeSlotFormData) => void;
    compact?: boolean;
    showLabels?: boolean;
    showCharCount?: boolean;
}

const TimeSlotPresetForm: React.FC<TimeSlotPresetFormProps> = ({
    formData,
    onChange,
    compact = false,
    showLabels = true,
    showCharCount = false
}) => {
    const timePickerFormat = getClockTimeInputFormat();

    const handleChange = (field: keyof TimeSlotFormData, value: string) => {
        onChange({ ...formData, [field]: value });
    };

    if (compact) {
        return (
            <Flex vertical gap={12}>
                <Input
                    placeholder="Label (e.g., Breakfast)"
                    value={formData.label}
                    onChange={e => handleChange('label', e.target.value)}
                    maxLength={20}
                />
                <Flex gap={8}>
                    <TimePicker
                        format={timePickerFormat}
                        minuteStep={15}
                        value={dayjs(formData.startTime, 'HH:mm')}
                        onChange={t => handleChange('startTime', t?.format('HH:mm') || '09:00')}
                        placeholder="Start"
                        style={{ flex: 1 }}
                    />
                    <TimePicker
                        format={timePickerFormat}
                        minuteStep={15}
                        value={dayjs(formData.endTime, 'HH:mm')}
                        onChange={t => handleChange('endTime', t?.format('HH:mm') || '17:00')}
                        placeholder="End"
                        style={{ flex: 1 }}
                    />
                </Flex>
                <Flex gap={6} wrap="wrap">
                    {DEFAULT_PRESET_COLORS.map(color => (
                        <div
                            key={color}
                            onClick={() => handleChange('color', color)}
                            style={{
                                width: 20,
                                height: 20,
                                borderRadius: 4,
                                background: color,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: formData.color === color ? '2px solid #333' : '1px solid rgba(0,0,0,0.1)'
                            }}
                        >
                            {formData.color === color && <LuCheck size={12} color="#fff" />}
                        </div>
                    ))}
                </Flex>
            </Flex>
        );
    }

    return (
        <Flex vertical gap={16}>
            <div>
                {showLabels && <Text strong style={{ display: 'block', marginBottom: 8 }}>Label *</Text>}
                <Input
                    placeholder="e.g., Breakfast, Lunch, Peak Hours"
                    value={formData.label}
                    onChange={e => handleChange('label', e.target.value)}
                    maxLength={30}
                    showCount={showCharCount}
                />
            </div>

            <Flex gap={16}>
                <div style={{ flex: 1 }}>
                    {showLabels && <Text strong style={{ display: 'block', marginBottom: 8 }}>Start Time *</Text>}
                    <TimePicker
                        format={timePickerFormat}
                        minuteStep={15}
                        value={dayjs(formData.startTime, 'HH:mm')}
                        onChange={time => handleChange('startTime', time?.format('HH:mm') || '09:00')}
                        style={{ width: '100%' }}
                    />
                </div>
                <div style={{ flex: 1 }}>
                    {showLabels && <Text strong style={{ display: 'block', marginBottom: 8 }}>End Time *</Text>}
                    <TimePicker
                        format={timePickerFormat}
                        minuteStep={15}
                        value={dayjs(formData.endTime, 'HH:mm')}
                        onChange={time => handleChange('endTime', time?.format('HH:mm') || '17:00')}
                        style={{ width: '100%' }}
                    />
                </div>
            </Flex>

            <div>
                {showLabels && <Text strong style={{ display: 'block', marginBottom: 8 }}>Color</Text>}
                <Flex gap={8} wrap="wrap">
                    {DEFAULT_PRESET_COLORS.map(color => (
                        <div
                            key={color}
                            onClick={() => handleChange('color', color)}
                            style={{
                                width: 24,
                                height: 24,
                                borderRadius: 4,
                                background: color,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: formData.color === color ? '2px solid #333' : '1px solid rgba(0,0,0,0.1)'
                            }}
                        >
                            {formData.color === color && <LuCheck size={14} color="#fff" />}
                        </div>
                    ))}
                </Flex>
            </div>
        </Flex>
    );
};

export default TimeSlotPresetForm;
