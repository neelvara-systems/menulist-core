'use client'

import { getMobileUiLocaleText } from '@lib/localization/mobileUiLocale';
import {
    Avatar,
    Badge,
    Button as AntButton,
    Card as AntCard,
    Checkbox as AntCheckbox,
    Collapse as AntCollapse,
    Divider,
    Drawer,
    Empty as AntEmpty,
    Flex,
    FloatButton,
    Image,
    Input as AntInput,
    List as AntList,
    Modal,
    Progress,
    Result as AntResult,
    Select as AntSelect,
    Space as AntSpace,
    Spin,
    Switch as AntSwitch,
    Tabs as AntTabs,
    Tag as AntTag,
    theme,
    Typography,
    Upload as AntUpload,
    message,
} from 'antd';
import type { CSSProperties, MouseEvent, ReactElement, ReactNode } from 'react';
import { Children, Fragment, createContext, isValidElement, useContext, useEffect, useMemo, useState } from 'react';
import { LuArrowLeft, LuCheck, LuChevronRight, LuSearch, LuX } from 'react-icons/lu';
import { useLocale } from 'next-intl';

type AnyStyle = CSSProperties & Record<string, any>;

const { Text, Title } = Typography;
const MobileSheetContext = createContext(false);
let activePopupScrollLocks = 0;
let lockedShellScrollTop = 0;

function lockMobileBackgroundScroll() {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    if (activePopupScrollLocks === 0) {
        const shellScrollContainer = document.querySelector<HTMLElement>('[data-mobile-shell-scroll="true"]');
        lockedShellScrollTop = shellScrollContainer?.scrollTop || 0;

        document.documentElement.style.overflow = 'hidden';
        document.documentElement.style.overscrollBehavior = 'none';
        document.body.style.overflow = 'hidden';
        document.body.style.overscrollBehavior = 'none';

        if (shellScrollContainer) {
            shellScrollContainer.style.overflow = 'hidden';
            shellScrollContainer.style.overscrollBehavior = 'none';
            shellScrollContainer.style.touchAction = 'none';
        }
    }
    activePopupScrollLocks += 1;
}

function unlockMobileBackgroundScroll() {
    if (typeof document === 'undefined' || typeof window === 'undefined' || activePopupScrollLocks === 0) return;
    activePopupScrollLocks -= 1;
    if (activePopupScrollLocks === 0) {
        const shellScrollContainer = document.querySelector<HTMLElement>('[data-mobile-shell-scroll="true"]');
        document.documentElement.style.overflow = '';
        document.documentElement.style.overscrollBehavior = '';
        document.body.style.overflow = '';
        document.body.style.overscrollBehavior = '';
        if (shellScrollContainer) {
            shellScrollContainer.style.overflow = '';
            shellScrollContainer.style.overscrollBehavior = '';
            shellScrollContainer.style.touchAction = '';
            shellScrollContainer.scrollTop = lockedShellScrollTop;
        }
        lockedShellScrollTop = 0;
    }
}

function sanitizeStyle(style?: AnyStyle) {
    if (!style) return undefined;
    const next: Record<string, any> = {};
    Object.entries(style).forEach(([key, value]) => {
        if (key.startsWith('--') || value === undefined) return;
        next[key] = value;
    });
    return next as CSSProperties;
}

function withSafeAreaBottomPadding(value: string | number | undefined, fallback: number) {
    if (typeof value === 'number') {
        return `calc(${value}px + env(safe-area-inset-bottom))`;
    }
    if (typeof value === 'string' && /^[\d.]+(px|rem|em|%)$/.test(value.trim())) {
        return `calc(${value} + env(safe-area-inset-bottom))`;
    }
    return `calc(${fallback}px + env(safe-area-inset-bottom))`;
}

function buttonStyles(token: ReturnType<typeof theme.useToken>['token'], fill?: string, color?: string) {
    if (fill === 'none') {
        return { background: 'transparent', borderColor: 'transparent', boxShadow: 'none' };
    }

    if (fill === 'solid' && color === 'success') {
        return { backgroundColor: token.colorSuccess, borderColor: token.colorSuccess, color: token.colorTextLightSolid };
    }

    if (fill === 'solid' && color === 'warning') {
        return { backgroundColor: token.colorWarning, borderColor: token.colorWarning, color: token.colorTextLightSolid };
    }

    if (fill === 'outline' && color === 'success') {
        return { backgroundColor: 'transparent', borderColor: token.colorSuccess, color: token.colorSuccess };
    }

    if (fill === 'outline' && color === 'primary') {
        return { backgroundColor: 'transparent', borderColor: token.colorPrimary, color: token.colorPrimary };
    }

    if (fill === 'outline' && color === 'warning') {
        return { backgroundColor: 'transparent', borderColor: token.colorWarning, color: token.colorWarning };
    }

    return undefined;
}

