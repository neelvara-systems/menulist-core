import { DownOutlined } from '@ant-design/icons';
import { Checkbox, Dropdown, Input, Space } from 'antd';
import React, { useState } from 'react';

export interface Option {
    label: string;
    value: string;
}

interface MultiSelectPickerProps {
    options: Option[];
    value: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
    width?: number;
    maxHeight?: number;
    searchPlaceholder?: string;
}

const MultiSelectPicker: React.FC<MultiSelectPickerProps> = ({
    options,
    value = [],
    onChange,
    placeholder = 'Select items',
    width = "100%",
    maxHeight = 300,
    searchPlaceholder = 'Search...'
}) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchText, setSearchText] = useState('');

    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(searchText.toLowerCase())
    );

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            onChange(options.map(option => option.value));
        } else {
            onChange([]);
        }
    };

    const getSelectedLabels = () => {
        const selectedLabels = value.map(v => options.find(opt => opt.value === v)?.label || '');
        const maxDisplay = 4;

        if (selectedLabels.length === 0) {
            return <span style={{ color: '#00000073' }}>{placeholder}</span>;
        }

        return (
            <Space size={4} align='start'>
                {selectedLabels.slice(0, maxDisplay).map((label, index) => (
                    <span
                        key={index}
                        style={{
                            margin: 0,
                            maxWidth: '150px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {label},
                    </span>
                ))}
                {selectedLabels.length > maxDisplay && (
                    <span>+{selectedLabels.length - maxDisplay}</span>
                )}
            </Space>
        );
    };

    return (
        <Dropdown
            open={dropdownOpen}
            onOpenChange={setDropdownOpen}
            trigger={['click']}
            dropdownRender={() => (
                <div style={{
                    background: 'white',
                    padding: '8px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    width: width
                }}>
                    <Input
                        placeholder={searchPlaceholder}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ marginBottom: '8px' }}
                    />
                    <div style={{
                        maxHeight: maxHeight,
                        overflowY: 'auto',
                        padding: '4px'
                    }}>
                        <Checkbox
                            indeterminate={value.length > 0 && value.length < options.length}
                            checked={value.length === options.length && options.length > 0}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            style={{
                                padding: '8px 12px',
                                borderBottom: '1px solid #f0f0f0',
                                width: '100%',
                                fontWeight: 'bold'
                            }}
                        >
                            Select All
                        </Checkbox>
                        <Checkbox.Group
                            value={value}
                            onChange={(values) => onChange(values as string[])}
                            style={{ width: '100%' }}
                        >
                            <Space direction="vertical" style={{ width: '100%' }}>
                                {filteredOptions.map(option => (
                                    <Checkbox
                                        key={option.value}
                                        value={option.value}
                                        style={{
                                            padding: '8px 12px',
                                            width: '100%'
                                        }}
                                    >
                                        {option.label}
                                    </Checkbox>
                                ))}
                            </Space>
                        </Checkbox.Group>
                    </div>
                </div>
            )}
        >
            <div
                style={{
                    width: '100%',
                    background: '#fff',
                    border: `1px solid ${dropdownOpen ? '#4096ff' : '#d9d9d9'}`,
                    borderRadius: '4px',
                    padding: '8px 12px',
                    maxHeight: 32,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: dropdownOpen ? '0 0 0 2px rgba(64,150,255,0.1)' : 'none',
                }}
                onClick={() => setDropdownOpen(!dropdownOpen)}
            >
                <div style={{
                    flex: 1,
                    overflow: 'hidden',
                    color: value.length === 0 ? '#00000073' : '#000000d9'
                }}>
                    {getSelectedLabels()}
                </div>
                <DownOutlined
                    style={{
                        fontSize: '12px',
                        color: dropdownOpen ? '#4096ff' : '#8c8c8c',
                        transition: 'all 0.3s ease',
                        transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}
                />
            </div>
        </Dropdown>
    );
};

export default MultiSelectPicker;