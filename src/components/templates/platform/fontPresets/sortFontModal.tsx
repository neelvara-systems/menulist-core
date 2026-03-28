import { sortFontsPresets } from '@database/static/fontPresets';
import { DndContext, DragEndEvent, DragOverlay, rectIntersection, useDroppable } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import { getUID } from '@util/utils';
import { Button, Flex, Modal, theme } from 'antd';
import { Fragment, useEffect, useState } from 'react';
import { LuX } from 'react-icons/lu';
import SortableItem from './SortableItem';

function SortFontModal({ showSortModal, setShowSortModal, setFontsList }) {

    const [fontsList, setFonts] = useState(showSortModal.data)
    const { setNodeRef, isOver } = useDroppable({ id: "layers", })
    const [draggingItem, setDraggingItem] = useState<any>(null)
    const { token } = theme.useToken();

    useEffect(() => {
        const list = showSortModal.data
        list.map((l) => {
            l.uid = getUID()
        })
        setFonts(list)
    }, [showSortModal])

    const onSubmit = () => {
        sortFontsPresets(fontsList).then((res) => {
            setFontsList(fontsList)
            setShowSortModal({ active: false, data: [] })
        })
    }

    const handleOnDragEnd = ({ active, over }: DragEndEvent, currentState: any) => {
        if (over?.id && active?.id) {
            const active_indx = currentState.findIndex(x => x.uid === active.id);
            const over_indx = currentState.findIndex(x => x.uid === over.id);
            //reorder
            if ((active_indx !== -1) && over_indx !== -1) {
                if (active_indx === over_indx) return;
                const newList: any = arrayMove(currentState, active_indx, over_indx)
                newList.map((l, i) => {
                    l.index = i;
                })
                setFonts(newList)
            }
        }
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
                    onDragEnd={(event: DragEndEvent) => handleOnDragEnd(event, fontsList)}
                    collisionDetection={rectIntersection}
                >
                    <SortableContext
                        items={fontsList?.map((item) => item.uid)}
                        strategy={rectSortingStrategy}>
                        <div style={{ width: "100%", flexDirection: "column", display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }} ref={setNodeRef} >
                            {fontsList?.map((fontData, index) => {
                                return <Fragment key={index}>
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