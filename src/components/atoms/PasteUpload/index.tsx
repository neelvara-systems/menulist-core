import { Upload, UploadProps } from 'antd';
import React, { useEffect } from 'react';
import { LuUpload } from 'react-icons/lu';

const { Dragger } = Upload;

export interface PastedFile {
    uid: string;
    name: string;
    status: string;
    originFileObj: File;
    size: number;
    type: string;
}

interface PasteUploadProps extends UploadProps {
    onPaste: (files: PastedFile[]) => void;
    isPastingEnabled?: React.RefObject<boolean>;
}

const PasteUpload: React.FC<PasteUploadProps> = ({ onPaste, isPastingEnabled, ...props }) => {

    useEffect(() => {
        const handlePaste = (event: ClipboardEvent) => {
            if (!isPastingEnabled?.current) return;

            const items = event.clipboardData?.items;
            if (!items) return;

            const files: PastedFile[] = [];
            for (let i = 0; i < items.length; i++) {
                if (items[i].kind === 'file') {
                    const file = items[i].getAsFile();
                    if (file) {
                        const pastedFileData = {
                            uid: `pasted-${Date.now()}-${i}`,
                            name: file.name,
                            status: 'done',
                            originFileObj: file,
                            size: file.size,
                            type: file.type,
                        }
                        files.push(pastedFileData);
                    }
                }
            }

            if (files.length > 0) {
                event.preventDefault();
                event.stopPropagation();
                onPaste(files);
            }
        };

        document.addEventListener('paste', handlePaste);

        return () => {
            document.removeEventListener('paste', handlePaste);
        };
    }, [onPaste, isPastingEnabled]);

    return (
        <Dragger {...props}>
            <p className="ant-upload-drag-icon"><LuUpload fontSize={24} /></p>
            <p className="ant-upload-text">Click or drag file to this area to upload</p>
            <p className="ant-upload-hint">You can also paste images directly from your clipboard.</p>
            <p className="ant-upload-hint">You can upload up to 4 files at a time.</p>
        </Dragger>
    );
};

export default PasteUpload;
