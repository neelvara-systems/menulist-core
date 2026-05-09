import { DeviceTypes, PageType } from "./types";

interface DeviceFrameProps {
    children: React.ReactNode;
    activeDeviceType: DeviceTypes;
    backgroundColor?: string;
    fromPage?: string;
    activePage?: PageType;
}

function DeviceFrame({
    children,
    activeDeviceType,
    backgroundColor = '#18181b',
    fromPage = "b2c",
    activePage = PageType.OBP
}: DeviceFrameProps) {
    const isEditorPreview = fromPage === "b2c";
    const isEmbeddedMobilePreview = fromPage === "mobile-design-preview";
    const usesInternalScroll = isEditorPreview || isEmbeddedMobilePreview;

    return (
        <div style={{
            maxWidth: isEditorPreview
                ? (activeDeviceType === 'mobile' ? 400 : activeDeviceType === 'tablet' ? 768 : '100%')
                : '100%',
            margin: '0 auto',
            width: '100%',
            height: isEditorPreview ? 'calc(100dvh - 140px)' : isEmbeddedMobilePreview ? '100%' : 'auto',
            overflowY: usesInternalScroll ? 'auto' : 'visible',
            border: isEditorPreview ? '2px solid lightgray' : 'unset',
            boxShadow: isEditorPreview ? '0px 5px 10px #c1bbbbad' : 'unset',
            borderRadius: isEditorPreview ? 20 : 0,
            transition: 'max-width 0.3s',
            position: 'relative',
            background: usesInternalScroll ? backgroundColor : 'unset',
            zIndex: 100,
        }}>
            {children}
        </div>
    )
}

export default DeviceFrame
