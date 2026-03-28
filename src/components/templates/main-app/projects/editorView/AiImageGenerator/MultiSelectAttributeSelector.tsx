import { InfoCircleOutlined } from '@ant-design/icons';
import { Button, Flex, Select, theme, Tooltip, Typography } from 'antd';
import React from 'react';

interface MultiSelectAttributeSelectorProps {
  label: string;
  tooltip?: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  multi?: boolean; // If false, single-select (radio); if true or undefined, multi-select (checkbox)
  displayMode?: 'select' | 'chips'; // New prop to control UI style
}

// UX-14: Visual preview examples for each attribute type
const ATTRIBUTE_EXAMPLES: Record<string, Record<string, string>> = {
  'Setting': {
    'Rustic Kitchen': '🪵 Wooden surfaces, warm tones',
    'Modern Kitchen': '✨ Clean lines, stainless steel',
    'Outdoor Cafe': '☀️ Natural light, greenery',
    'Fine Dining': '🍷 Elegant, dim lighting',
    'Street Food': '🌆 Urban, vibrant energy',
    'Home Kitchen': '🏠 Cozy, homey feel',
  },
  'Lighting': {
    'Natural Light': '☀️ Soft, daylight feel',
    'Warm Light': '🔥 Cozy, golden tones',
    'Cool Light': '❄️ Clean, blue tones',
    'Dramatic': '🎭 High contrast, shadows',
    'Soft': '☁️ Even, no harsh shadows',
  },
  'Mood': {
    'Appetizing': '😋 Makes you hungry',
    'Cozy': '🛋️ Warm and inviting',
    'Fresh': '🌿 Light and healthy',
    'Luxurious': '💎 Premium and elegant',
    'Playful': '🎉 Fun and energetic',
  },
  'Camera Angle': {
    '45 Degree': '📐 Classic food angle',
    'Overhead': '⬇️ Top-down flat lay',
    'Eye Level': '👁️ Straight on view',
    'Close Up': '🔍 Detail focused',
  },
};

const MultiSelectAttributeSelector: React.FC<MultiSelectAttributeSelectorProps> = ({ label, tooltip, options, selected, onChange, multi = false, displayMode = 'chips' }) => {
  const { token } = theme.useToken();
  return (
    <Flex vertical gap={8} style={{ width: '100%' }}>
      <Flex align="center" gap={4}>
        <Typography.Text type='secondary' italic style={{ fontSize: 12 }}>{label}</Typography.Text>
        {tooltip && (
          <Tooltip title={tooltip}>
            <InfoCircleOutlined style={{ color: '#888' }} />
          </Tooltip>
        )}
      </Flex>
      {displayMode === 'chips' ? (
        <Flex wrap="wrap" gap={8}>
          {options.map(option => {
            const isSelected = selected.includes(option);
            return (
              <Tooltip
                key={option}
                title={ATTRIBUTE_EXAMPLES[label]?.[option] || option}
                placement="top"
              >
                <Button
                  type={isSelected ? 'primary' : 'default'}
                  shape='round'
                  style={{ minWidth: "max-content", boxShadow: isSelected ? token.boxShadowTertiary : undefined }}
                  onClick={() => {
                    if (multi) {
                      const newSelected = isSelected
                        ? selected.filter(item => item !== option)
                        : [...selected, option];
                      onChange(newSelected);
                    } else {
                      // Single select mode (radio button like behavior)
                      onChange(isSelected ? [] : [option]);
                    }
                  }}
                >
                  {option}
                </Button>
              </Tooltip>
            );
          })}
        </Flex>
      ) : (
        <Select
          mode={multi ? "multiple" : undefined}
          style={{ width: '100%' }}
          placeholder={`Select ${label.toLowerCase()}`}
          value={selected}
          onChange={onChange}
          options={options.map(option => ({
            label: option,
            value: option,
          }))}
          allowClear
        />
      )}
    </Flex>
  );
};

export default MultiSelectAttributeSelector;
