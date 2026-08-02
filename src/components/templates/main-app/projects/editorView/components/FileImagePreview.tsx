import { openIsolatedBrowserUrl } from '@lib/browser/openIsolatedBrowserUrl';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { Alert, Button, Divider, Flex, message, Popover, Space, theme, Tooltip, Typography } from 'antd';
import { LuAlertTriangle, LuExternalLink, LuEye, LuFileText, LuHelpCircle, LuInfo, LuKeyboard, LuMinus, LuMousePointer2, LuMove, LuPlus, LuRotateCcw, LuTrash, LuXCircle } from 'react-icons/lu';
import { TbLanguageHiragana } from 'react-icons/tb';
import { FileMessage, ProjectFileType } from '../../types';
import { ZoomableImage } from '../ZoomableImage';

const { Text, Title } = Typography;

// ═══════════════════════════════════════════════════════════════════════════
// Processing Warnings Display (Section 8.14)
// Shows per-file warnings/errors from AI extraction
// ═══════════════════════════════════════════════════════════════════════════

const ProcessingWarnings = ({ messages }: { messages?: FileMessage[] }) => {
    const { token } = theme.useToken();

    if (!messages || messages.length === 0) return null;

    const hasError = messages.some(m => m.status === 'error');
    const primaryMessage = hasError
        ? messages.find(m => m.status === 'error')
        : messages[0];

    if (!primaryMessage) return null;

    // Get total omitted count
    const totalOmitted = messages.reduce((sum, m) => sum + (m.details?.omittedCount || 0), 0);
    const totalExtracted = messages.reduce((sum, m) => sum + (m.details?.extractedCount || 0), 0);

    return (
        <Alert
            type={hasError ? 'error' : 'warning'}
            showIcon
            icon={hasError ? <LuXCircle size={16} /> : <LuAlertTriangle size={16} />}
            style={{
                margin: '8px 16px',
                borderRadius: 8
            }}
            message={
                <Text strong style={{ fontSize: 13 }}>
                    {primaryMessage.message}
                </Text>
            }
            description={
                primaryMessage.details && (
                    <div style={{ marginTop: 4 }}>
                        {/* Extraction stats */}
                        {totalExtracted > 0 && totalOmitted > 0 && (
                            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                                {totalExtracted} of {totalExtracted + totalOmitted} items extracted
                            </Text>
                        )}

                        {/* Omitted items details */}
                        {primaryMessage.details.omittedItems && primaryMessage.details.omittedItems.length > 0 && (
                            <ul style={{
                                margin: '4px 0 0 0',
                                paddingLeft: 16,
                                fontSize: 12,
                                color: token.colorTextSecondary
                            }}>
                                {primaryMessage.details.omittedItems.slice(0, 3).map((item, idx) => (
                                    <li key={idx}>
                                        {item.position && `${item.position}: `}
                                        {item.partialName && `"${item.partialName}" - `}
                                        {item.reason}
                                    </li>
                                ))}
                                {primaryMessage.details.omittedItems.length > 3 && (
                                    <li style={{ fontStyle: 'italic' }}>
                                        ...and {primaryMessage.details.omittedItems.length - 3} more
                                    </li>
                                )}
                            </ul>
                        )}

                        {/* Affected fields details */}
                        {primaryMessage.details.affectedFields && primaryMessage.details.affectedFields.length > 0 && (
                            <ul style={{
                                margin: '4px 0 0 0',
                                paddingLeft: 16,
                                fontSize: 12,
                                color: token.colorTextSecondary
                            }}>
                                {primaryMessage.details.affectedFields.slice(0, 3).map((field, idx) => (
                                    <li key={idx}>
                                        {field.itemName && `"${field.itemName}": `}
                                        {field.field} - {field.reason}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )
            }
        />
    );
};

// Help content for image controls
const ImageControlsHelp = () => {
    const { token } = theme.useToken();

    const shortcuts = [
        { icon: <LuPlus size={14} />, keys: ['Scroll Up', '+'], action: 'Zoom in' },
        { icon: <LuMinus size={14} />, keys: ['Scroll Down', '-'], action: 'Zoom out' },
        { icon: <LuRotateCcw size={14} />, keys: ['0', 'Click %'], action: 'Reset zoom' },
        { icon: <LuMousePointer2 size={14} />, keys: ['Double-click'], action: 'Quick zoom (2x)' },
        { icon: <LuMove size={14} />, keys: ['Drag'], action: 'Pan when zoomed' },
    ];

    const actions = [
        { icon: <LuEye size={14} />, label: 'View Full Image', desc: 'Open image in fullscreen preview' },
        { icon: <TbLanguageHiragana size={14} />, label: 'Re-translate', desc: 'Re-read this file and translate the text again' },
        { icon: <LuInfo size={14} />, label: 'Generate Descriptions', desc: 'Create item descriptions automatically' },
        { icon: <LuTrash size={14} color={token.colorError} />, label: 'Delete File', desc: 'Remove this file from the project' },
    ];

    return (
        <div style={{ maxWidth: 340, padding: '4px 0' }}>
            {/* Zoom Controls Section */}
            <Flex align="center" gap={6} style={{ marginBottom: 8 }}>
                <LuKeyboard size={14} style={{ color: token.colorPrimary }} />
                <Title level={5} style={{ margin: 0, fontSize: 13 }}>Zoom Controls</Title>
            </Flex>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
                {shortcuts.map((item, idx) => (
                    <Flex key={idx} justify="space-between" align="center" gap={12}>
                        <Flex align="center" gap={8}>
                            <span style={{ color: token.colorTextSecondary }}>{item.icon}</span>
                            <Text style={{ fontSize: 12 }}>{item.action}</Text>
                        </Flex>
                        <Flex gap={4}>
                            {item.keys.map((key, kidx) => (
                                <Text
                                    key={kidx}
                                    keyboard
                                    style={{ fontSize: 11 }}
                                >
                                    {key}
                                </Text>
                            ))}
                        </Flex>
                    </Flex>
                ))}
            </Space>

            <Divider style={{ margin: '12px 0' }} />

            {/* Actions Section */}
            <Flex align="center" gap={6} style={{ marginBottom: 8 }}>
                <LuMousePointer2 size={14} style={{ color: token.colorPrimary }} />
                <Title level={5} style={{ margin: 0, fontSize: 13 }}>Available Actions</Title>
            </Flex>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
                {actions.map((item, idx) => (
                    <Flex key={idx} align="flex-start" gap={10}>
                        <span style={{
                            color: token.colorTextSecondary,
                            marginTop: 2,
                            flexShrink: 0
                        }}>
                            {item.icon}
                        </span>
                        <Flex vertical>
                            <Text strong style={{ fontSize: 12 }}>{item.label}</Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>{item.desc}</Text>
                        </Flex>
                    </Flex>
                ))}
            </Space>

            <Divider style={{ margin: '12px 0 8px' }} />

            <Text type="secondary" style={{ fontSize: 11, display: 'block', textAlign: 'center' }}>
                💡 Tip: Click on the image area and use keyboard shortcuts
            </Text>
        </div>
    );
};

const getSourceUrl = (file: ProjectFileType): string | null => {
    const sourceMetadata = (file as ProjectFileType & { sourceMetadata?: { sourceUrl?: unknown } }).sourceMetadata;
    const sourceUrl = sourceMetadata?.sourceUrl;

    return typeof sourceUrl === 'string' && sourceUrl.trim().length > 0 ? sourceUrl.trim() : null;
};

const SourceFilePreview = ({
    file,
    isLoading,
    onRetryDescription,
    onRetryTranslations,
}: {
    file: ProjectFileType;
    isLoading: boolean;
    onRetryDescription: (file: ProjectFileType) => void;
    onRetryTranslations: (file: ProjectFileType) => void;
}) => {
    const { token } = theme.useToken();
    const sourceUrl = getSourceUrl(file);
    const source = (file as ProjectFileType & { source?: unknown }).source;
    const sourceLabel = source === 'menu_link_import'
        ? 'Imported menu link'
        : file.type === 'application/pdf'
            ? 'PDF source'
            : 'Source file';
    const handleSourceLinkOpen = () => {
        if (!sourceUrl) return;

        try {
            openIsolatedBrowserUrl(sourceUrl);
        } catch (error) {
            logRuntimeFailure('project_file_source_link_open_failed', error, {
                surface: 'project_file_image_preview',
                ...getBoundedRuntimeStringContext('sourceUrl', sourceUrl),
                ...getBoundedRuntimeStringContext('sourceLabel', sourceLabel),
                ...getBoundedRuntimeStringContext('source', source),
                ...getBoundedRuntimeStringContext('fileName', file.name),
                ...getBoundedRuntimeStringContext('fileType', file.type),
            });
            message.error('Unable to open source link');
        }
    };

    return (
        <Flex gap={10} vertical style={{ position: 'relative', width: '100%', minWidth: 300, paddingRight: 10 }}>
            <Flex
                align="center"
                justify="center"
                vertical
                gap={10}
                style={{
                    background: token.colorFillAlter,
                    border: `1px dashed ${token.colorBorder}`,
                    borderRadius: 8,
                    color: token.colorTextSecondary,
                    height: 400,
                    minWidth: 300,
                    padding: 24,
                    position: 'relative',
                    width: '100%',
                }}
            >
                {isLoading && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: token.colorBgMask,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1,
                        }}
                    >
                        <Text style={{ color: '#fff' }}>Reading source...</Text>
                    </div>
                )}
                <LuFileText size={40} />
                <Text strong>{sourceLabel}</Text>
                {file.name ? (
                    <Text type="secondary" style={{ maxWidth: 320, textAlign: 'center' }} ellipsis={{ tooltip: file.name }}>
                        {file.name}
                    </Text>
                ) : null}
                {sourceUrl ? (
                    <Button
                        icon={<LuExternalLink />}
                        onClick={handleSourceLinkOpen}
                    >
                        Open source link
                    </Button>
                ) : null}
            </Flex>
            <ProcessingWarnings messages={file.extractedData?.processingMessages} />
            <Flex gap={10}>
                <Tooltip title="This will improve translations for all items from this source">
                    <Button onClick={() => onRetryTranslations(file)} block icon={<TbLanguageHiragana />}>
                        Fix Translations
                    </Button>
                </Tooltip>
                <Tooltip title="This will create descriptions for items that do not have one">
                    <Button onClick={() => onRetryDescription(file)} block icon={<LuInfo />}>
                        Add Descriptions
                    </Button>
                </Tooltip>
            </Flex>
        </Flex>
    );
};

interface FileImagePreviewProps {
    file: ProjectFileType;
    fileProcessingId: string | null;
    onPreview: (file: ProjectFileType) => void;
    onDelete: (file: ProjectFileType) => void;
    onRetryTranslations: (file: ProjectFileType) => void;
    onRetryDescription: (file: ProjectFileType) => void;
}

export const FileImagePreview = ({
    file,
    fileProcessingId,
    onPreview,
    onDelete,
    onRetryTranslations,
    onRetryDescription
}: FileImagePreviewProps) => {
    const isImageFile = typeof file.type === 'string' && file.type.startsWith('image/');
    const canPreviewImage = isImageFile && typeof file.url === 'string' && file.url.trim().length > 0;

    return (
        <div style={{ position: "relative", width: '100%', height: '100%' }}>
            {/* File name display */}
            {file.name && (
                <div style={{
                    position: "absolute",
                    top: 8,
                    left: 18,
                    zIndex: 1,
                    background: 'rgba(0,0,0,0.6)',
                    padding: '4px 10px',
                    borderRadius: 6,
                    maxWidth: '60%'
                }}>
                    <Text
                        style={{
                            color: '#fff',
                            fontSize: 12,
                            margin: 0
                        }}
                        ellipsis={{ tooltip: file.name }}
                    >
                        {file.name}
                    </Text>
                </div>
            )}
            <div style={{ position: "absolute", top: 8, right: 18, zIndex: 1 }}>
                <Flex gap={8}>
                    {canPreviewImage ? (
                        <>
                            <Popover
                                content={<ImageControlsHelp />}
                                title={null}
                                trigger="click"
                                placement="bottomRight"
                                arrow={{ pointAtCenter: true }}
                            >
                                <Button
                                    icon={<LuHelpCircle style={{ fontSize: 16 }} />}
                                    shape="circle"
                                    type="default"
                                />
                            </Popover>
                            <Tooltip title="View full image">
                                <Button
                                    icon={<LuEye style={{ fontSize: 16 }} />}
                                    onClick={() => onPreview(file)}
                                    shape="circle"
                                />
                            </Tooltip>
                        </>
                    ) : null}
                    <Tooltip title={file.extractedData ? "Delete this file" : "Cannot delete until processed"}>
                        <Button
                            danger
                            icon={<LuTrash style={{ fontSize: 16 }} />}
                            shape="circle"
                            disabled={!file.extractedData}
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(file);
                            }}
                        />
                    </Tooltip>
                </Flex>
            </div>
            <Flex vertical style={{ width: '100%', overflow: 'auto' }}>
                {canPreviewImage ? (
                    <>
                        <ZoomableImage
                            isLoading={fileProcessingId === file.uid}
                            src={file.url}
                            alt={file.name || 'Menu image'}
                            retryTranslations={() => onRetryTranslations(file)}
                            retryDescription={() => onRetryDescription(file)}
                        />
                        {/* Show processing warnings/errors for this file (Section 8.14) */}
                        <ProcessingWarnings messages={file.extractedData?.processingMessages} />
                    </>
                ) : (
                    <SourceFilePreview
                        file={file}
                        isLoading={fileProcessingId === file.uid}
                        onRetryDescription={onRetryDescription}
                        onRetryTranslations={onRetryTranslations}
                    />
                )}
            </Flex>
        </div>
    );
};
