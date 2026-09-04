'use client';

import { labelConfirmDialogTitle } from '@lib/accessibility/antConfirmDialog';
import { downloadPrintableAssetFiles } from '@lib/printable-asset-templates/assetDelivery';
import { buildPrintableAssetEditorDocument, renderPrintableAssetEditorDocumentFiles } from '@lib/printable-asset-templates/editorDocumentAdapter';
import { renderPrintableAsset, renderPrintableAssetDownloadFiles } from '@lib/printable-asset-templates/renderPrintableAsset';
import { getPrintableTemplateFamily } from '@lib/printable-asset-templates/templateFamilies';
import type { PrintableAssetOutputFormat, PrintableAssetRenderInput } from '@lib/printable-asset-templates/types';
import type { CreativeEditorDocument } from '@/modules/creative-editor/types';
import ContextualStateIllustration from '@/components/atoms/contextualStateIllustration';
import { App as AntApp, Button, Empty, Flex, Modal, Spin, Tag, Typography, theme } from 'antd';
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LuDownload, LuImage, LuPencil, LuPrinter, LuX } from 'react-icons/lu';

const { Paragraph, Title } = Typography;
const CreativeEditor = dynamic(() => import('@/modules/creative-editor/CreativeEditor'), {
    loading: () => <Flex align="center" justify="center" style={{ height: '100%' }}><Spin /></Flex>,
    ssr: false,
});

export type PrintableAssetWorkflowDownload = {
    edited: boolean;
    format: Exclude<PrintableAssetOutputFormat, 'zip'>;
};

type Props = {
    assetTitle: string;
    icon: ReactNode;
    input: PrintableAssetRenderInput | null;
    introDescription: ReactNode;
    introTitle: string;
    metadata?: ReactNode;
    onClose: () => void;
    onDownloaded?: (result: PrintableAssetWorkflowDownload) => Promise<void> | void;
    open: boolean;
    previewAlt: string;
    previewAspectRatio?: string;
    previewMaxHeight?: number;
    productLabel: string;
    sourceLabel: string;
    unavailableDescription: string;
};

