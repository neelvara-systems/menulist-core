import { sortFontsPresets } from '@database/static/fontPresets';
import { DndContext, DragEndEvent, DragOverlay, type Active, rectIntersection, useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import {
    createSortableFontPresetList,
    removeSortableFontPresetUids,
    reorderSortableFontPresetList,
    type SortableFontPreset,
} from '@lib/platform/fontPresetSortBoundary';
import { getUID } from '@util/utils';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { Button, Flex, Modal, theme } from 'antd';
import { type Dispatch, Fragment, type SetStateAction, useEffect, useState } from 'react';
import { LuX } from 'react-icons/lu';
import type { FontPresetsType } from '@type/assets';
import SortableItem from './SortableItem';

type SortFontModalState = {
    active: boolean;
    data: FontPresetsType[];
};

type SortFontModalProps = {
    setFontsList: Dispatch<SetStateAction<FontPresetsType[]>>;
    setShowSortModal: Dispatch<SetStateAction<SortFontModalState>>;
    showSortModal: SortFontModalState;
};

function SortFontModal({ showSortModal, setShowSortModal, setFontsList }: SortFontModalProps) {
    const [fontsList, setFonts] = useState<SortableFontPreset[]>([])
    const { setNodeRef, isOver } = useDroppable({ id: "layers", })
    const [draggingItem, setDraggingItem] = useState<Active | null>(null)
    const { token } = theme.useToken();

    useEffect(() => {
        setFonts(createSortableFontPresetList(showSortModal.data, getUID));
    }, [showSortModal.data])

    const onSubmit = async () => {
        try {
            const persistedFonts = removeSortableFontPresetUids(fontsList);
            await sortFontsPresets(persistedFonts);
            setFontsList(persistedFonts)
            setShowSortModal({ active: false, data: [] })
        } catch (error) {
            logRuntimeFailure('platform_font_presets_sort_failed', error, {
                fontCount: Array.isArray(fontsList) ? fontsList.length : 0,
            });
        }
    }

    const handleOnDragEnd = ({ active, over }: DragEndEvent) => {
        if (over?.id && active?.id) {
            setFonts((currentState) => reorderSortableFontPresetList(
                currentState,
                String(active.id),
                String(over.id),
            ));
        }
        setDraggingItem(null);
    }

    return (
        <Modal
            centered
            destroyOnHidden
            title="Update Font Sequencing"
            open={Boolean(showSortModal.active)}
            onCancel={() => setShowSortModal({ active: false, data: [] })}
            styles={{ mask: { backdropFilter: 'blur(6px)' } }}
            footer={<Flex align="center" justify="flex-end" style={{ marginTop: 30 }}>
                <Button type="default" onClick={() => setShowSortModal({ active: false, data: [] })}>Cancel</Button>
                <Button type="primary" onClick={onSubmit}>Update</Button>
            </Flex>}
            closeIcon={<LuX />}
            width={400}
        >
            <Flex>
                <DndContext
                    onDragStart={({ active }) => {
                        setDraggingItem(active)
                    }}
                    onDragCancel={() => setDraggingItem(null)}
                    onDragEnd={handleOnDragEnd}
                    collisionDetection={rectIntersection}
                >
                    <SortableContext
                        items={fontsList?.map((item) => item.uid)}
                        strategy={rectSortingStrategy}>
                        <div style={{ width: "100%", flexDirection: "column", display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }} ref={setNodeRef} >
                            {fontsList.map((fontData) => {
                                return <Fragment key={fontData.uid}>
                                    <SortableItem fontData={fontData} />
                                </Fragment>
                            })}
                        </div>
                    </SortableContext>
                    <DragOverlay>
                        {Boolean(draggingItem?.id) ?
                            <Flex
                                justify='center'
                                align='center'
                                style={{ background: token.colorBgBase, width: "100%", height: 50, border: `1px solid ${token.colorBorder}`, borderRadius: 4 }}
                            >
                                {draggingItem?.data?.current?.fontData.name}
                            </Flex>
                            : null}
                    </DragOverlay>
                </DndContext>
            </Flex>
        </Modal>
    )
}

export default SortFontModal
