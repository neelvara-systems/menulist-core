import { UserUploadedFileType } from "@type/common";
import type { InheritanceState } from "@type/multiOutlet.types";
import { removeObjRef } from "@util/utils";
import { Card, Flex, Tabs, message as antdMessage } from "antd";
import { LuImage, LuPenLine } from "react-icons/lu";
import {
    ExtractedDataItem,
    ItemForDropdown,
    Project,
    ProjectFileType,
} from "../../types";
import { FileImagePreview } from "../components/FileImagePreview";
import EditorContent from "../EditorContent";

interface FocusViewProps {
    projectData: Project;
    fileProcessingId: string | null;
    searchTerm: string;
    filters: any;
    setPreviewFile: (file: ProjectFileType | null) => void;
    confirmFileDeletion: (file: ProjectFileType) => void;
    onRetryTranslations: (file: ProjectFileType) => void;
    setIsDescModalOpen: (state: {
        active: boolean;
        sourceFile?: ProjectFileType;
    }) => void;
    setIsImageModalOpen: (state: {
        active: boolean;
        item?: ExtractedDataItem;
        from?: string;
    }) => void;
    setProjectData: React.Dispatch<React.SetStateAction<Project>>;
    onImageUpload: (
        selectedItem: ItemForDropdown,
        imagesToUpload: UserUploadedFileType[],
    ) => void;
    // Multi-outlet props
    itemStates?: Record<string, InheritanceState>;
    isMasterLinked?: boolean;
}

export const FocusView = ({
    projectData,
    fileProcessingId,
    searchTerm,
    filters,
    setPreviewFile,
    confirmFileDeletion,
    onRetryTranslations,
    setIsDescModalOpen,
    setIsImageModalOpen,
    setProjectData,
    onImageUpload,
    // Multi-outlet props
    itemStates,
    isMasterLinked,
}: FocusViewProps) => {
    return (
        <>
            {projectData?.files?.map((file: ProjectFileType, index: number) => (
                <Card key={index} size="small" style={{ width: "100%" }}>
                    <Tabs
                        defaultActiveKey="editor"
                        style={{ width: "100%" }}
                        items={[
                            {
                                key: "editor",
                                label: (
                                    <span
                                        style={{ display: "flex", alignItems: "center", gap: 8 }}
                                    >
                                        <LuPenLine size={16} />
                                        Editor
                                    </span>
                                ),
                                children: (
                                    <div
                                        style={{
                                            width: "100%",
                                            maxHeight: "calc(100vh - 180px)",
                                            overflow: "auto",
                                        }}
                                    >
                                        <EditorContent
                                            setIsImageModalOpen={(
                                                item: ExtractedDataItem,
                                                from?: string,
                                            ) =>
                                                setIsImageModalOpen({
                                                    active: true,
                                                    item: removeObjRef(item),
                                                    from,
                                                })
                                            }
                                            file={file}
                                            setUpdatedFileData={(newData: ProjectFileType) => {
                                                setProjectData((prev) => ({
                                                    ...prev,
                                                    files: prev.files.map((f) =>
                                                        f.uid === newData.uid ? newData : f,
                                                    ),
                                                }));
                                            }}
                                            selectedLanguages={projectData.languages}
                                            projectData={projectData}
                                            onImageUpload={onImageUpload}
                                            searchTerm={searchTerm}
                                            filters={filters}
                                            // Multi-outlet props
                                            itemStates={itemStates}
                                            isMasterLinked={isMasterLinked}
                                        />
                                    </div>
                                ),
                            },
                            {
                                key: "image",
                                label: (
                                    <span
                                        style={{ display: "flex", alignItems: "center", gap: 8 }}
                                    >
                                        <LuImage size={16} />
                                        Image Preview
                                    </span>
                                ),
                                children: (
                                    <Flex
                                        justify="center"
                                        align="center"
                                        style={{
                                            width: "100%",
                                            height: "calc(100vh - 180px)",
                                            overflow: "auto",
                                            background: "rgba(0,0,0,0.02)",
                                            borderRadius: 8,
                                            position: "relative",
                                        }}
                                    >
                                        <FileImagePreview
                                            file={file}
                                            fileProcessingId={fileProcessingId}
                                            onPreview={setPreviewFile}
                                            onDelete={(file) => {
                                                if (file.extractedData) {
                                                    confirmFileDeletion(file);
                                                } else {
                                                    antdMessage.info(
                                                        "File cannot be deleted until processed.",
                                                    );
                                                }
                                            }}
                                            onRetryTranslations={onRetryTranslations}
                                            onRetryDescription={(file) =>
                                                setIsDescModalOpen({ active: true, sourceFile: file })
                                            }
                                        />
                                    </Flex>
                                ),
                            },
                        ]}
                    />
                </Card>
            ))}
        </>
    );
};