type ButtonProps = {
    block?: boolean;
    children?: ReactNode;
    className?: string;
    color?: 'primary' | 'danger' | 'warning' | 'success' | string;
    disabled?: boolean;
    fill?: 'solid' | 'outline' | 'none';
    htmlType?: 'button' | 'submit' | 'reset';
    icon?: ReactNode;
    loading?: boolean;
    onClick?: (event: MouseEvent<HTMLElement>) => void;
    size?: 'mini' | 'small' | 'middle' | 'large';
    style?: AnyStyle;
};

export function Button({ block, children, className, color, disabled, fill = 'solid', htmlType, icon, loading, onClick, size, style }: ButtonProps) {
    const { token } = theme.useToken();
    const antType = fill === 'solid' && color !== 'warning' ? 'primary' : 'default';
    const antSize = size === 'mini' ? 'small' : size || 'middle';

    return (
        <AntButton
            block={block}
            className={className}
            danger={color === 'danger'}
            disabled={disabled}
            htmlType={htmlType}
            icon={icon}
            loading={loading}
            onClick={onClick}
            size={antSize}
            style={{ ...buttonStyles(token, fill, color), ...sanitizeStyle(style) }}
            type={antType}
        >
            {children}
        </AntButton>
    );
}

type CardProps = {
    children?: ReactNode;
    className?: string;
    onClick?: () => void;
    size?: 'default' | 'small';
    style?: AnyStyle;
    title?: ReactNode;
};

export function Card({ children, className, onClick, size = 'small', style, title }: CardProps) {
    return (
        <AntCard className={className} onClick={onClick} size={size} style={sanitizeStyle(style)} title={title}>
            {children}
        </AntCard>
    );
}

export function DotLoading(_: { color?: string }) {
    return <Spin size="small" />;
}

export const Empty = AntEmpty;

export function FloatingBubble({ children, onClick, style }: { children?: ReactNode; onClick?: () => void; style?: AnyStyle }) {
    const { token } = theme.useToken();
    const bubbleStyle = style || {};
    return (
        <FloatButton
            icon={(
                <Flex align="center" justify="center" style={{ color: 'inherit', height: '100%', width: '100%' }}>
                    {children}
                </Flex>
            )}
            onClick={onClick}
            type="primary"
            style={{
                backgroundColor: bubbleStyle['--background'] || token.colorPrimary,
                borderColor: bubbleStyle['--background'] || token.colorPrimary,
                bottom: bubbleStyle['--initial-position-bottom'] || 76,
                color: token.colorTextLightSolid,
                height: bubbleStyle['--size'] || 52,
                insetInlineEnd: bubbleStyle['--initial-position-right'] || 16,
                width: bubbleStyle['--size'] || 52,
            }}
        />
    );
}

type ListProps = {
    children?: ReactNode;
    className?: string;
    style?: AnyStyle;
};

type ListItemProps = {
    arrow?: boolean;
    children?: ReactNode;
    description?: ReactNode;
    extra?: ReactNode;
    onClick?: () => void;
    prefix?: ReactNode;
    style?: AnyStyle;
    title?: ReactNode;
};

function ListComponent({ children, className, style }: ListProps) {
    return (
        <AntList className={className} split style={sanitizeStyle(style)}>
            {children}
        </AntList>
    );
}

function ListItem({ arrow, children, description, extra, onClick, prefix, style, title }: ListItemProps) {
    const { token } = theme.useToken();
    return (
        <AntList.Item
            extra={(
                <Flex align="center" gap={8}>
                    {extra}
                    {arrow ? <LuChevronRight color={token.colorTextTertiary} size={16} /> : null}
                </Flex>
            )}
            onClick={onClick}
            style={sanitizeStyle(style)}
        >
            <AntList.Item.Meta
                avatar={prefix}
                description={description}
                title={title ?? children}
            />
        </AntList.Item>
    );
}

export const List = Object.assign(ListComponent, { Item: ListItem });

