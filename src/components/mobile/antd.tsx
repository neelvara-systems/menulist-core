'use client'

import { getMobileUiLocaleText } from '@lib/localization/mobileUiLocale';
import {
    App as AntApp,
    Button as AntButton,
    Card as AntCard,
    Checkbox as AntCheckbox,
    Collapse as AntCollapse,
    Empty as AntEmpty,
    Input as AntInput,
    List as AntList,
    Popover as AntPopover,
    Result as AntResult,
    Select as AntSelect,
    Space as AntSpace,
    Switch as AntSwitch,
    Tabs as AntTabs,
    Tag as AntTag,
    Upload as AntUpload,
    Avatar,
    Badge,
    Divider,
    Drawer,
    Flex,
    FloatButton,
    Image,
    Modal,
    Progress,
    Spin,
    theme,
    Typography,
} from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import { useLocale } from 'next-intl';
import type { ComponentProps, CSSProperties, MouseEvent, ReactElement, ReactNode } from 'react';
import { Children, createContext, Fragment, isValidElement, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LuArrowLeft, LuCheck, LuChevronRight, LuSearch, LuX } from 'react-icons/lu';

type AnyStyle = CSSProperties & Record<string, any>;
const { Text: AntText, Title } = Typography;
type MobileSheetContextValue = {
    fullHeight: boolean;
    inside: boolean;
};

const MobileSheetContext = createContext<MobileSheetContextValue>({ fullHeight: false, inside: false });
let activePopupScrollLocks = 0;
let lockedShellScrollTop = 0;
let mobileMessageApi: MessageInstance | null = null;
let pendingToastQueue: Array<{ content?: ReactNode; duration?: number; icon?: string }> = [];
const MOBILE_DIALOG_Z_INDEX = 2600;

function showToastWithApi(
    api: MessageInstance,
    { content, duration, icon }: { content?: ReactNode; duration?: number; icon?: string },
) {
    if (!content) return;
    api.open({
        content,
        duration: typeof duration === 'number' ? duration / 1000 : 1.5,
        style: {
            marginTop: 'calc(env(safe-area-inset-top) + 12px)',
        },
        type: icon === 'success' ? 'success' : 'info',
    });
}

