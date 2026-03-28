import { Checkbox } from 'antd'

type CheckboxElementPropsType = {
    active: boolean,
    onChange: any,
    label: any
}

function CheckboxElement({ active = false, onChange = () => { }, label = '' }: CheckboxElementPropsType) {
    return (
        <Checkbox defaultChecked={active} checked={active} onChange={onChange}>
            {label}
        </Checkbox>
    )
}

export default CheckboxElement