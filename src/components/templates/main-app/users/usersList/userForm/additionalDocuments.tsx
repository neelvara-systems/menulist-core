import ImageUploadInput from '@atoms/imageUploadInput';
import Saperator from '@atoms/Saperator';
import EditorWrapper from '@organisms/editor/editorWrapper';
import { UserUploadedFileType } from '@type/common';
import { UserDataType } from '@type/platform/user';
import { removeObjRef, updateDeepPathValue } from '@util/utils';
import { Button, Card, Empty, Flex, Input, Typography } from 'antd';
import { Fragment, useRef, useState } from 'react';
import { LuImagePlus, LuPen, LuUpload, LuX } from 'react-icons/lu';
const { Text } = Typography;

function AdditionalDocuments({ userDetails, onChangeValue }: { userDetails: UserDataType, onChangeValue: any }) {

    const fileInputRef = useRef(null);
    const [fileIndex, setFileIndex] = useState(0)

    const onClickAdd = () => {
        const userCopy: UserDataType = removeObjRef(userDetails);
        if (!userCopy.additionalDocuments) userCopy.additionalDocuments = [];
        userCopy.additionalDocuments.push({ label: "", url: "", size: 0, type: "" });
        onChangeValue('additionalDocuments', userCopy.additionalDocuments)
    }

    const onChangeDocValue = (index, from, value) => {
        const userCopy: UserDataType = removeObjRef(userDetails);
        userCopy.additionalDocuments[index] = updateDeepPathValue(userCopy.additionalDocuments[index], from, value);;
        onChangeValue('additionalDocuments', userCopy.additionalDocuments)
    }

    const onClickRemoveDoc = (index) => {
        const userCopy: UserDataType = removeObjRef(userDetails);
        userCopy.additionalDocuments.splice(index, 1);
        onChangeValue('additionalDocuments', userCopy.additionalDocuments)
    }

    const handleFileChange = async (selectedFile: UserUploadedFileType) => {
        const userCopy: UserDataType = removeObjRef(userDetails);
        userCopy.additionalDocuments[fileIndex] = {
            label: userCopy.additionalDocuments[fileIndex]?.label || selectedFile?.name || "",
            url: selectedFile?.url || "",
            size: selectedFile?.size || 0,
            type: selectedFile?.type || ""
        };
        onChangeValue('additionalDocuments', userCopy.additionalDocuments)
    };

    const onClickAddFile = (index) => {
        setFileIndex(index)
        fileInputRef.current.click()
    }

    const renderImage = (url) => {
        return <>
            <img src={url} style={{ width: "auto", height: 100, }} />
        </>
    }


    return (
        <EditorWrapper>
            {Boolean(userDetails?.additionalDocuments?.length) ? <>
                {userDetails?.additionalDocuments?.map((docDetails, index) => {
                    return <Fragment key={index}>
                        <EditorWrapper>
                            <Card
                                hoverable
                                styles={{ header: { padding: "10px" }, extra: { width: "100%" } }}
                                extra={<Flex justify='space-between' align='center' gap={10} style={{ width: "100%" }}>
                                    <Input prefix={<>{index + 1}.</>} suffix={<LuPen />} style={{ width: "100%" }} placeholder="ID Proof/Form" value={docDetails?.label || ""} onChange={(e) => onChangeDocValue(index, 'label', e.target.value)} />
                                    <Button danger shape='circle' size='small' icon={<LuX />} onClick={() => onClickRemoveDoc(index)} />
                                </Flex>
                                }
                            >
                                <Flex onClick={() => onClickAddFile(index)} align="center" justify="center" gap={10}>
                                    {docDetails?.url ? renderImage(docDetails?.url) : <>
                                        <Button style={{ height: 100 }} block icon={<LuUpload />}>Upload Image/Document</Button>
                                    </>}
                                </Flex>
                            </Card>
                        </EditorWrapper>
                        <Saperator />
                    </Fragment>
                })}
            </> : <>
                <Empty description="No Documents Added" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </>}
            <Button icon={<LuImagePlus />} onClick={onClickAdd}>Add New Document</Button>
            <ImageUploadInput
                compression={false}
                onUploadFile={handleFileChange}
                fileInputRef={fileInputRef}
            />
        </EditorWrapper>
    )
}

export default AdditionalDocuments