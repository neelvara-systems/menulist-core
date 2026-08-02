import { Checkbox } from 'antd';
import type { CheckboxProps } from 'antd';
import type { ReactNode } from 'react';

type CheckboxElementPropsType = {
    active?: boolean;
    onChange?: CheckboxProps['onChange'];
    label?: ReactNode;
};

function CheckboxElement({ active = false, onChange, label = '' }: CheckboxElementPropsType) {
    return (
        <Checkbox checked={active} onChange={onChange}>
            {label}
        </Checkbox>
    );
}

export default CheckboxElement;
