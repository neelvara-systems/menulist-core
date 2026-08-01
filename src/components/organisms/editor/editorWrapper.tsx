import { Flex } from 'antd'
import type { ReactNode } from 'react';

function EditorWrapper({ children, gap = 10 }: { children: ReactNode; gap?: number }) {

    return (

        <Flex vertical gap={gap} style={{ width: "100%" }} className='animate__animated animate__fadeIn animate__faster'>
            {children}
        </Flex>
    )
}

export default EditorWrapper