type PopupProps = {
    bodyStyle?: AnyStyle;
    children?: ReactNode;
    destroyOnClose?: boolean;
    onMaskClick?: (() => void) | undefined;
    position?: string;
    visible?: boolean;
};

function containsElementType(node: ReactNode, targetType: unknown): boolean {
    return Children.toArray(node).some((child) => {
        if (!isValidElement(child)) return false;
        if (child.type === targetType) return true;
        return containsElementType((child.props as { children?: ReactNode }).children, targetType);
    });
}

export function Popup({ bodyStyle, children, destroyOnClose, onMaskClick, visible }: PopupProps) {
    const drawerStyle = sanitizeStyle(bodyStyle);
    const hasNavBar = containsElementType(children, NavBar);
    const {
        height,
        maxHeight,
        minHeight,
        overflowX,
        overflowY,
        padding,
        paddingBottom,
        paddingInline,
        paddingInlineEnd,
        paddingInlineStart,
        paddingLeft,
        paddingRight,
        paddingTop,
        ...restDrawerStyle
    } = drawerStyle ?? {};

    const popupBodyPadding = hasNavBar
        ? { paddingTop: 8, paddingRight: 16, paddingBottom: 16, paddingLeft: 16 }
        : { paddingTop: 16, paddingRight: 16, paddingBottom: 16, paddingLeft: 16 };

    const normalizedPadding = {
        paddingTop: padding ?? popupBodyPadding.paddingTop,
        paddingRight: padding ?? popupBodyPadding.paddingRight,
        paddingBottom: padding ?? popupBodyPadding.paddingBottom,
        paddingLeft: padding ?? popupBodyPadding.paddingLeft,
    };

    if (paddingInline !== undefined) {
        normalizedPadding.paddingLeft = paddingInline;
        normalizedPadding.paddingRight = paddingInline;
    }

    if (paddingInlineStart !== undefined) normalizedPadding.paddingLeft = paddingInlineStart;
    if (paddingInlineEnd !== undefined) normalizedPadding.paddingRight = paddingInlineEnd;
    if (paddingTop !== undefined) normalizedPadding.paddingTop = paddingTop;
    if (paddingRight !== undefined) normalizedPadding.paddingRight = paddingRight;
    if (paddingBottom !== undefined) normalizedPadding.paddingBottom = paddingBottom;
    if (paddingLeft !== undefined) normalizedPadding.paddingLeft = paddingLeft;

    const popupHeight = (height as string | number | undefined) ?? 'auto';
    const popupContentStyle = {
        height: popupHeight,
        maxHeight: maxHeight ?? '88vh',
        minHeight,
    };
    const popupBodyStyle = {
        ...normalizedPadding,
        ...restDrawerStyle,
        height: undefined,
        maxHeight: undefined,
        minHeight: undefined,
        overflowX: overflowX ?? 'hidden',
        overflowY: overflowY ?? 'auto',
        paddingBottom: withSafeAreaBottomPadding(normalizedPadding.paddingBottom, popupBodyPadding.paddingBottom),
    };

    useEffect(() => {
        if (!visible) return;
        lockMobileBackgroundScroll();
        return () => {
            unlockMobileBackgroundScroll();
        };
    }, [visible]);

    return (
        <Drawer
            closable={false}
            destroyOnClose={destroyOnClose}
            height={popupHeight}
            maskClosable={Boolean(onMaskClick)}
            onClose={onMaskClick}
            open={visible}
            placement="bottom"
            styles={{
                body: popupBodyStyle,
                content: popupContentStyle,
            }}
        >
            <MobileSheetContext.Provider value>
                {children}
            </MobileSheetContext.Provider>
        </Drawer>
    );
}

export function PullToRefresh({ children }: { children?: ReactNode; onRefresh?: () => Promise<void> | void }) {
    return <Fragment>{children}</Fragment>;
}

export function SearchBar({ onChange, placeholder, style, value }: { onChange?: (value: string) => void; placeholder?: string; style?: AnyStyle; value?: string }) {
    return (
        <AntInput
            allowClear
            onChange={(event) => onChange?.(event.target.value)}
            placeholder={placeholder}
            prefix={<LuSearch size={16} />}
            style={sanitizeStyle(style)}
            value={value}
        />
    );
}

type SelectOption = { label: ReactNode; value: string };