export default function PrintableAssetWorkflowModal({
    assetTitle, icon, input, introDescription, introTitle, metadata, onClose, onDownloaded, open,
    previewAlt, previewAspectRatio = '1.8 / 1', previewMaxHeight = 420, productLabel, sourceLabel,
    unavailableDescription,
}: Props) {
    const { message, modal } = AntApp.useApp();
    const { token } = theme.useToken();
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewState, setPreviewState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const [busyFormat, setBusyFormat] = useState<PrintableAssetOutputFormat | null>(null);
    const [editorDocument, setEditorDocument] = useState<CreativeEditorDocument | null>(null);
    const [editorDirty, setEditorDirty] = useState(false);
    const editorDocumentRef = useRef<CreativeEditorDocument | null>(null);
    const editorBaselineRef = useRef('');
    const editorCloseConfirmOpenRef = useRef(false);
    const operationRef = useRef<string | null>(null);
    const previewRequestRef = useRef(0);
    const assetSlug = input?.assetTypeId.replaceAll('_', '-') || 'printable-asset';
    const family = useMemo(() => input ? getPrintableTemplateFamily(input.templateFamilyId) : null, [input]);
    const operationBusy = Boolean(busyFormat) || previewState === 'loading';

    const releasePreview = useCallback(() => {
        setPreviewUrl((current) => {
            if (current) URL.revokeObjectURL(current);
            return null;
        });
    }, []);

    const renderCurrentPreview = useCallback(async (currentInput: PrintableAssetRenderInput): Promise<boolean> => {
        previewRequestRef.current += 1;
        const requestId = previewRequestRef.current;
        releasePreview();
        setPreviewState('loading');
        try {
            const result = await renderPrintableAsset({ ...currentInput, outputFormat: 'png' });
            if (previewRequestRef.current !== requestId) return false;
            setPreviewUrl(URL.createObjectURL(new Blob([result.blob], { type: result.mimeType })));
            setPreviewState('ready');
            return true;
        } catch {
            if (previewRequestRef.current === requestId) setPreviewState('error');
            return false;
        }
    }, [releasePreview]);

    const retryPreview = useCallback(async () => {
        if (!input || operationRef.current) return;
        operationRef.current = 'preview';
        try {
            await renderCurrentPreview(input);
        } finally {
            operationRef.current = null;
        }
    }, [input, renderCurrentPreview]);

    useEffect(() => {
        if (!open || !input) {
            previewRequestRef.current += 1;
            releasePreview();
            setPreviewState('idle');
            setEditorDocument(null);
            setEditorDirty(false);
            editorDocumentRef.current = null;
            editorBaselineRef.current = '';
            return;
        }
        void retryPreview();
        return () => { previewRequestRef.current += 1; };
    }, [input, open, releasePreview, retryPreview]);

    useEffect(() => releasePreview, [releasePreview]);

    const notifyDownloaded = useCallback(async (result: PrintableAssetWorkflowDownload) => {
        try {
            await onDownloaded?.(result);
        } catch {
            message.warning(`${assetTitle} downloaded, but MenuList could not mark the action handled.`);
        }
    }, [assetTitle, message, onDownloaded]);

    const handleDownload = useCallback(async (format: Exclude<PrintableAssetOutputFormat, 'zip'>) => {
        if (!input || operationRef.current) return;
        operationRef.current = `download:${format}`;
        setBusyFormat(format);
        try {
            if (!await renderCurrentPreview(input)) {
                message.error('Preview must be ready before an output can be created. Please retry.');
                return;
            }
            const files = await renderPrintableAssetDownloadFiles({ ...input, outputFormat: format });
            const delivery = await downloadPrintableAssetFiles(files, `${assetTitle}-${family?.label || 'design'}`);
            message.success(format === 'pdf'
                ? `Print-ready ${assetTitle} downloaded`
                : delivery.filename.endsWith('.zip')
                    ? `${assetTitle} front and back images downloaded as one ZIP`
                    : `${assetTitle} image downloaded`);
            await notifyDownloaded({ edited: false, format });
        } catch {
            message.error(`Could not create the ${assetTitle}. Please try again.`);
        } finally {
            setBusyFormat(null);
            operationRef.current = null;
        }
    }, [assetTitle, family?.label, input, message, notifyDownloaded, renderCurrentPreview]);

    const openEditor = useCallback(() => {
        if (!input || operationRef.current || previewState !== 'ready') return;
        const nextDocument = buildPrintableAssetEditorDocument(input);
        editorDocumentRef.current = nextDocument;
        editorBaselineRef.current = JSON.stringify(nextDocument);
        setEditorDirty(false);
        setEditorDocument(nextDocument);
    }, [input, previewState]);
    const closeEditor = useCallback(() => {
        setEditorDocument(null);
        setEditorDirty(false);
        editorDocumentRef.current = null;
        editorBaselineRef.current = '';
    }, []);
    const requestCloseEditor = useCallback(() => {
        if (operationRef.current) return;
        if (!editorDirty) {
            closeEditor();
            return;
        }
        if (editorCloseConfirmOpenRef.current) return;
        editorCloseConfirmOpenRef.current = true;
        modal.confirm({
            afterClose: () => { editorCloseConfirmOpenRef.current = false; },
            cancelText: 'Keep editing',
            content: 'These changes have not been downloaded or saved as a reusable design.',
            okText: 'Discard changes',
            okType: 'danger',
            onOk: closeEditor,
            title: labelConfirmDialogTitle('Discard unsaved design changes?'),
            zIndex: 2400,
        });
    }, [closeEditor, editorDirty, modal]);

    useEffect(() => {
        if (!editorDirty) return undefined;
        const warnBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', warnBeforeUnload);
        return () => window.removeEventListener('beforeunload', warnBeforeUnload);
    }, [editorDirty]);

    const handleEditorDownload = useCallback(async (format: Exclude<PrintableAssetOutputFormat, 'zip'>) => {
        if (!input || !editorDocumentRef.current || operationRef.current) return;
        operationRef.current = `editor-download:${format}`;
        setBusyFormat(format);
        try {
            const files = await renderPrintableAssetEditorDocumentFiles({
                activePlanType: input.activePlanType,
                assetTypeId: input.assetTypeId,
                document: editorDocumentRef.current,
                outputFormat: format,
                templateFamilyId: input.templateFamilyId,
            });
            const delivery = await downloadPrintableAssetFiles(files, `${assetTitle}-${family?.label || 'edited'}-edited`);
            message.success(format === 'pdf'
                ? `Edited ${assetTitle} PDF downloaded`
                : delivery.filename.endsWith('.zip')
                    ? `Edited ${assetTitle} front and back images downloaded as one ZIP`
                    : `Edited ${assetTitle} image downloaded`);
            await notifyDownloaded({ edited: true, format });
        } catch {
            message.error(`Could not export the edited ${assetTitle}. Please try again.`);
        } finally {
            setBusyFormat(null);
            operationRef.current = null;
        }
    }, [assetTitle, family?.label, input, message, notifyDownloaded]);

    const requestCloseWorkflow = useCallback(() => {
        if (operationRef.current || previewState === 'loading') return;
        onClose();
    }, [onClose, previewState]);

    return (
        <>
            <Modal
                centered closable={!operationBusy} destroyOnHidden keyboard={!operationBusy} maskClosable={!operationBusy}
                onCancel={requestCloseWorkflow} open={open} width={760} zIndex={2200}
                title={<Flex align="center" gap={8} wrap="wrap">{icon}<span>{assetTitle}</span>{family ? <Tag color="blue">{family.label}</Tag> : null}</Flex>}
                footer={input ? <Flex gap={8} justify="flex-end" wrap="wrap">
                    <Button disabled={operationBusy || previewState !== 'ready'} icon={<LuPencil />} onClick={openEditor}>Edit design</Button>
                    <Button disabled={operationBusy || previewState !== 'ready'} icon={<LuImage />} loading={busyFormat === 'png'} onClick={() => void handleDownload('png')}>Download image</Button>
                    <Button disabled={operationBusy || previewState !== 'ready'} icon={<LuPrinter />} loading={busyFormat === 'pdf'} onClick={() => void handleDownload('pdf')} type="primary">Download PDF</Button>
                </Flex> : null}
            >
                <Flex gap={16} vertical>
                    <div><Title level={5} style={{ marginBottom: 4 }}>{introTitle}</Title><Paragraph type="secondary" style={{ margin: 0 }}>{introDescription}</Paragraph></div>
                    <Flex align="center" justify="center" style={{ aspectRatio: previewAspectRatio, background: token.colorFillAlter, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 18, minHeight: 280, overflow: 'hidden', padding: 18 }}>
                        {previewState === 'loading' ? <Spin size="large" /> : null}
                        {previewState === 'error' ? (
                            <Empty
                                description={<Flex align="center" gap={10} vertical><span>Preview could not be created. Outputs stay unavailable until it succeeds.</span><Button onClick={() => void retryPreview()}>Retry preview</Button></Flex>}
                                image={<ContextualStateIllustration color={token.colorError} size={96} treatment="plain" variant="photoErrorContext" />}
                            />
                        ) : null}
                        {previewState === 'ready' && previewUrl ? <img alt={previewAlt} src={previewUrl} style={{ display: 'block', height: '100%', maxHeight: previewMaxHeight, maxWidth: '100%', objectFit: 'contain', width: '100%' }} /> : null}
                        {!input && previewState !== 'loading' ? (
                            <Empty
                                description={unavailableDescription}
                                image={<ContextualStateIllustration color={token.colorPrimary} size={96} treatment="softHalo" variant="emptyWorkspace" />}
                            />
                        ) : null}
                    </Flex>
                    {metadata}
                </Flex>
            </Modal>
            {editorDocument && input && typeof document !== 'undefined' ? createPortal(
                <div aria-label={`Edit ${assetTitle}`} aria-modal="true" role="dialog" style={{ background: token.colorBgLayout, height: '100dvh', inset: 0, overflow: 'hidden', position: 'fixed', zIndex: 2300 }}>
                    <CreativeEditor
                        allowNewDesign={false} availableToolIds={['background', 'images', 'text', 'styles', 'brandKit']}
                        chromeMode="embedded" disabledExportFormats={['json']} enableBrowserDrafts
                        headerActions={[
                            { disabled: Boolean(busyFormat), icon: <LuPrinter size={16} />, id: `${assetSlug}-print-pdf`, label: 'Print PDF', loading: busyFormat === 'pdf', onClick: () => void handleEditorDownload('pdf'), requiresReadiness: true, tone: 'primary' },
                            { disabled: Boolean(busyFormat), icon: <LuDownload size={16} />, id: `${assetSlug}-image`, label: 'Image', loading: busyFormat === 'png', onClick: () => void handleEditorDownload('png'), requiresReadiness: true },
                            { ariaLabel: `Close ${assetTitle} editor`, disabled: Boolean(busyFormat), icon: <LuX size={16} />, id: `${assetSlug}-close`, label: 'Close', onClick: requestCloseEditor },
                        ]}
                        initialDocument={editorDocument} initialDrawerCollapsed initialSelectedLayerId={null}
                        key={editorDocument.id} onDocumentChange={(value) => {
                            editorDocumentRef.current = value;
                            setEditorDirty(JSON.stringify(value) !== editorBaselineRef.current);
                        }}
                        productLabel={productLabel} sourceLabel={sourceLabel} workspaceControls={['preview']}
                    />
                </div>,
                document.body,
            ) : null}
        </>
    );
}
