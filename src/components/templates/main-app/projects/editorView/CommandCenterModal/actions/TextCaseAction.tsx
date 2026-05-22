import { Card, Flex, Radio, Switch, Typography, theme } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import type { Project } from '../../../types';
import {
    getTextCasePreview,
    type TextCaseConfig,
    type TextCaseMode,
    type TextCasePreview,
} from '../../textCase.shared';

const { Text } = Typography;

const CASE_OPTIONS: Array<{ value: TextCaseMode; label: string; description: string }> = [
    { value: 'title', label: 'Title Case', description: 'Chicken Tikka Masala' },
    { value: 'sentence', label: 'Sentence case', description: 'Chicken tikka masala' },
    { value: 'lower', label: 'lowercase', description: 'chicken tikka masala' },
    { value: 'upper', label: 'UPPERCASE', description: 'CHICKEN TIKKA MASALA' },
];

interface TextCaseActionProps {
    onConfigReady: (config: TextCaseConfig | null) => void;
    onPreviewChange: (preview: TextCasePreview | null) => void;
    projectData: Project;
}

export default function TextCaseAction({
    onConfigReady,
    onPreviewChange,
    projectData,
}: TextCaseActionProps) {
    const { token } = theme.useToken();
    const [caseMode, setCaseMode] = useState<TextCaseMode>('title');
    const [applyToCategories, setApplyToCategories] = useState(true);
    const [applyToItems, setApplyToItems] = useState(true);
    const [applyToDescriptions, setApplyToDescriptions] = useState(false);
    const [applyToAttributes, setApplyToAttributes] = useState(true);

    const config = useMemo<TextCaseConfig | null>(() => {
        if (!applyToCategories && !applyToItems && !applyToDescriptions && !applyToAttributes) {
            return null;
        }

        return {
            applyToAttributes,
            applyToCategories,
            applyToDescriptions,
            applyToItems,
            mode: caseMode,
        };
    }, [applyToAttributes, applyToCategories, applyToDescriptions, applyToItems, caseMode]);

    const preview = useMemo(
        () => config ? getTextCasePreview(projectData, config) : null,
        [config, projectData]
    );

    useEffect(() => {
        onConfigReady(config);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config]);

    useEffect(() => {
        onPreviewChange(preview);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preview]);

    return (
        <Flex vertical gap={12}>
            <Card size="small" style={{ borderColor: token.colorBorderSecondary }}>
                <Flex gap={10} vertical>
                    <Text strong>Choose text style</Text>
                    <Radio.Group
                        onChange={(event) => setCaseMode(event.target.value)}
                        value={caseMode}
                    >
                        <Flex gap={8} vertical>
                            {CASE_OPTIONS.map((option) => (
                                <Radio key={option.value} value={option.value}>
                                    <Flex gap={2} vertical>
                                        <Text>{option.label}</Text>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            {option.description}
                                        </Text>
                                    </Flex>
                                </Radio>
                            ))}
                        </Flex>
                    </Radio.Group>
                </Flex>
            </Card>

            <Card size="small" style={{ borderColor: token.colorBorderSecondary }}>
                <Flex gap={10} vertical>
                    <Text strong>Apply to</Text>
                    {[
                        { checked: applyToCategories, label: 'Category names', onChange: setApplyToCategories },
                        { checked: applyToItems, label: 'Item names', onChange: setApplyToItems },
                        { checked: applyToAttributes, label: 'Attribute names', onChange: setApplyToAttributes },
                        { checked: applyToDescriptions, label: 'Descriptions', onChange: setApplyToDescriptions },
                    ].map((entry) => (
                        <Flex align="center" justify="space-between" key={entry.label}>
                            <Text>{entry.label}</Text>
                            <Switch checked={entry.checked} onChange={entry.onChange} />
                        </Flex>
                    ))}
                </Flex>
            </Card>

            <Text type="secondary" style={{ fontSize: 12 }}>
                {preview?.totalFields
                    ? `${preview.totalFields.toLocaleString()} text values will be updated.`
                    : 'No matching text values found for the selected areas.'}
            </Text>
        </Flex>
    );
}
