import TextElement from '@antdComponent/textElement'
import MandatoryField from '@atoms/mandatoryField'
import { Flex } from 'antd'
import type { ReactNode } from 'react'

interface FormElementWrapperProps {
    children: ReactNode;
    direction?: 'column' | 'row';
    label?: string;
    mandatory?: boolean;
}

function FormElementWrapper({ children, label = '', direction = 'row', mandatory = false }: FormElementWrapperProps) {
    return (
        <Flex vertical={direction == 'column'}>
            {Boolean(label) && <Flex justify='flex-start' align='flex-start' gap={5} style={{ minWidth: 150 }}>
                <TextElement text={label} />
                {mandatory && <MandatoryField />}
            </Flex>}
            <Flex style={{ width: '100%' }}>
                {children}
            </Flex>
        </Flex>
    )
}

export default FormElementWrapper
