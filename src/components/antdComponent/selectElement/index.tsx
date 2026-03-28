import { Select } from 'antd'

function SelectElement({ value, styles = {}, onChange, options, isBordered = true }) {
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