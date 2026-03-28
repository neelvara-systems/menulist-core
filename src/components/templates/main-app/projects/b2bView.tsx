import { useAppSelector } from "@hook/useAppSelector";
import { ProjectsDataContext, ProjectsDataProviderType } from "@providers/projectsDataProvider";
import { getDarkModeState } from "@reduxSlices/clientThemeConfig";
import { removeObjRef } from "@util/utils";
import { Button, Card, Flex, Modal, Select, theme } from "antd";
import { useContext, useEffect, useState } from "react";
import { LuArrowLeft, LuDownload, LuPalette, LuRefreshCcw, LuShare } from "react-icons/lu";
import JsonView from 'react18-json-view';
import 'react18-json-view/src/style.css'; // Import base styles for JsonView
import { ShareModal } from './ShareModal';
import { transformForSingleLanguage } from "./utils";

// Lazy load Excel export to avoid loading ExcelJS on initial bundle
const handleDownloadAsync = async (projectData: any, type: 'json' | 'xlsx') => {
    const { handleDownload } = await import('./utils/excelUtils');
    return handleDownload(projectData, type);
};

const jsonViewerThemes = {
    light: {
        default: { 'color': '#545454', '--json-property': '#aa5d00', '--json-index': '#007299', '--json-number': '#007299', '--json-string': '#008000', '--json-boolean': '#d91e18', '--json-null': '#d91e18' },
        a11y: { 'color': '#545454', '--json-property': '#aa5d00', '--json-index': '#007299', '--json-number': '#007299', '--json-string': '#008000', '--json-boolean': '#d91e18', '--json-null': '#d91e18' },
        github: { 'color': '#005cc5', '--json-property': '#005cc5', '--json-index': '#005cc5', '--json-number': '#005cc5', '--json-string': '#032f62', '--json-boolean': '#005cc5', '--json-null': '#005cc5' },
        vscode: { 'color': '#005cc5', '--json-property': '#0451a5', '--json-index': '#0000ff', '--json-number': '#0000ff', '--json-string': '#a31515', '--json-boolean': '#0000ff', '--json-null': '#0000ff' },
        atom: { 'color': '#383a42', '--json-property': '#e45649', '--json-index': '#986801', '--json-number': '#986801', '--json-string': '#50a14f', '--json-boolean': '#0184bc', '--json-null': '#0184bc' },
        'winter_is_coming': { 'color': '#0431fa', '--json-property': '#3a9685', '--json-index': '#ae408b', '--json-number': '#ae408b', '--json-string': '#8123a9', '--json-boolean': '#0184bc', '--json-null': '#0184bc' },
    },
    dark: {
        default: { 'color': '#d1d1d1', '--json-property': '#009033', '--json-index': '#5d75f2', '--json-number': '#5d75f2', '--json-string': '#c57e29', '--json-boolean': '#e4407b', '--json-null': '#e4407b' },
        a11y: { 'color': '#d1d1d1', '--json-property': '#ffd700', '--json-index': '#00e0e0', '--json-number': '#00e0e0', '--json-string': '#abe338', '--json-boolean': '#ffa07a', '--json-null': '#ffa07a' },
        github: { 'color': '#79b8ff', '--json-property': '#79b8ff', '--json-index': '#79b8ff', '--json-number': '#79b8ff', '--json-string': '#9ecbff', '--json-boolean': '#79b8ff', '--json-null': '#79b8ff' },
        vscode: { 'color': '#da70d6', '--json-property': '#9cdcfe', '--json-index': '#b5cea8', '--json-number': '#b5cea8', '--json-string': '#ce9178', '--json-boolean': '#569cd6', '--json-null': '#569cd6' },
        atom: { 'color': '#abb2bf', '--json-property': '#e06c75', '--json-index': '#d19a66', '--json-number': '#d19a66', '--json-string': '#98c379', '--json-boolean': '#56b6c2', '--json-null': '#56b6c2' },
        'winter_is_coming': { 'color': '#a7dbf7', '--json-property': '#91dacd', '--json-index': '#8dec95', '--json-number': '#8dec95', '--json-string': '#e0aff5', '--json-boolean': '#f29fd8', '--json-null': '#f29fd8' },
    },
};

interface JsonEditResult {
    newValue: any;
    oldValue: any;
    depth: number;
    src: any;
    indexOrName: string | number;
    parentType: 'object' | 'array';
    parentPath: string[];
}

const themeOptions: { value: string; label: string }[] = [
    { value: 'a11y_light', label: 'A11y Light' },
    { value: 'a11y_dark', label: 'A11y Dark' },
    { value: 'github_light', label: 'GitHub Light' },
    { value: 'github_dark', label: 'GitHub Dark' },
    { value: 'atom_light', label: 'Atom Light' },
    { value: 'atom_dark', label: 'Atom Dark' },
    { value: 'vscode_light', label: 'VS Code Light' },
    { value: 'vscode_dark', label: 'VS Code Dark' },
    { value: 'winter_is_coming_light', label: 'Winter is Coming Light' },
    { value: 'winter_is_coming_dark', label: 'Winter is Coming Dark' },
    { value: 'default_light', label: 'Default Light' },
    { value: 'default_dark', label: 'Default Dark' }
];