export function MobileAntdAppBridge() {
    const { message } = AntApp.useApp();

    useEffect(() => {
        mobileMessageApi = message;
        pendingToastQueue.forEach((toast) => showToastWithApi(message, toast));
        pendingToastQueue = [];

        return () => {
            if (mobileMessageApi === message) {
                mobileMessageApi = null;
            }
        };
    }, [message]);

    return null;
}

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

    if (fill === 'solid' && (!color || color === 'primary')) {
        return { backgroundColor: token.colorPrimary, borderColor: token.colorPrimary, color: token.colorTextLightSolid };
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

function disabledButtonStyles(token: ReturnType<typeof theme.useToken>['token'], fill?: string) {
    if (fill === 'none') {
        return { background: 'transparent', borderColor: 'transparent', boxShadow: 'none', color: token.colorTextDisabled };
    }

    if (fill === 'outline') {
        return {
            backgroundColor: token.colorBgContainerDisabled,
            borderColor: token.colorBorder,
            boxShadow: 'none',
            color: token.colorTextDisabled,
        };
    }

    return {
        backgroundColor: token.colorBgContainerDisabled,
        borderColor: token.colorBorder,
        boxShadow: 'none',
        color: token.colorTextDisabled,
    };
}

type ButtonProps = {
    ariaLabel?: string;
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
    title?: string;
};

export function Button({ ariaLabel, block, children, className, color, disabled, fill = 'solid', htmlType, icon, loading, onClick, size, style, title }: ButtonProps) {
    const { token } = theme.useToken();
    const antType = fill === 'solid' ? 'primary' : 'default';
    const antSize = size === 'mini' ? 'small' : size || 'middle';
    const touchMinHeight = antSize === 'large' ? 50 : antSize === 'small' ? 44 : 46;
    const touchSafeStyle = fill !== 'none'
        ? { minHeight: touchMinHeight, paddingInline: (block || antSize !== 'small') ? 14 : undefined }
        : undefined;
    const visualStyle = disabled ? disabledButtonStyles(token, fill) : buttonStyles(token, fill, color);

    return (
        <AntButton
            aria-label={ariaLabel}
            block={block}
            className={className}
            danger={color === 'danger'}
            disabled={disabled}
            htmlType={htmlType}
            icon={icon}
            loading={loading}
            onClick={onClick}
            size={antSize}
            style={{ ...visualStyle, ...touchSafeStyle, ...sanitizeStyle(style) }}
            title={title}
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
    zIndex?: number;
};

function containsElementType(node: ReactNode, targetType: unknown): boolean {
    return Children.toArray(node).some((child) => {
        if (!isValidElement(child)) return false;
        if (child.type === targetType) return true;
        return containsElementType((child.props as { children?: ReactNode }).children, targetType);
    });
}

export function Popup({ bodyStyle, children, destroyOnClose, onMaskClick, visible, zIndex }: PopupProps) {
    const [isPwa, setIsPwa] = useState(false);
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
    const hasExplicitZeroBottomPadding = padding === 0
        || padding === '0'
        || padding === '0px'
        || paddingBottom === 0
        || paddingBottom === '0'
        || paddingBottom === '0px';

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const standaloneMatch = window.matchMedia?.('(display-mode: standalone)')?.matches;
        const navStandalone = (window.navigator as any)?.standalone === true;
        setIsPwa(Boolean(standaloneMatch || navStandalone));
    }, []);

    const normalizeViewportHeight = (value: string | number | undefined) => {
        if (typeof value === 'string' && value.includes('vh')) {
            return value.replace(/vh/g, isPwa ? 'dvh' : 'svh');
        }
        return value;
    };
    // Ant Drawer uses both the `height` prop and content style; normalize both
    // or iOS PWA can leave visible top/bottom mask gaps.
    const popupHeight = normalizeViewportHeight((height as string | number | undefined) ?? 'auto');
    const popupMaxHeight = normalizeViewportHeight(maxHeight ?? '88vh');
    const popupMinHeight = normalizeViewportHeight(minHeight);
    const isFullHeightSheet = typeof popupHeight === 'string' && /100(dvh|svh|vh|%)$/.test(popupHeight.trim());
    const popupContentStyle = {
        height: popupHeight,
        maxHeight: popupMaxHeight,
        minHeight: popupMinHeight,
    };
    const popupBodyStyle = {
        ...normalizedPadding,
        ...restDrawerStyle,
        height: undefined,
        maxHeight: undefined,
        minHeight: undefined,
        overflowX: overflowX ?? 'hidden',
        overflowY: overflowY ?? 'auto',
        paddingBottom: hasExplicitZeroBottomPadding
            ? normalizedPadding.paddingBottom
            : withSafeAreaBottomPadding(normalizedPadding.paddingBottom, popupBodyPadding.paddingBottom),
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
            zIndex={zIndex}
            styles={{
                body: popupBodyStyle,
                content: popupContentStyle,
            }}
        >
            <MobileSheetContext.Provider value={{ fullHeight: isFullHeightSheet, inside: true }}>
                {children}
            </MobileSheetContext.Provider>
        </Drawer>
    );
}

