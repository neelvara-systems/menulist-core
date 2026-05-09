import { DEVICE_TYPES_LIST } from '@constant/builder';
import MainContentRenderer from '@template/website/mainContentRenderer';
import { StoreDataType } from '@type/platform/store';
import { Button, Flex, Modal, Tooltip } from 'antd';
import { useEffect, useState } from 'react';
import { LuMonitor, LuRectangleVertical, LuTablet } from 'react-icons/lu';
import { DeviceTypes, PageType } from './types';

interface PreviewModalProps {
    projectData: any;
    storeDetails: StoreDataType;
    previewModalOpen: boolean;
    setPreviewModalOpen: (open: boolean) => void;
    editorActivePage?: PageType;
    activeLanguage: string;
    setActiveLanguage: (language: string) => void;
}

function PreviewModal({ projectData, storeDetails, previewModalOpen, setPreviewModalOpen, editorActivePage, activeLanguage, setActiveLanguage }: PreviewModalProps) {
    const [activeDeviceType, setActiveDeviceType] = useState<DeviceTypes>('mobile');
    const [activePage, setActivePage] = useState<PageType>(editorActivePage || PageType.MENU);

    useEffect(() => {
        if (previewModalOpen) {
            setActivePage(editorActivePage || PageType.MENU);
        }
    }, [editorActivePage, previewModalOpen]);

    return (
        <Modal
            title={<Flex style={{ width: "100%", justifyContent: "center" }}>
                <Flex gap={8} wrap="wrap" align="center"
                    style={{
                        zIndex: 12,
                        width: "max-content",
                        top: 10
                    }}>
                    <Tooltip title="Desktop View">
                        <Button
                            type={activeDeviceType === DEVICE_TYPES_LIST.DESKTOP ? 'primary' : 'default'}
                            onClick={() => setActiveDeviceType(DEVICE_TYPES_LIST.DESKTOP)}
                            icon={<LuMonitor />}
                            shape="circle"
                        />
                    </Tooltip>
                    <Tooltip title="Tablet View">
                        <Button
                            type={activeDeviceType === DEVICE_TYPES_LIST.TABLET ? 'primary' : 'default'}
                            onClick={() => setActiveDeviceType(DEVICE_TYPES_LIST.TABLET)}
                            icon={<LuTablet />}
                            shape="circle"
                        />
                    </Tooltip>
                    <Tooltip title="Mobile View">
                        <Button
                            type={activeDeviceType === DEVICE_TYPES_LIST.MOBILE ? 'primary' : 'default'}
                            onClick={() => setActiveDeviceType(DEVICE_TYPES_LIST.MOBILE)}
                            icon={<LuRectangleVertical />}
                            shape="circle"
                        />
                    </Tooltip>
                </Flex>

            </Flex>}
            open={previewModalOpen}
            onCancel={() => setPreviewModalOpen(false)}
            footer={null}
            width="100%"
            style={{ top: 20, maxWidth: '100%', margin: 0, padding: 0 }}
            styles={{ body: { height: 'calc(100vh - 110px)', padding: 0, overflow: 'auto' } }}
        >
            <MainContentRenderer
                fromPage="b2c"
                activeDeviceType={activeDeviceType}
                projectData={projectData}
                storeDetails={storeDetails}
                activePage={activePage}
                setActivePage={setActivePage}
                activeLanguage={activeLanguage}
                setActiveLanguage={setActiveLanguage}
                previewMode
            />
        </Modal>
    )
}

export default PreviewModal
