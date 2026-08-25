import { DEVICE_TYPES_LIST } from "@constant/builder";
import { ProjectsDataContext, ProjectsDataProviderType } from "@providers/projectsDataProvider";
import { Button, Flex, Tooltip } from "antd";
import { useContext } from "react";
import { LuArrowLeft, LuMonitor, LuRectangleVertical, LuTablet } from "react-icons/lu";
import { DeviceTypes } from "./types";

interface HeaderProps {
    activeDeviceType: DeviceTypes;
    setActiveDeviceType: (type: DeviceTypes) => void;
}

export default function B2CViewHeader({ activeDeviceType, setActiveDeviceType }: HeaderProps) {

    const { currentView, setCurrentView } = useContext<ProjectsDataProviderType>(ProjectsDataContext)
    return (
        <>
            <Tooltip title="Back to Editor">
                <Button
                    style={{
                        position: 'absolute',
                        top: 5,
                        left: 5,
                        zIndex: 11
                    }}
                    icon={<LuArrowLeft />}
                    onClick={() => setCurrentView(currentView - 1)}
                    shape="circle"
                />
            </Tooltip>

            <Flex gap={8} wrap="wrap" align="center"
                style={{
                    zIndex: 12,
                    position: "fixed",
                    width: "max-content",
                    right: '57%',
                    transform: 'translateX(50%)',
                    top: 10
                }}>
                <Tooltip title="Desktop View">
                    <Button
                        aria-label="Desktop view"
                        aria-pressed={activeDeviceType === DEVICE_TYPES_LIST.DESKTOP}
                        type={activeDeviceType === DEVICE_TYPES_LIST.DESKTOP ? 'primary' : 'default'}
                        onClick={() => setActiveDeviceType(DEVICE_TYPES_LIST.DESKTOP)}
                        icon={<LuMonitor />}
                        shape="circle"
                    />
                </Tooltip>
                <Tooltip title="Tablet View">
                    <Button
                        aria-label="Tablet view"
                        aria-pressed={activeDeviceType === DEVICE_TYPES_LIST.TABLET}
                        type={activeDeviceType === DEVICE_TYPES_LIST.TABLET ? 'primary' : 'default'}
                        onClick={() => setActiveDeviceType(DEVICE_TYPES_LIST.TABLET)}
                        icon={<LuTablet />}
                        shape="circle"
                    />
                </Tooltip>
                <Tooltip title="Mobile View">
                    <Button
                        aria-label="Mobile view"
                        aria-pressed={activeDeviceType === DEVICE_TYPES_LIST.MOBILE}
                        type={activeDeviceType === DEVICE_TYPES_LIST.MOBILE ? 'primary' : 'default'}
                        onClick={() => setActiveDeviceType(DEVICE_TYPES_LIST.MOBILE)}
                        icon={<LuRectangleVertical />}
                        shape="circle"
                    />
                </Tooltip>
            </Flex>

        </>
    );
}