export function Select({
    onChange,
    options,
    placeholder,
    style,
    value,
}: {
    onChange?: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    style?: AnyStyle;
    value?: string;
}) {
    return (
        <AntSelect
            allowClear={false}
            filterOption={(input, option) => {
                const label = option?.label;
                if (typeof label === 'string') return label.toLowerCase().includes(input.toLowerCase());
                return String(option?.value || '').toLowerCase().includes(input.toLowerCase());
            }}
            getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
            onChange={onChange}
            optionFilterProp="label"
            options={options}
            placeholder={placeholder}
            popupRender={(menu) => (
                <div
                    onTouchMove={(event) => event.stopPropagation()}
                    onWheel={(event) => event.stopPropagation()}
                    style={{ overscrollBehavior: 'contain' }}
                >
                    {menu}
                </div>
            )}
            popupMatchSelectWidth
            showSearch
            size="large"
            style={{ width: '100%', ...sanitizeStyle(style) }}
            value={value}
        />
    );
}

export function Switch({ checked, loading, onChange }: { checked?: boolean; loading?: boolean; onChange?: (checked: boolean) => void; style?: AnyStyle }) {
    return <AntSwitch checked={checked} loading={loading} onChange={onChange} size="small" />;
}

export const Toast = {
    show: ({ content, duration, icon }: { content?: ReactNode; duration?: number; icon?: string }) => {
        if (!content) return;
        const seconds = typeof duration === 'number' ? duration / 1000 : 1.5;
        const toastStyle = {
            marginTop: 'calc(env(safe-area-inset-top) + 12px)',
        };
        if (icon === 'success') {
            void message.success({ content, duration: seconds, style: toastStyle });
            return;
        }
        void message.info({ content, duration: seconds, style: toastStyle });
    },
};

export function Tag({ children, className, color, onClick, style }: { children?: ReactNode; className?: string; color?: string; fill?: string; onClick?: () => void; style?: AnyStyle }) {
    return <AntTag bordered className={className} color={color === 'primary' ? 'processing' : color} onClick={onClick} style={sanitizeStyle(style)}>{children}</AntTag>;
}

export function NavBar({ backIcon, children, className, onBack, right, style }: { backIcon?: ReactNode; children?: ReactNode; className?: string; onBack?: () => void; right?: ReactNode; style?: AnyStyle }) {
    const { token } = theme.useToken();
    const isInsideSheet = useContext(MobileSheetContext);
    const navHeight = 52;
    const hasTitle = Children.count(children) > 0;
    const showBackButton = Boolean(onBack) || backIcon !== undefined;
    return (
        <Flex
            align="center"
            className={className}
            justify="space-between"
            style={{
                backgroundColor: token.colorBgContainer,
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                minHeight: navHeight,
                padding: isInsideSheet ? '6px 12px' : `calc(env(safe-area-inset-top) + 6px) 12px 6px`,
                position: 'sticky',
                top: 0,
                zIndex: 5,
                ...sanitizeStyle(style),
            }}
        >
            {showBackButton ? (
                <Button fill="none" onClick={onBack} style={{ minHeight: 40, minWidth: 40, paddingInline: 0 }}>
                    {backIcon ?? <LuArrowLeft size={18} />}
                </Button>
            ) : (
                <div style={{ minHeight: 40, minWidth: 40 }} />
            )}
            <Flex align="center" justify="center" style={{ flex: 1, minWidth: 0 }}>
                {hasTitle ? (
                    <Title
                        level={5}
                        style={{ lineHeight: 1.2, margin: 0, textAlign: 'center' }}
                    >
                        {children}
                    </Title>
                ) : null}
            </Flex>
            <Flex align="center" justify="flex-end" style={{ minHeight: 40, minWidth: 40 }}>
                {right}
            </Flex>
        </Flex>
    );
}

type PickerOption = { label: ReactNode; value: string };

