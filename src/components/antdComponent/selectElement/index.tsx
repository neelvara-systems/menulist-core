import { Select } from 'antd'
import type { SelectProps } from 'antd'
import type { CSSProperties } from 'react'

interface SelectElementProps<ValueType> {
    isBordered?: boolean;
    onChange?: SelectProps<ValueType>['onChange'];
    options?: SelectProps<ValueType>['options'];
    styles?: CSSProperties;
    value?: ValueType;
}

function SelectElement<ValueType>({
    value,
    styles = {},
    onChange,
    options,
    isBordered = true,
}: SelectElementProps<ValueType>) {
    return (
        <Select
            defaultValue={value}
            value={value}
            variant={isBordered ? 'outlined' : 'filled'}
            style={{ width: "100%", ...styles }}
            onChange={onChange}
            options={options}
        />
    )
}

export default SelectElement
