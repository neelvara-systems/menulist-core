import { FILE_TYPE, IngestionJobSourceFile } from '@type/knowledgeBase';
import { Flex } from 'antd';
import React from 'react';
import {
    LuClipboard,
    LuFile, LuFileAudio, LuFileImage, LuFileText, LuFileType, LuFileVideo, LuYoutube
} from 'react-icons/lu';

interface FileIconProps {
    fileType: IngestionJobSourceFile['type'];
}

const FileIcon: React.FC<FileIconProps> = ({ fileType }) => {
    let icon: React.ReactNode;

    switch (fileType) {
        case FILE_TYPE.IMAGE:
            icon = <LuFileImage fontSize={22} color='#F59E0B' />;
            break;
        case FILE_TYPE.PDF:
            icon = <LuFileType fontSize={22} color='#EF4444' />;
            break;
        case FILE_TYPE.DOCUMENT:
            icon = <LuFileText fontSize={22} color='#3B82F6' />;
            break;
        case FILE_TYPE.COPIED_TEXT:
            icon = <LuClipboard fontSize={22} color='#3B82F6' />;
            break;
        case FILE_TYPE.VIDEO:
            icon = <LuFileVideo fontSize={22} color='#8B5CF6' />;
            break;
        case FILE_TYPE.AUDIO:
            icon = <LuFileAudio fontSize={22} color='#EC4899' />;
            break;
        case FILE_TYPE.YOUTUBE:
            icon = <LuYoutube fontSize={22} color='#EF4444' />;
            break;
        default:
            icon = <LuFile fontSize={22} color='#F59E0B' />;
    }

    return <Flex align="center" justify='center' style={{ marginRight: 8 }} >
        {icon}
    </Flex>;
};

export default FileIcon;
