import Saperator from "@atoms/Saperator";
import { useAppDispatch } from "@hook/useAppDispatch";
import { useAppSelector } from "@hook/useAppSelector";
import { getBreadcrumbLayoutState, getSidebarLayoutState, getSidebarState, toggleSidbar, toggleSidebarLayout } from "@reduxSlices/clientThemeConfig";
import { Flex, Radio, theme, Typography } from "antd";
import { LuLayoutPanelLeft, LuLayoutPanelTop, LuPanelLeftClose, LuPanelLeftOpen } from "react-icons/lu";

const { Text } = Typography;

function AppLayoutSwitcher() {

    const isVerticalSidebarLayout = useAppSelector(getSidebarLayoutState)
    const isVerticalBreadcrumbLayout = useAppSelector(getBreadcrumbLayoutState)
    const dispatch = useAppDispatch()
    const isCollapsed = useAppSelector(getSidebarState)
    const { token } = theme.useToken();

    return (
        <>
            <Flex vertical gap={10}>
                <Text strong>Dashboard Layout</Text>
                <Flex gap={10}>
                    <Radio.Group
                        value={isVerticalSidebarLayout ? "vertical" : "horizontal"}
                        onChange={(e) => dispatch(toggleSidebarLayout(e.target.value === "vertical"))}
                        style={{ width: '100%', display: 'flex' }}
                        buttonStyle="solid"
                    >
                        <Radio.Button
                            value="vertical"
                            style={{
                                flex: 1,
                                height: 40,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 14
                            }}
                        >
                            <Flex align="center" justify="center" gap={8}>
                                <LuLayoutPanelLeft size={18} />
                                <span>Vertical</span>
                            </Flex>
                        </Radio.Button>
                        <Radio.Button
                            value="horizontal"
                            style={{
                                flex: 1,
                                height: 40,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 14
                            }}
                        >
                            <Flex align="center" justify="center" gap={8}>
                                <LuLayoutPanelTop size={18} />
                                <span>Horizontal</span>
                            </Flex>
                        </Radio.Button>
                    </Radio.Group>
                </Flex>
            </Flex>
            <Saperator />
            {isVerticalSidebarLayout && <>
                <Flex vertical gap={10}>
                    <Text strong>Sidebar Layout</Text>
                    <Flex gap={10}>
                        <Radio.Group
                            value={isCollapsed ? "collapsed" : "expanded"}
                            onChange={(e) => dispatch(toggleSidbar(e.target.value === "collapsed"))}
                            style={{ width: '100%', display: 'flex' }}
                            buttonStyle="solid"
                        >
                            <Radio.Button
                                value="collapsed"
                                style={{
                                    flex: 1,
                                    height: 40,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 14
                                }}
                            >
                                <Flex align="center" justify="center" gap={8}>
                                    <LuPanelLeftClose size={18} />
                                    <span>Collapsed</span>
                                </Flex>
                            </Radio.Button>
                            <Radio.Button
                                value="expanded"
                                style={{
                                    flex: 1,
                                    height: 40,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 14
                                }}
                            >
                                <Flex align="center" justify="center" gap={8}>
                                    <LuPanelLeftOpen size={18} />
                                    <span>Expanded</span>
                                </Flex>
                            </Radio.Button>
                        </Radio.Group>
                    </Flex>
                </Flex>
                <Saperator />
            </>}
        </>
    )
}

export default AppLayoutSwitcher