export function Picker({
    columns,
    onClose,
    onConfirm,
    searchPlaceholder,
    title,
    value,
    visible,
}: {
    columns: PickerOption[][];
    onClose?: () => void;
    onConfirm?: (value: string[]) => void;
    searchPlaceholder?: string;
    title?: ReactNode;
    value?: string[];
    visible?: boolean;
}) {
    const { token } = theme.useToken();
    const locale = useLocale();
    const localeText = getMobileUiLocaleText(locale);
    const options = columns[0] || [];
    const [selectedValue, setSelectedValue] = useState(value?.[0] || options[0]?.value || '');
    const [searchValue, setSearchValue] = useState('');

    useEffect(() => {
        if (!visible) return;
        setSelectedValue(value?.[0] || options[0]?.value || '');
        setSearchValue('');
    }, [options, value, visible]);

    const filteredOptions = useMemo(() => {
        if (!searchValue.trim()) return options;
        const term = searchValue.toLowerCase();
        return options.filter((option) => {
            if (typeof option.label === 'string') {
                return option.label.toLowerCase().includes(term);
            }
            return String(option.value).toLowerCase().includes(term);
        });
    }, [options, searchValue]);

    return (
        <Popup
            bodyStyle={{
                maxHeight: '92vh',
                minHeight: filteredOptions.length > 0 ? '34vh' : '28vh',
                overflow: 'hidden',
                padding: 0,
            }}
            destroyOnClose
            onMaskClick={onClose}
            visible={visible}
        >
            <Flex style={{ height: '100%' }} vertical>
                <Flex
                    style={{
                        backgroundColor: token.colorBgContainer,
                        borderBottom: `1px solid ${token.colorBorderSecondary}`,
                        padding: '8px 12px 10px',
                        position: 'sticky',
                        top: 0,
                        zIndex: 2,
                    }}
                    vertical
                >
                    <Flex align="center" justify="space-between" style={{ minHeight: 40 }}>
                        <Button
                            fill="none"
                            onClick={onClose}
                            style={{ minHeight: 40, minWidth: 40, paddingInline: 0 }}
                        >
                            <LuX size={18} />
                        </Button>
                        <Title level={5} style={{ flex: 1, lineHeight: 1.2, margin: 0, paddingInline: 8, textAlign: 'center' }}>
                            {title || localeText.select}
                        </Title>
                        <Button
                            fill="none"
                            onClick={() => {
                                onConfirm?.([selectedValue]);
                                onClose?.();
                            }}
                            style={{
                                color: token.colorPrimary,
                                minHeight: 40,
                                minWidth: 64,
                            }}
                        >
                            {localeText.confirm}
                        </Button>
                    </Flex>
                    {searchPlaceholder ? (
                        <Input
                            onChange={setSearchValue}
                            placeholder={searchPlaceholder}
                            style={{ marginTop: 8 }}
                            value={searchValue}
                        />
                    ) : null}
                </Flex>

                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 12px 12px' }}>
                    {filteredOptions.length > 0 ? (
                        <AntList
                            dataSource={filteredOptions}
                            renderItem={(option) => (
                                <AntList.Item onClick={() => setSelectedValue(option.value)}>
                                    <Flex align="center" justify="space-between" style={{ width: '100%' }}>
                                        <Text>{option.label}</Text>
                                        {selectedValue === option.value ? <LuCheck color={token.colorPrimary} size={16} /> : null}
                                    </Flex>
                                </AntList.Item>
                            )}
                        />
                    ) : (
                        <Flex align="center" justify="center" style={{ minHeight: 180, paddingBlock: 12 }}>
                            <AntEmpty
                                description={<Text type="secondary">No results found</Text>}
                                image={AntEmpty.PRESENTED_IMAGE_SIMPLE}
                                style={{ margin: 0 }}
                            />
                        </Flex>
                    )}
                </div>
            </Flex>
        </Popup>
    );
}

export function Input({ autoFocus, className, maxLength, onBlur, onChange, placeholder, style, type, value }: { autoFocus?: boolean; className?: string; maxLength?: number; onBlur?: () => void | Promise<void>; onChange?: (value: string) => void; placeholder?: string; style?: AnyStyle; type?: string; value?: string }) {
    return (
        <AntInput
            autoFocus={autoFocus}
            className={className}
            inputMode={type === 'number' ? 'decimal' : undefined}
            maxLength={maxLength}
            onBlur={() => void onBlur?.()}
            onChange={(event) => onChange?.(event.target.value)}
            placeholder={placeholder}
            style={sanitizeStyle(style)}
            type={type}
            value={value}
        />
    );
}

export function TextArea({ autoSize, maxLength, onChange, placeholder, rows, showCount, style, value }: { autoSize?: { minRows?: number; maxRows?: number }; maxLength?: number; onChange?: (value: string) => void; placeholder?: string; rows?: number; showCount?: boolean; style?: AnyStyle; value?: string }) {
    return (
        <AntInput.TextArea
            autoSize={autoSize}
            maxLength={maxLength}
            onChange={(event) => onChange?.(event.target.value)}
            placeholder={placeholder}
            rows={rows}
            showCount={showCount}
            style={sanitizeStyle(style)}
            value={value}
        />
    );
}

