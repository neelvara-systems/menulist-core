'use client'

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
    Space as AntSpace,
    Spin,
    Switch as AntSwitch,
    Tabs as AntTabs,
    Tag as AntTag,
    Typography,
    Upload as AntUpload,
    message,
} from 'antd';
import type { CSSProperties, MouseEvent, ReactElement, ReactNode } from 'react';
import { Children, Fragment, isValidElement, useEffect, useMemo, useState } from 'react';
import { LuArrowLeft, LuCheck, LuChevronRight, LuSearch } from 'react-icons/lu';

type AnyStyle = CSSProperties & Record<string, any>;

const { Text, Title } = Typography;

function sanitizeStyle(style?: AnyStyle) {
    if (!style) return undefined;
    const next: Record<string, any> = {};
    Object.entries(style).forEach(([key, value]) => {
        if (key.startsWith('--') || value === undefined) return;
        next[key] = value;
    });
    return next as CSSProperties;
}

function buttonStyles(fill?: string, color?: string) {
    if (fill === 'none') {
        return { background: 'transparent', borderColor: 'transparent', boxShadow: 'none' };
    }

    if (fill === 'solid' && color === 'success') {
        return { backgroundColor: '#16a34a', borderColor: '#16a34a', color: '#fff' };
    }

    if (fill === 'solid' && color === 'warning') {
        return { backgroundColor: '#faad14', borderColor: '#faad14', color: '#fff' };
    }

    if (fill === 'outline' && color === 'success') {
        return { backgroundColor: 'transparent', borderColor: '#16a34a', color: '#16a34a' };
    }

    if (fill === 'outline' && color === 'primary') {
        return { backgroundColor: 'transparent', borderColor: '#1677ff', color: '#1677ff' };
    }

    if (fill === 'outline' && color === 'warning') {
        return { backgroundColor: 'transparent', borderColor: '#faad14', color: '#faad14' };
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
    loading?: boolean;
    onClick?: (event: MouseEvent<HTMLElement>) => void;
    size?: 'mini' | 'small' | 'middle' | 'large';
    style?: AnyStyle;
};

export function Button({ block, children, className, color, disabled, fill = 'solid', htmlType, loading, onClick, size, style }: ButtonProps) {
    const antType = fill === 'solid' && color !== 'warning' ? 'primary' : 'default';
    const antSize = size === 'mini' ? 'small' : size || 'middle';

    return (
        <AntButton
            block={block}
            className={className}
            danger={color === 'danger'}
            disabled={disabled}
            htmlType={htmlType}
            loading={loading}
            onClick={onClick}
            size={antSize}
            style={{ ...buttonStyles(fill, color), ...sanitizeStyle(style) }}
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
    const bubbleStyle = style || {};
    return (
        <FloatButton
            icon={children}
            onClick={onClick}
            style={{
                background: bubbleStyle['--background'] || '#1677ff',
                bottom: bubbleStyle['--initial-position-bottom'] || 76,
                color: '#fff',
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
    return (
        <AntList.Item
            extra={(
                <Flex align="center" gap={8}>
                    {extra}
                    {arrow ? <LuChevronRight color="#94a3b8" size={16} /> : null}
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

export function Popup({ bodyStyle, children, destroyOnClose, onMaskClick, visible }: PopupProps) {
    const drawerStyle = sanitizeStyle(bodyStyle);
    return (
        <Drawer
            closable={false}
            destroyOnClose={destroyOnClose}
            height={(drawerStyle?.height || drawerStyle?.maxHeight || 'auto') as string | number}
            maskClosable={Boolean(onMaskClick)}
            onClose={onMaskClick}
            open={visible}
            placement="bottom"
            styles={{ body: { ...drawerStyle, padding: 16 } }}
        >
            {children}
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

export function Switch({ checked, loading, onChange }: { checked?: boolean; loading?: boolean; onChange?: (checked: boolean) => void; style?: AnyStyle }) {
    return <AntSwitch checked={checked} loading={loading} onChange={onChange} size="small" />;
}

export const Toast = {
    show: ({ content, duration, icon }: { content?: ReactNode; duration?: number; icon?: string }) => {
        if (!content) return;
        const seconds = typeof duration === 'number' ? duration / 1000 : 1.5;
        if (icon === 'success') {
            void message.success({ content, duration: seconds });
            return;
        }
        void message.info({ content, duration: seconds });
    },
};

export function Tag({ children, className, color, onClick, style }: { children?: ReactNode; className?: string; color?: string; fill?: string; onClick?: () => void; style?: AnyStyle }) {
    return <AntTag bordered className={className} color={color === 'primary' ? 'processing' : color} onClick={onClick} style={sanitizeStyle(style)}>{children}</AntTag>;
}

export function NavBar({ backIcon, children, className, onBack, right, style }: { backIcon?: ReactNode; children?: ReactNode; className?: string; onBack?: () => void; right?: ReactNode; style?: AnyStyle }) {
    return (
        <Flex align="center" className={className} justify="space-between" style={{ borderBottom: '1px solid #f0f0f0', minHeight: (style?.['--height'] || 48) as number, padding: '8px 12px', ...sanitizeStyle(style) }}>
            <Button fill="none" onClick={onBack} style={{ minWidth: 32, paddingInline: 0 }}>
                {backIcon ?? <LuArrowLeft size={18} />}
            </Button>
            <Title level={5} style={{ margin: 0, flex: 1, textAlign: 'center' }}>{children}</Title>
            <Flex align="center" justify="flex-end" style={{ minWidth: 32 }}>
                {right}
            </Flex>
        </Flex>
    );
}

type PickerOption = { label: ReactNode; value: string };

export function Picker({ columns, onClose, onConfirm, value, visible }: { columns: PickerOption[][]; onClose?: () => void; onConfirm?: (value: string[]) => void; value?: string[]; visible?: boolean }) {
    const options = columns[0] || [];
    const [selectedValue, setSelectedValue] = useState(value?.[0] || options[0]?.value || '');

    useEffect(() => {
        if (!visible) return;
        setSelectedValue(value?.[0] || options[0]?.value || '');
    }, [options, value, visible]);

    return (
        <Drawer closable={false} destroyOnClose height="60vh" maskClosable onClose={onClose} open={visible} placement="bottom">
            <Flex vertical gap={16}>
                <Flex align="center" justify="space-between">
                    <Button fill="none" onClick={onClose}>Cancel</Button>
                    <Title level={5} style={{ margin: 0 }}>Select</Title>
                    <Button onClick={() => { onConfirm?.([selectedValue]); onClose?.(); }}>Confirm</Button>
                </Flex>
                <AntList
                    dataSource={options}
                    renderItem={(option) => (
                        <AntList.Item onClick={() => setSelectedValue(option.value)}>
                            <Flex align="center" justify="space-between" style={{ width: '100%' }}>
                                <Text>{option.label}</Text>
                                {selectedValue === option.value ? <LuCheck color="#1677ff" size={16} /> : null}
                            </Flex>
                        </AntList.Item>
                    )}
                />
            </Flex>
        </Drawer>
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
    return new Promise<boolean>((resolve) => {
        Modal.confirm({
            cancelText: config.cancelText,
            content: config.content,
            okText: config.confirmText || 'Confirm',
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

export function Checkbox({ checked, children, indeterminate, onChange, style }: { checked?: boolean; children?: ReactNode; indeterminate?: boolean; onChange?: (checked: boolean) => void; style?: AnyStyle }) {
    return <AntCheckbox checked={checked} indeterminate={indeterminate} onChange={(event) => onChange?.(event.target.checked)} style={sanitizeStyle(style)}>{children}</AntCheckbox>;
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

function CollapseComponent({ accordion, children }: { accordion?: boolean; children?: ReactNode }) {
    const items = Children.toArray(children)
        .filter((child): child is ReactElement<CollapsePanelProps> => isValidElement(child))
        .map((child, index) => ({ key: child.key?.toString() || `${index}`, label: child.props.title, children: child.props.children }));

    return <AntCollapse accordion={accordion} items={items} />;
}

function CollapsePanel(_: CollapsePanelProps) {
    return null;
}

export const Collapse = Object.assign(CollapseComponent, { Panel: CollapsePanel });

export function SafeArea({ position = 'top' }: { position?: 'top' | 'bottom' }) {
    return <AntSpace style={position === 'top' ? { paddingTop: 'env(safe-area-inset-top)' } : { paddingBottom: 'env(safe-area-inset-bottom)' }} />;
}

export { Avatar, Badge, Divider, Flex, Image, Text, Title };
