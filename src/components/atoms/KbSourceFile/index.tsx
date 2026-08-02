import { Button, Typography } from 'antd'
import FileIcon from '../FileIcon'

const { Text } = Typography

type KbSourceFileValue = { name: string; type: string } & (
    | { downloadURL: string; url?: string }
    | { downloadURL?: string; url: string }
);

function KbSourceFile({ file, onClickSource }: { file: KbSourceFileValue, onClickSource: (url: string) => void }) {
    const sourceUrl = file.downloadURL || file.url;
    if (!sourceUrl) return null;
    return (
        <Button
            block
            key={file.name}
            type="text"
            onClick={() => onClickSource(sourceUrl)} style={{ padding: 5 }}
        >
            <FileIcon fileType={file.type} />
            <Text style={{ marginRight: "auto" }}>{file.name || 'Source File'}</Text>
        </Button>
    )
}

export default KbSourceFile
