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
import type {
    ComponentProps,
    CSSProperties,
    FocusEvent,
    KeyboardEvent as ReactKeyboardEvent,
    MouseEvent,
    ReactElement,
    ReactNode,
    TouchEvent,
} from 'react';
import { Children, createContext, isValidElement, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LuArrowLeft, LuCheck, LuChevronRight, LuSearch, LuX } from 'react-icons/lu';

type CustomStyleProperty = `--${string}`;
type CustomStyle = CSSProperties & Partial<Record<CustomStyleProperty, string | number>>;
type AnyStyle = CSSProperties | CustomStyle;
interface NavigatorWithStandalone extends Navigator {
    standalone?: boolean;
}
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

export function MobileAntdAppBridge(): null {
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
    const next: Record<string, unknown> = {};
    Object.entries(style).forEach(([key, value]) => {
        if (key.startsWith('--') || value === undefined) return;
        next[key] = value;
    });
    return next as CSSProperties;
}

function customStyleValue(
    style: AnyStyle | undefined,
    property: CustomStyleProperty,
): string | number | undefined {
    if (!style) return undefined;
    const styleObject: object = style;
    const value: unknown = Reflect.get(styleObject, property);
    return typeof value === 'string' || typeof value === 'number' ? value : undefined;
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
    'aria-controls'?: string;
    'aria-describedby'?: string;
    'aria-expanded'?: boolean;
    'aria-haspopup'?: boolean | 'dialog' | 'menu' | 'listbox' | 'tree' | 'grid';
    'aria-label'?: string;
    'aria-pressed'?: boolean;
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

export function Button({
    'aria-controls': ariaControls,
    'aria-describedby': ariaDescribedBy,
    'aria-expanded': ariaExpanded,
    'aria-haspopup': ariaHasPopup,
    'aria-label': ariaLabelAttribute,
    'aria-pressed': ariaPressed,
    ariaLabel,
    block,
    children,
    className,
    color,
    disabled,
    fill = 'solid',
    htmlType,
    icon,
    loading,
    onClick,
    size,
    style,
    title,
}: ButtonProps) {
    const { token } = theme.useToken();
    const antType = fill === 'solid' ? 'primary' : 'default';
    const antSize = size === 'mini' ? 'small' : size || 'middle';
    const touchMinHeight = antSize === 'large' ? 50 : antSize === 'small' ? 44 : 46;
    const touchSafeStyle = {
        minHeight: touchMinHeight,
        minWidth: fill === 'none' ? 44 : undefined,
        paddingInline: fill === 'none' ? undefined : (block || antSize !== 'small') ? 14 : undefined,
    };
    const visualStyle = disabled ? disabledButtonStyles(token, fill) : buttonStyles(token, fill, color);

    return (
        <AntButton
            aria-controls={ariaControls}
            aria-describedby={ariaDescribedBy}
            aria-expanded={ariaExpanded}
            aria-haspopup={ariaHasPopup}
            aria-label={ariaLabel ?? ariaLabelAttribute}
            aria-pressed={ariaPressed}
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
    'aria-pressed'?: boolean;
    children?: ReactNode;
    className?: string;
    onClick?: () => void;
    size?: 'default' | 'small';
    style?: AnyStyle;
    title?: ReactNode;
};

export function Card({ 'aria-pressed': ariaPressed, children, className, onClick, size = 'small', style, title }: CardProps) {
    const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (!onClick) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onClick();
    };

    return (
        <AntCard
            aria-pressed={ariaPressed}
            className={className}
            onClick={onClick}
            onKeyDown={handleKeyDown}
            role={onClick ? 'button' : undefined}
            size={size}
            style={sanitizeStyle({
                cursor: onClick ? 'pointer' : undefined,
                minHeight: onClick ? 56 : undefined,
                ...style,
            })}
            tabIndex={onClick ? 0 : undefined}
            title={title}
        >
            {children}
        </AntCard>
    );
}

export function DotLoading(_: { color?: string }) {
    return <Spin size="small" />;
}

export const Empty = AntEmpty;

export function FloatingBubble({ ariaLabel, children, onClick, style }: { ariaLabel?: string; children?: ReactNode; onClick?: () => void; style?: AnyStyle }) {
    const { token } = theme.useToken();
    const requestedBackground = customStyleValue(style, '--background');
    const background = typeof requestedBackground === 'string' ? requestedBackground : token.colorPrimary;
    return (
        <FloatButton
            aria-label={ariaLabel}
            icon={(
                <Flex align="center" justify="center" style={{ color: 'inherit', height: '100%', width: '100%' }}>
                    {children}
                </Flex>
            )}
            onClick={onClick}
            type="primary"
            style={{
                backgroundColor: background,
                borderColor: background,
                bottom: customStyleValue(style, '--initial-position-bottom') || 76,
                color: token.colorTextLightSolid,
                height: customStyleValue(style, '--size') || 52,
                insetInlineEnd: customStyleValue(style, '--initial-position-right') || 16,
                width: customStyleValue(style, '--size') || 52,
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
    'aria-pressed'?: boolean;
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

function ListItem({ 'aria-pressed': ariaPressed, arrow, children, description, extra, onClick, prefix, style, title }: ListItemProps) {
    const { token } = theme.useToken();
    const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        onClick();
    };

    return (
        <AntList.Item
            aria-pressed={ariaPressed}
            extra={(
                <Flex align="center" gap={8}>
                    {extra}
                    {arrow ? <LuChevronRight color={token.colorTextTertiary} size={16} /> : null}
                </Flex>
            )}
            onClick={onClick}
            onKeyDown={handleKeyDown}
            role={onClick ? 'button' : undefined}
            style={sanitizeStyle({
                cursor: onClick ? 'pointer' : undefined,
                minHeight: onClick ? 56 : undefined,
                ...style,
            })}
            tabIndex={onClick ? 0 : undefined}
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
    'aria-label'?: string;
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

export function Popup({ 'aria-label': ariaLabel, bodyStyle, children, destroyOnClose, onMaskClick, visible, zIndex }: PopupProps) {
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
        const navStandalone = (window.navigator as NavigatorWithStandalone).standalone === true;
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
    const popupContentStyle: CSSProperties = {
        height: popupHeight,
        maxHeight: popupMaxHeight,
        minHeight: popupMinHeight,
    };
    const popupBodyStyle: AnyStyle = {
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
            aria-label={ariaLabel}
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

const MOBILE_PULL_REFRESH_THRESHOLD = 56;
const MOBILE_PULL_REFRESH_MAX_DISTANCE = 80;

export function PullToRefresh({ children, onRefresh }: { children?: ReactNode; onRefresh?: () => Promise<void> | void }) {
    const startYRef = useRef<number | null>(null);
    const pullDistanceRef = useRef(0);
    const [pullDistance, setPullDistance] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    const updatePullDistance = (nextDistance: number) => {
        pullDistanceRef.current = nextDistance;
        setPullDistance(nextDistance);
    };

    const resetPull = () => {
        startYRef.current = null;
        updatePullDistance(0);
    };

    const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
        if (!onRefresh || refreshing || event.touches.length !== 1) return;
        const scrollContainer = event.currentTarget.closest<HTMLElement>('[data-mobile-shell-scroll="true"]');
        const scrollTop = scrollContainer?.scrollTop ?? window.scrollY;
        if (scrollTop > 0) return;
        startYRef.current = event.touches[0]?.clientY ?? null;
    };

    const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
        const startY = startYRef.current;
        const currentY = event.touches[0]?.clientY;
        if (startY === null || currentY === undefined) return;
        const delta = currentY - startY;
        if (delta <= 0) {
            updatePullDistance(0);
            return;
        }
        updatePullDistance(Math.min(MOBILE_PULL_REFRESH_MAX_DISTANCE, delta * 0.45));
    };

    const handleTouchEnd = () => {
        const shouldRefresh = pullDistanceRef.current >= MOBILE_PULL_REFRESH_THRESHOLD;
        resetPull();
        if (!shouldRefresh || !onRefresh || refreshing) return;

        setRefreshing(true);
        void Promise.resolve()
            .then(onRefresh)
            .catch((error: unknown) => {
                if (typeof globalThis.reportError === 'function') {
                    globalThis.reportError(error);
                }
            })
            .finally(() => {
                setRefreshing(false);
            });
    };

    return (
        <div
            onTouchCancel={resetPull}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            onTouchStart={handleTouchStart}
            style={{ minWidth: 0, overscrollBehaviorY: 'contain', width: '100%' }}
        >
            <Flex
                align="center"
                aria-hidden={!refreshing && pullDistance === 0}
                justify="center"
                style={{
                    height: refreshing ? 36 : pullDistance,
                    opacity: refreshing || pullDistance >= MOBILE_PULL_REFRESH_THRESHOLD ? 1 : pullDistance / MOBILE_PULL_REFRESH_THRESHOLD,
                    overflow: 'hidden',
                    transition: pullDistance === 0 ? 'height 160ms ease, opacity 160ms ease' : undefined,
                }}
            >
                <Spin size="small" spinning={refreshing || pullDistance >= MOBILE_PULL_REFRESH_THRESHOLD} />
            </Flex>
            {children}
        </div>
    );
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

type SelectOption = { disabled?: boolean; label: ReactNode; value: string };

type BaseSelectProps = {
    'aria-label'?: string;
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

type SelectImplementationProps = BaseSelectProps & {
    maxCount?: number;
    mode?: 'multiple';
    onChange?: unknown;
    value?: string | string[];
};

export function Select(props: SingleSelectProps): ReactElement;
export function Select(props: MultiSelectProps): ReactElement;
export function Select(props: SelectImplementationProps): ReactElement {
    const {
        'aria-label': ariaLabel,
        disabled,
        maxCount,
        mode,
        options,
        placeholder,
        showSearch = true,
        style,
        value,
    } = props;
    const [open, setOpen] = useState(false);
    const handleChange = (nextValue: string | string[]) => {
        if (typeof document !== 'undefined') {
            const activeElement = document.activeElement as HTMLElement | null;
            activeElement?.blur?.();
        }
        if (typeof props.onChange !== 'function') return;
        if (mode === 'multiple') {
            if (Array.isArray(nextValue)) props.onChange(nextValue);
        } else if (typeof nextValue === 'string') {
            props.onChange(nextValue);
        }
    };
    const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Escape' || !open) return;
        event.stopPropagation();
        setOpen(false);
    };

    return (
        <AntSelect
            allowClear={false}
            aria-label={ariaLabel}
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
            onInputKeyDown={handleInputKeyDown}
            onOpenChange={setOpen}
            open={open}
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

export function Switch({ 'aria-label': ariaLabel, checked, disabled, loading, onChange, style }: { 'aria-label'?: string; checked?: boolean; disabled?: boolean; loading?: boolean; onChange?: (checked: boolean) => void; style?: AnyStyle }) {
    return <AntSwitch aria-label={ariaLabel} checked={checked} disabled={disabled} loading={loading} onChange={onChange} size="small" style={sanitizeStyle(style)} />;
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
    const handleKeyDown = (event: ReactKeyboardEvent<HTMLSpanElement>) => {
        if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        onClick();
    };

    return (
        <AntTag
            bordered
            className={className}
            color={color === 'primary' ? 'processing' : color}
            onClick={onClick}
            onKeyDown={handleKeyDown}
            role={onClick ? 'button' : undefined}
            style={sanitizeStyle({
                cursor: onClick ? 'pointer' : undefined,
                minHeight: onClick ? 44 : undefined,
                ...style,
            })}
            tabIndex={onClick ? 0 : undefined}
        >
            {children}
        </AntTag>
    );
}

export function NavBar({
    backIcon,
    backLabel,
    children,
    className,
    onBack,
    right,
    style,
    titleAlign,
}: {
    backIcon?: ReactNode;
    backLabel?: string;
    children?: ReactNode;
    className?: string;
    onBack?: () => void;
    right?: ReactNode;
    style?: AnyStyle;
    titleAlign?: 'center' | 'left';
}) {
    const { token } = theme.useToken();
    const locale = useLocale();
    const localeText = getMobileUiLocaleText(locale);
    const sheetContext = useContext(MobileSheetContext);
    const isCloseIcon = isValidElement(backIcon) && backIcon.type === LuX;
    const effectiveBackLabel = backLabel ?? (isCloseIcon ? localeText.close : 'Back');
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
                <Button aria-label={effectiveBackLabel} fill="none" onClick={onBack} style={{ minHeight: 44, minWidth: 44, paddingInline: 0 }}>
                    {backIcon ?? <LuArrowLeft size={18} />}
                </Button>
            ) : reserveLeadingSpace ? (
                <div style={{ minHeight: 44, minWidth: 44 }} />
            ) : (
                null
            )}
            <Flex align="center" justify={effectiveTitleAlign === 'left' ? 'flex-start' : 'center'} style={{ flex: 1, minWidth: 0 }}>
                {hasTitle ? (
                    <Title
                        level={5}
                        style={{
                            lineHeight: 1.2,
                            margin: 0,
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textAlign: effectiveTitleAlign,
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {children}
                    </Title>
                ) : null}
            </Flex>
            <Flex align="center" justify="flex-end" style={{ minHeight: 44, minWidth: 44 }}>
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
                    <Flex align="center" justify="space-between" style={{ minHeight: 44 }}>
                        <Button
                            aria-label="Close"
                            fill="none"
                            onClick={onClose}
                            style={{ minHeight: 44, minWidth: 44, paddingInline: 0 }}
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
                                minHeight: 44,
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
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    'aria-label': ariaLabel,
    'aria-required': ariaRequired,
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
    'aria-describedby'?: string;
    'aria-invalid'?: React.AriaAttributes['aria-invalid'];
    'aria-label'?: string;
    'aria-required'?: React.AriaAttributes['aria-required'];
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
    const { token } = theme.useToken();
    const isTemporalInput = type === 'time' || type === 'date' || type === 'datetime-local' || type === 'month' || type === 'week';
    const mergedStyle = sanitizeStyle({
        backgroundColor: disabled ? token.colorBgContainerDisabled : token.colorBgContainer,
        borderColor: token.colorBorder,
        color: disabled ? token.colorTextDisabled : token.colorText,
        ...(isTemporalInput ? { minHeight: 44 } : {}),
        ...(style || {}),
    });

    const focusTimeInput = (event: FocusEvent<HTMLInputElement>) => {
        if (!isTemporalInput) return;
        event.currentTarget.focus();
    };

    const openNativeTimePicker = (event: MouseEvent<HTMLInputElement>) => {
        if (!isTemporalInput) return;
        const inputEl = event.currentTarget;
        inputEl.focus();
        try {
            inputEl.showPicker?.();
        } catch {
            // iOS/Safari or non-gesture contexts can reject showPicker; focus is sufficient fallback.
        }
    };

    return (
        <AntInput
            aria-describedby={ariaDescribedBy}
            aria-invalid={ariaInvalid}
            aria-label={ariaLabel}
            aria-required={ariaRequired}
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
            onFocus={focusTimeInput}
            placeholder={placeholder}
            step={step}
            style={mergedStyle}
            type={type}
            value={value}
        />
    );
}

export function TextArea({ 'aria-label': ariaLabel, autoSize, disabled, maxLength, onChange, placeholder, rows, showCount, style, value }: { 'aria-label'?: string; autoSize?: { minRows?: number; maxRows?: number }; disabled?: boolean; maxLength?: number; onChange?: (value: string) => void; placeholder?: string; rows?: number; showCount?: boolean; style?: AnyStyle; value?: string }) {
    const { token } = theme.useToken();

    return (
        <AntInput.TextArea
            aria-label={ariaLabel}
            autoSize={autoSize}
            disabled={disabled}
            maxLength={maxLength}
            onChange={(event) => onChange?.(event.target.value)}
            placeholder={placeholder}
            rows={rows}
            showCount={showCount}
            style={sanitizeStyle({
                backgroundColor: disabled ? token.colorBgContainerDisabled : token.colorBgContainer,
                borderColor: token.colorBorder,
                color: disabled ? token.colorTextDisabled : token.colorText,
                ...style,
            })}
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

function TabPane(_: TabPaneProps): null {
    return null;
}

export const Tabs = Object.assign(TabsComponent, { Tab: TabPane });

type DialogConfig = {
    ariaLabel?: string;
    cancelText?: ReactNode;
    confirmText?: ReactNode;
    content?: ReactNode;
    onCancel?: () => void;
    onConfirm?: () => void | Promise<void>;
    title?: ReactNode;
};

function resolveStaticDialogLabel(config: DialogConfig, fallback: string): string {
    const explicitLabel = config.ariaLabel?.trim();
    if (explicitLabel) return explicitLabel;
    if (typeof config.title === 'string' && config.title.trim()) return config.title.trim();
    return fallback;
}

function AccessibleStaticDialogContent({ children, label }: { children: ReactNode; label: string }) {
    const anchorRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const dialog = anchorRef.current?.closest('[role="dialog"]');
        if (!dialog) return;
        dialog.setAttribute('aria-label', label);
        return () => {
            if (dialog.getAttribute('aria-label') === label) dialog.removeAttribute('aria-label');
        };
    }, [label]);

    return (
        <>
            {children}
            <span hidden ref={anchorRef} />
        </>
    );
}

function renderAccessibleStaticDialog(label: string) {
    return function AccessibleStaticDialogRenderer(node: ReactNode) {
        return (
            <AccessibleStaticDialogContent label={label}>{node}</AccessibleStaticDialogContent>
        );
    };
}

async function confirmDialog(config: DialogConfig) {
    const localeText = getMobileUiLocaleText();
    const dialogLabel = resolveStaticDialogLabel(config, 'Confirmation');
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
            modalRender: renderAccessibleStaticDialog(dialogLabel),
            title: config.title,
            zIndex: MOBILE_DIALOG_Z_INDEX,
        });
    });
}

export const Dialog = {
    alert: (config: DialogConfig) => Modal.info({
        content: config.content,
        modalRender: renderAccessibleStaticDialog(resolveStaticDialogLabel(config, 'Notice')),
        title: config.title,
        zIndex: MOBILE_DIALOG_Z_INDEX,
    }),
    confirm: confirmDialog,
};

export function Checkbox({ 'aria-label': ariaLabel, checked, children, disabled, indeterminate, onChange, style }: { 'aria-label'?: string; checked?: boolean; children?: ReactNode; disabled?: boolean; indeterminate?: boolean; onChange?: (checked: boolean) => void; style?: AnyStyle }) {
    return <AntCheckbox aria-label={ariaLabel} checked={checked} disabled={disabled} indeterminate={indeterminate} onChange={(event) => onChange?.(event.target.checked)} style={sanitizeStyle(style)}>{children}</AntCheckbox>;
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

function CollapsePanel(_: CollapsePanelProps): null {
    return null;
}

export const Collapse = Object.assign(CollapseComponent, { Panel: CollapsePanel });

export function SafeArea({ position = 'top' }: { position?: 'top' | 'bottom' }) {
    return <AntSpace style={position === 'top' ? { paddingTop: 'env(safe-area-inset-top)' } : { paddingBottom: 'env(safe-area-inset-bottom)' }} />;
}

export { Avatar, Badge, Divider, Flex, Image, Title };