function B2BView() {

    const { token } = theme.useToken();
    const isDarkMode = useAppSelector(getDarkModeState);
    const [isUpdated, setIsUpdated] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [jsonTheme, setJsonTheme] = useState<string>('default_light');
    const [selectedThemeStyle, setSelectedThemeStyle] = useState<any>(jsonViewerThemes['light']['default']);
    const { activeProject, setCurrentView, currentView } = useContext<ProjectsDataProviderType>(ProjectsDataContext)
    const [projectData, setProjectData] = useState(removeObjRef(activeProject))

    const setSelectedStyle = (theme: string) => {
        const mode = theme.includes('dark') ? 'dark' : 'light';
        const themeKey = theme.replace(/_dark|_light/, '');
        const selectedThemeStyle = jsonViewerThemes[mode][themeKey] || jsonViewerThemes[mode].default;
        setJsonTheme(theme);
        setSelectedThemeStyle(selectedThemeStyle);
    }

    useEffect(() => {
        const projectDataCopy = removeObjRef(activeProject)
        if (activeProject.languages.length == 1) {
            projectDataCopy.files.map((file) => {
                if (file.extractedData?.data) {
                    const languageCodes = projectDataCopy.languages.map(lang => {
                        const match = lang.match(/\((.*?)\)/);
                        return match ? match[1] : lang;
                    });
                    const data = file.extractedData.data;
                    const transformedData = transformForSingleLanguage(data, languageCodes[0]);
                    file.extractedData.data = transformedData;
                }
            });
            setProjectData(removeObjRef(projectDataCopy))
        } else {
            setProjectData(removeObjRef(projectDataCopy))
        }
    }, [activeProject])


    const handleJsonEdit = (file: any, edit: JsonEditResult) => {
        try {
            // Validate edited JSON before updating state
            console.log(edit);
            // With react18-json-view we directly use the src object which is already updated
            const index = projectData.files.findIndex((f) => f.uid === file.uid);
            if (index !== -1) {
                const updatedFiles = [...projectData.files];
                // No need to set edit.updated_src as in react18-json-view the src is directly mutated
                setProjectData({ ...projectData, files: updatedFiles });
                setIsUpdated(true)
            }
            // Consider adding Redux dispatch here if needed
        } catch (error) {
            console.error('Invalid JSON edit:', error);
        }
    }

    const confirmResetChanges = () => {
        Modal.confirm({
            title: 'Reset Changes?',
            content: 'Are you sure you want to reset all changes made in this view?',
            okText: 'Yes, Reset',
            okType: 'danger',
            cancelText: 'No',
            onOk: () => {
                setProjectData(removeObjRef(activeProject)); // Reset local state
                setIsUpdated(false); // Reset updated flag
            },
            onCancel() {
                console.log('Reset changes cancelled');
            },
        });
    };

    return (
        <Flex vertical style={{ width: '100%' }} gap={10}>
            <Card
                variant="borderless"
                styles={{ body: { padding: "6px" } }}
                style={{
                    width: '100%',
                    position: 'sticky',
                    top: 0,
                    zIndex: 11
                }}>
                <Flex vertical gap={14}>
                    <Flex gap={16} justify="space-between" align="center">
                        <Flex gap={8} wrap="wrap" align="center">
                            <Button icon={<LuArrowLeft />} onClick={() => setCurrentView(currentView - 1)} shape="circle" />
                            {isUpdated && (
                                <Button icon={<LuRefreshCcw />} shape="circle" onClick={confirmResetChanges} />
                            )}
                        </Flex>
                        <Flex gap={8} align="center">
                            <Button icon={<LuDownload />} onClick={() => handleDownloadAsync(projectData, 'json')}>JSON</Button>
                            <Button icon={<LuDownload />} onClick={() => handleDownloadAsync(projectData, 'xlsx')}>XLS</Button>
                            <Button icon={<LuShare />} onClick={() => setIsShareModalOpen(true)}>Share</Button>
                        </Flex>
                    </Flex>

                    <Card size="small" styles={{ body: { padding: "0" } }} style={{ width: '100%', height: "100%", maxHeight: "calc(100vh - 126px)", overflow: 'auto', background: token.colorFillAlter, position: 'relative' }}>
                        <Flex justify="space-between" align="flex-start" gap={10} vertical style={{ width: '100%', position: "relative" }}>
                            <Select
                                variant="filled"
                                prefix={<LuPalette />}
                                value={jsonTheme}
                                onChange={setSelectedStyle}
                                options={themeOptions}
                                style={{
                                    width: 210,
                                    position: 'sticky',
                                    top: 10,
                                    right: 10,
                                    zIndex: 10,
                                    marginLeft: 'auto'
                                }}
                            />
                            {projectData.files.map((file) => (
                                <JsonView
                                    key={file.uid}
                                    src={file.extractedData?.data}
                                    style={{ padding: '16px', width: '100%', ...selectedThemeStyle }}
                                    enableClipboard={true}
                                    onEdit={(params) => handleJsonEdit(file, params)}
                                    editable={true}
                                />
                            ))}
                        </Flex>
                    </Card>
                </Flex>
            </Card>
            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                projectData={projectData}
                handleDownload={(type: 'json' | 'xlsx') => handleDownloadAsync(projectData, type)}
            />
        </Flex>
    );
}
export default B2BView