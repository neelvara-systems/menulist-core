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
    return (
        <div style={{
            maxWidth: fromPage === "b2c"
                ? (activeDeviceType === 'mobile' ? 400 : activeDeviceType === 'tablet' ? 768 : '100%')
                : '100%',
            margin: '0 auto',
            width: '100%',
            height: fromPage === "b2c" ? 'calc(100dvh - 140px)' : 'auto',
            overflowY: fromPage === "b2c" ? 'auto' : 'visible',
            border: fromPage === "b2c" ? '2px solid lightgray' : 'unset',
            boxShadow: fromPage === "b2c" ? '0px 5px 10px #c1bbbbad' : 'unset',
            borderRadius: fromPage === "b2c" ? 20 : 0,
            transition: 'max-width 0.3s',
            position: 'relative',
            background: fromPage === "b2c" ? backgroundColor : 'unset',
            zIndex: 100,
        }}>
            {children}
        </div>
    )
}

export default DeviceFrame