type TabPaneProps = { children?: ReactNode; key?: string; title?: ReactNode };

function TabsComponent({ activeKey, children, onChange, style }: { activeKey?: string; children?: ReactNode; onChange?: (key: string) => void; style?: AnyStyle }) {
    const items = useMemo(
        () => Children.toArray(children)
            .filter((child): child is ReactElement<TabPaneProps> => isValidElement(child))
            .map((child, index) => ({ key: child.key?.toString() || `${index}`, label: child.props.title, children: child.props.children ?? null })),
        [children]
    );

    return <AntTabs activeKey={activeKey} items={items} onChange={onChange} style={sanitizeStyle(style)} />;
}

function TabPane(_: TabPaneProps) {
    return null;
}

export const Tabs = Object.assign(TabsComponent, { Tab: TabPane });

type DialogConfig = {
    cancelText?: ReactNode;
    confirmText?: ReactNode;
    content?: ReactNode;
    onCancel?: () => void;
    onConfirm?: () => void | Promise<void>;
    title?: ReactNode;
};

async function confirmDialog(config: DialogConfig) {
    const localeText = getMobileUiLocaleText();
    return new Promise<boolean>((resolve) => {
        Modal.confirm({
            cancelText: config.cancelText || localeText.cancel,
            content: config.content,
            okText: config.confirmText || localeText.confirm,
            onCancel: () => {
                config.onCancel?.();
                resolve(false);
            },
            onOk: async () => {
                await config.onConfirm?.();
                resolve(true);
            },
            title: config.title,
        });
    });
}

export const Dialog = {
    alert: (config: DialogConfig) => Modal.info({ content: config.content, title: config.title }),
    confirm: confirmDialog,
};

export function Checkbox({ checked, children, disabled, indeterminate, onChange, style }: { checked?: boolean; children?: ReactNode; disabled?: boolean; indeterminate?: boolean; onChange?: (checked: boolean) => void; style?: AnyStyle }) {
    return <AntCheckbox checked={checked} disabled={disabled} indeterminate={indeterminate} onChange={(event) => onChange?.(event.target.checked)} style={sanitizeStyle(style)}>{children}</AntCheckbox>;
}

export function InfiniteScroll({ hasMore, loadMore }: { hasMore?: boolean; loadMore?: () => Promise<void> | void }) {
    if (!hasMore) return null;
    return <Button block fill="outline" onClick={() => void loadMore?.()}>Load more</Button>;
}

export function ProgressBar({ percent, style }: { percent?: number; style?: AnyStyle }) {
    return <Progress percent={percent} showInfo={false} style={sanitizeStyle(style)} />;
}

export const Space = AntSpace;
export const Result = AntResult;
export const Upload = AntUpload;

type CollapsePanelProps = { children?: ReactNode; title?: ReactNode };

function normalizeCollapseKey(key: string | null | undefined, fallback: string) {
    if (!key) return fallback;
    return key.replace(/^\.\$/, '').replace(/^\./, '');
}

function CollapseComponent({
    accordion,
    activeKey,
    children,
    defaultActiveKey,
    onChange,
}: {
    accordion?: boolean;
    activeKey?: string[] | string;
    children?: ReactNode;
    defaultActiveKey?: string[] | string;
    onChange?: (key: string[] | string) => void;
}) {
    const items = Children.toArray(children)
        .filter((child): child is ReactElement<CollapsePanelProps> => isValidElement(child))
        .map((child, index) => ({
            key: normalizeCollapseKey(child.key?.toString(), `${index}`),
            label: child.props.title,
            children: child.props.children,
        }));

    return <AntCollapse accordion={accordion} activeKey={activeKey} defaultActiveKey={defaultActiveKey} items={items} onChange={onChange} />;
}

function CollapsePanel(_: CollapsePanelProps) {
    return null;
}

export const Collapse = Object.assign(CollapseComponent, { Panel: CollapsePanel });

export function SafeArea({ position = 'top' }: { position?: 'top' | 'bottom' }) {
    return <AntSpace style={position === 'top' ? { paddingTop: 'env(safe-area-inset-top)' } : { paddingBottom: 'env(safe-area-inset-bottom)' }} />;
}

export { Avatar, Badge, Divider, Flex, Image, Text, Title };
