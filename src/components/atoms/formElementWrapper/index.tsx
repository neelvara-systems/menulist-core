import TextElement from '@antdComponent/textElement'
import MandatoryField from '@atoms/mandatoryField'
import { Flex } from 'antd'

function FormElementWrapper({ children, label = '', direction = 'row', mandatory = false }) {
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