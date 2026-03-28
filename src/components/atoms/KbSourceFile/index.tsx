import { Button, Typography } from 'antd'
import FileIcon from '../FileIcon'

const { Text } = Typography

function KbSourceFile({ file, onClickSource }: { file: any, onClickSource: (url: string) => void }) {
    return (
        <Button
            block
            key={file.name}
            type="text"
            onClick={() => onClickSource(file.downloadURL)} style={{ padding: 5 }}
        >
            <FileIcon fileType={file.type} />
            <Text style={{ marginRight: "auto" }}>{file.name || 'Source File'}</Text>
        </Button>
    )
}

export default KbSourceFile