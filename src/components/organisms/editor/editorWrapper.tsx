import { Flex } from 'antd'

function EditorWrapper({ children, gap = 10 }) {

    return (

        <Flex vertical gap={gap} style={{ width: "100%" }} className='animate__animated animate__fadeIn animate__faster'>
            {children}
        </Flex>
    )
}

export default EditorWrapper