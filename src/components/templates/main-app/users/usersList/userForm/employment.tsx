import EditorWrapper from '@organisms/editor/editorWrapper';
import { Flex, Input, Select, Typography } from 'antd';
const { Text } = Typography;

function Employment({ userDetails, onChangeValue }) {
    return (
        <EditorWrapper>
            <Flex>
                <Text style={{ minWidth: 150 }}>Designation</Text>
                <Input placeholder="Designation" value={userDetails?.employment?.designation || ""} onChange={(e) => onChangeValue('employment.designation', e.target.value)} />
            </Flex>
            <Flex>
                <Text style={{ minWidth: 150 }}>Start Date</Text>
                <Input placeholder="Joining Date" value={userDetails?.employment?.startDate || ""} onChange={(e) => onChangeValue('employment.startDate', e.target.value)} />
            </Flex>
            <Flex>
                <Text style={{ minWidth: 150 }}>End Date</Text>
                <Input placeholder="End Date" value={userDetails?.employment?.endDate || ""} onChange={(e) => onChangeValue('employment.endDate', e.target.value)} />
            </Flex>

            <Flex>
                <Text style={{ minWidth: 150 }}>Job Title</Text>
                <Input placeholder="Job Title" value={userDetails?.employment?.jobTitle || ""} onChange={(e) => onChangeValue('employment.jobTitle', e.target.value)} />
            </Flex>

            <Flex>
                <Text style={{ minWidth: 150 }}>Type</Text>
                <Select
                    defaultValue={userDetails?.employment?.type || ""}
                    value={userDetails?.employment?.type || ""}
                    style={{ width: "100%" }}
                    placeholder="Select employment Type"
                    onChange={(value) => onChangeValue('employment.type', value)}
                    options={[
                        { label: "Full Time", value: "Full Time" },
                        { label: "Part Time", value: "Part Time" },
                    ]}
                />
            </Flex>
        </EditorWrapper>
    )
}

export default Employment