export function Popover({
    children,
    content,
    onOpenChange,
    open,
    placement = 'bottomLeft',
    trigger = 'click',
}: {
    children?: ReactNode;
    content?: ReactNode;
    onOpenChange?: (open: boolean) => void;
    open?: boolean;
    placement?: ComponentProps<typeof AntPopover>['placement'];
    trigger?: ComponentProps<typeof AntPopover>['trigger'];
}) {
    const { token } = theme.useToken();
    const triggerRef = useRef<HTMLSpanElement | null>(null);
    const overlayRef = useRef<HTMLDivElement | null>(null);
    const isControlled = typeof open === 'boolean';
    const [internalOpen, setInternalOpen] = useState(false);
    const actualOpen = isControlled ? Boolean(open) : internalOpen;
    const [viewportBounds, setViewportBounds] = useState({ height: 640, width: 360 });
    const [overlayPosition, setOverlayPosition] = useState({ left: 16, top: 16 });

    const setOpenState = (nextOpen: boolean) => {
        if (!isControlled) {
            setInternalOpen(nextOpen);
        }
        onOpenChange?.(nextOpen);
    };

    useEffect(() => {
        const updateViewportBounds = () => {
            if (typeof window === 'undefined') return;
            const viewport = window.visualViewport;
            setViewportBounds({
                height: Math.floor(viewport?.height || window.innerHeight || 640),
                width: Math.floor(viewport?.width || window.innerWidth || 360),
            });
        };

        updateViewportBounds();
        window.addEventListener('resize', updateViewportBounds);
        window.visualViewport?.addEventListener('resize', updateViewportBounds);
        window.visualViewport?.addEventListener('scroll', updateViewportBounds);

        return () => {
            window.removeEventListener('resize', updateViewportBounds);
            window.visualViewport?.removeEventListener('resize', updateViewportBounds);
            window.visualViewport?.removeEventListener('scroll', updateViewportBounds);
        };
    }, []);

    const tooltipWidth = Math.max(180, Math.min(320, viewportBounds.width - 32));
    const tooltipMaxHeight = Math.max(120, Math.min(360, viewportBounds.height - 120));
    const isClickTrigger = Array.isArray(trigger) ? trigger.includes('click') : trigger === 'click';

    useEffect(() => {
        if (!actualOpen) return;

        const updateOverlayPosition = () => {
            const triggerNode = triggerRef.current;
            if (!triggerNode || typeof window === 'undefined') return;

            const viewport = window.visualViewport;
            const viewportLeft = viewport?.offsetLeft || 0;
            const viewportTop = viewport?.offsetTop || 0;
            const viewportWidth = viewport?.width || window.innerWidth || viewportBounds.width;
            const viewportHeight = viewport?.height || window.innerHeight || viewportBounds.height;
            const viewportRight = viewportLeft + viewportWidth;
            const viewportBottom = viewportTop + viewportHeight;
            const rect = triggerNode.getBoundingClientRect();
            const overlayHeight = Math.min(
                tooltipMaxHeight,
                overlayRef.current?.offsetHeight || 220,
            );
            const gutter = 16;
            const gap = 8;

            let left = rect.left;
            if (String(placement).toLowerCase().includes('right')) {
                left = rect.right - tooltipWidth;
            } else if (!String(placement).toLowerCase().includes('left')) {
                left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            }

            left = Math.min(
                Math.max(left, viewportLeft + gutter),
                viewportRight - tooltipWidth - gutter,
            );

            const preferredTop = String(placement).toLowerCase().startsWith('top')
                ? rect.top - overlayHeight - gap
                : rect.bottom + gap;
            const fallbackTop = String(placement).toLowerCase().startsWith('top')
                ? rect.bottom + gap
                : rect.top - overlayHeight - gap;
            let top = preferredTop;

            if (top + overlayHeight > viewportBottom - gutter || top < viewportTop + gutter) {
                top = fallbackTop;
            }

            top = Math.min(
                Math.max(top, viewportTop + gutter),
                viewportBottom - overlayHeight - gutter,
            );

            setOverlayPosition({ left, top });
        };

        updateOverlayPosition();
        const rafId = window.requestAnimationFrame(updateOverlayPosition);

        window.addEventListener('resize', updateOverlayPosition);
        window.addEventListener('scroll', updateOverlayPosition, true);
        window.visualViewport?.addEventListener('resize', updateOverlayPosition);
        window.visualViewport?.addEventListener('scroll', updateOverlayPosition);

        return () => {
            window.cancelAnimationFrame(rafId);
            window.removeEventListener('resize', updateOverlayPosition);
            window.removeEventListener('scroll', updateOverlayPosition, true);
            window.visualViewport?.removeEventListener('resize', updateOverlayPosition);
            window.visualViewport?.removeEventListener('scroll', updateOverlayPosition);
        };
    }, [actualOpen, placement, tooltipMaxHeight, tooltipWidth, viewportBounds.height, viewportBounds.width]);

    useEffect(() => {
        if (!actualOpen) return;

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (triggerRef.current?.contains(target) || overlayRef.current?.contains(target)) return;
            setOpenState(false);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpenState(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [actualOpen]);

    return (
        <>
            <span
                ref={triggerRef}
                style={{ display: 'inline-flex' }}
                onClick={isClickTrigger ? () => setOpenState(!actualOpen) : undefined}
            >
                {children}
            </span>
            {actualOpen && typeof document !== 'undefined' ? createPortal((
                <div
                    ref={overlayRef}
                    role="tooltip"
                    style={{
                        background: token.colorBgElevated,
                        border: `1px solid ${token.colorBorderSecondary}`,
                        borderRadius: 12,
                        boxSizing: 'border-box',
                        boxShadow: token.boxShadowSecondary,
                        color: token.colorText,
                        fontSize: 14,
                        left: overlayPosition.left,
                        lineHeight: 1.45,
                        maxHeight: tooltipMaxHeight,
                        maxWidth: tooltipWidth,
                        overflow: 'hidden',
                        overflowWrap: 'break-word',
                        padding: 12,
                        position: 'fixed',
                        top: overlayPosition.top,
                        width: tooltipWidth,
                        zIndex: 5000,
                    }}
                >
                    <div
                        style={{
                            maxHeight: tooltipMaxHeight - 24,
                            overflowY: 'auto',
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                        }}
                    >
                        {content}
                    </div>
                </div>
            ), document.body) : null}
        </>
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
            size="middle"
            style={sanitizeStyle(style)}
            value={value}
        />
    );
}

type SelectOption = { label: ReactNode; value: string };

type BaseSelectProps = {
    disabled?: boolean;
    options: SelectOption[];
    placeholder?: string;
    showSearch?: boolean;
    style?: AnyStyle;
};

type SingleSelectProps = BaseSelectProps & {
    maxCount?: never;
    mode?: undefined;
    onChange?: (value: string) => void;
    value?: string;
};

type MultiSelectProps = BaseSelectProps & {
    maxCount?: number;
    mode: 'multiple';
    onChange?: (value: string[]) => void;
    value?: string[];
};

export function Select({
    disabled,
    maxCount,
    mode,
    onChange,
    options,
    placeholder,
    showSearch = true,
    style,
    value,
}: SingleSelectProps | MultiSelectProps) {
    const handleChange = (nextValue: string | string[]) => {
        if (typeof document !== 'undefined') {
            const activeElement = document.activeElement as HTMLElement | null;
            activeElement?.blur?.();
        }
        onChange?.(nextValue as any);
    };

    return (
        <AntSelect
            allowClear={false}
            filterOption={(input, option) => {
                const label = option?.label;
                if (typeof label === 'string') return label.toLowerCase().includes(input.toLowerCase());
                return String(option?.value || '').toLowerCase().includes(input.toLowerCase());
            }}
            getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
            disabled={disabled}
            maxCount={maxCount}
            mode={mode}
            onChange={handleChange}
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
            showSearch={showSearch}
            size="large"
            style={{ width: '100%', ...sanitizeStyle(style) }}
            value={value}
        />
    );
}

export function Text(props: ComponentProps<typeof AntText>) {
    const hasExplicitColor = props.style && typeof (props.style as AnyStyle).color !== 'undefined';
    const shouldInherit = !props.type && !hasExplicitColor;
    return <AntText {...props} style={shouldInherit ? { color: 'inherit', ...(props.style || {}) } : props.style} />;
}

export function Switch({ checked, disabled, loading, onChange, style }: { checked?: boolean; disabled?: boolean; loading?: boolean; onChange?: (checked: boolean) => void; style?: AnyStyle }) {
    return <AntSwitch checked={checked} disabled={disabled} loading={loading} onChange={onChange} size="small" style={sanitizeStyle(style)} />;
}

export const Toast = {
    clear: () => {
        pendingToastQueue = [];
        if (mobileMessageApi) {
            void mobileMessageApi.destroy();
        }
    },
    show: ({ content, duration, icon }: { content?: ReactNode; duration?: number; icon?: string }) => {
        if (!content) return;
        const toastPayload = { content, duration, icon };
        if (mobileMessageApi) {
            showToastWithApi(mobileMessageApi, toastPayload);
            return;
        }
        pendingToastQueue.push(toastPayload);
    },
};

export function Tag({ children, className, color, onClick, style }: { children?: ReactNode; className?: string; color?: string; fill?: string; onClick?: () => void; style?: AnyStyle }) {
    return <AntTag bordered className={className} color={color === 'primary' ? 'processing' : color} onClick={onClick} style={sanitizeStyle(style)}>{children}</AntTag>;
}

export function NavBar({
    backIcon,
    children,
    className,
    onBack,
    right,
    style,
    titleAlign,
}: {
    backIcon?: ReactNode;
    children?: ReactNode;
    className?: string;
    onBack?: () => void;
    right?: ReactNode;
    style?: AnyStyle;
    titleAlign?: 'center' | 'left';
}) {
    const { token } = theme.useToken();
    const sheetContext = useContext(MobileSheetContext);
    const navHeight = 52;
    const hasTitle = Children.count(children) > 0;
    const showBackButton = Boolean(onBack) || backIcon !== undefined;
    const navPaddingTop = sheetContext.inside
        ? sheetContext.fullHeight ? 'calc(env(safe-area-inset-top) + 6px)' : '6px'
        : 'calc(env(safe-area-inset-top) + 6px)';
    const effectiveTitleAlign = sheetContext.inside ? 'left' : (titleAlign || 'center');
    const reserveLeadingSpace = !sheetContext.inside || effectiveTitleAlign === 'center';
    return (
        <Flex
            align="center"
            className={className}
            justify="space-between"
            style={{
                alignSelf: 'stretch',
                backdropFilter: 'blur(10px)',
                backgroundColor: token.colorBgContainer,
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                flex: '0 0 auto',
                minHeight: navHeight,
                padding: `${navPaddingTop} 12px 6px`,
                position: 'sticky',
                top: 0,
                width: '100%',
                zIndex: 20,
                ...sanitizeStyle(style),
            }}
        >
            {showBackButton ? (
                <Button fill="none" onClick={onBack} style={{ minHeight: 40, minWidth: 40, paddingInline: 0 }}>
                    {backIcon ?? <LuArrowLeft size={18} />}
                </Button>
            ) : reserveLeadingSpace ? (
                <div style={{ minHeight: 40, minWidth: 40 }} />
            ) : (
                null
            )}
            <Flex align="center" justify={effectiveTitleAlign === 'left' ? 'flex-start' : 'center'} style={{ flex: 1, minWidth: 0 }}>
                {hasTitle ? (
                    <Title
                        level={5}
                        style={{ lineHeight: 1.2, margin: 0, textAlign: effectiveTitleAlign }}
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

export function Input({
    autoCapitalize,
    autoComplete,
    autoFocus,
    className,
    disabled,
    enterKeyHint,
    id,
    inputMode,
    max,
    maxLength,
    min,
    name,
    onBlur,
    onChange,
    placeholder,
    step,
    style,
    type,
    value,
}: {
    autoCapitalize?: string;
    autoComplete?: string;
    autoFocus?: boolean;
    className?: string;
    disabled?: boolean;
    enterKeyHint?: React.InputHTMLAttributes<HTMLInputElement>['enterKeyHint'];
    id?: string;
    inputMode?: React.InputHTMLAttributes<HTMLInputElement>['inputMode'];
    max?: string | number;
    maxLength?: number;
    min?: string | number;
    name?: string;
    onBlur?: () => void | Promise<void>;
    onChange?: (value: string) => void;
    placeholder?: string;
    step?: string | number;
    style?: AnyStyle;
    type?: string;
    value?: string
}) {
    const isTemporalInput = type === 'time' || type === 'date' || type === 'datetime-local' || type === 'month' || type === 'week';
    const mergedStyle = sanitizeStyle({
        ...(isTemporalInput ? { minHeight: 40 } : {}),
        ...(style || {}),
    });

    const focusTimeInput = (event: any) => {
        if (!isTemporalInput) return;
        const target = event?.target as HTMLElement | null;
        const currentTarget = event?.currentTarget as HTMLElement | null;

        const inputEl =
            (target instanceof HTMLInputElement ? target : target?.closest?.('input') as HTMLInputElement | null)
            || (currentTarget?.querySelector?.('input') as HTMLInputElement | null)
            || null;

        if (!inputEl) return;
        inputEl.focus();
    };

    const openNativeTimePicker = (event: any) => {
        if (!isTemporalInput) return;
        const target = event?.target as HTMLElement | null;
        const currentTarget = event?.currentTarget as HTMLElement | null;
        const inputEl =
            (target instanceof HTMLInputElement ? target : target?.closest?.('input') as HTMLInputElement | null)
            || (currentTarget?.querySelector?.('input') as HTMLInputElement | null)
            || null;
        if (!inputEl) return;

        inputEl.focus();
        try {
            (inputEl as any).showPicker?.();
        } catch {
            // iOS/Safari or non-gesture contexts can reject showPicker; focus is sufficient fallback.
        }
    };

    return (
        <AntInput
            autoCapitalize={autoCapitalize}
            autoComplete={autoComplete}
            autoFocus={autoFocus}
            className={className}
            disabled={disabled}
            enterKeyHint={enterKeyHint}
            id={id}
            inputMode={inputMode || (type === 'number' ? 'decimal' : undefined)}
            max={max}
            maxLength={maxLength}
            min={min}
            name={name}
            onBlur={() => void onBlur?.()}
            onClick={openNativeTimePicker}
            onChange={(event) => onChange?.(event.target.value)}
            onInput={(event) => onChange?.((event.target as HTMLInputElement).value)}
            onFocus={focusTimeInput}
            placeholder={placeholder}
            step={step}
            style={mergedStyle}
            type={type}
            value={value}
        />
    );
}

export function TextArea({ autoSize, disabled, maxLength, onChange, placeholder, rows, showCount, style, value }: { autoSize?: { minRows?: number; maxRows?: number }; disabled?: boolean; maxLength?: number; onChange?: (value: string) => void; placeholder?: string; rows?: number; showCount?: boolean; style?: AnyStyle; value?: string }) {
    return (
        <AntInput.TextArea
            autoSize={autoSize}
            disabled={disabled}
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

function normalizeTabKey(key: string | null, fallback: string): string {
    return key?.replace(/^\.\$/, '') || fallback;
}

function TabsComponent({ activeKey, centered, children, onChange, style }: { activeKey?: string; centered?: boolean; children?: ReactNode; onChange?: (key: string) => void; style?: AnyStyle }) {
    const items = useMemo(
        () => Children.toArray(children)
            .filter((child): child is ReactElement<TabPaneProps> => isValidElement(child))
            .map((child, index) => ({
                key: normalizeTabKey(child.key?.toString() || null, `${index}`),
                label: child.props.title,
                children: child.props.children ?? null,
            })),
        [children]
    );

    return <AntTabs activeKey={activeKey} centered={centered} items={items} onChange={(key) => onChange?.(normalizeTabKey(key, key))} style={sanitizeStyle(style)} />;
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
            zIndex: MOBILE_DIALOG_Z_INDEX,
        });
    });
}

export const Dialog = {
    alert: (config: DialogConfig) => Modal.info({ content: config.content, title: config.title, zIndex: MOBILE_DIALOG_Z_INDEX }),
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
export { Spin };
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
    expandIcon,
}: {
    accordion?: boolean;
    activeKey?: string[] | string;
    children?: ReactNode;
    defaultActiveKey?: string[] | string;
    onChange?: (key: string[] | string) => void;
    expandIcon?: ((panelProps: { isActive?: boolean }) => ReactNode) | null;
}) {
    const items = Children.toArray(children)
        .filter((child): child is ReactElement<CollapsePanelProps> => isValidElement(child))
        .map((child, index) => ({
            key: normalizeCollapseKey(child.key?.toString(), `${index}`),
            label: child.props.title,
            children: child.props.children,
        }));

    return <AntCollapse accordion={accordion} activeKey={activeKey} defaultActiveKey={defaultActiveKey} expandIcon={expandIcon === null ? () => null : expandIcon} items={items} onChange={onChange} />;
}

function CollapsePanel(_: CollapsePanelProps) {
    return null;
}

export const Collapse = Object.assign(CollapseComponent, { Panel: CollapsePanel });

export function SafeArea({ position = 'top' }: { position?: 'top' | 'bottom' }) {
    return <AntSpace style={position === 'top' ? { paddingTop: 'env(safe-area-inset-top)' } : { paddingBottom: 'env(safe-area-inset-bottom)' }} />;
}

export { Avatar, Badge, Divider, Flex, Image, Title };
