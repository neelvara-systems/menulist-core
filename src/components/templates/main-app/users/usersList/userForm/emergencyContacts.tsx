import EditorWrapper from '@organisms/editor/editorWrapper';
import { Flex, Input, Select, Typography } from 'antd';
const { Text } = Typography;

function emergencyContact({ userDetails, onChangeValue }) {
    return (
        <EditorWrapper>
            <Flex>
                <Text style={{ minWidth: 150 }}>Name</Text>
                <Input placeholder="Name" value={userDetails?.emergencyContact?.name || ""} onChange={(e) => onChangeValue('emergencyContact.name', e.target.value)} />
            </Flex>
            <Flex>
                <Text style={{ minWidth: 150 }}>Number</Text>
                <Input placeholder="Phone Number" value={userDetails?.emergencyContact?.phoneNumber || ""} onChange={(e) => onChangeValue('emergencyContact.phoneNumber', e.target.value)} />
            </Flex>
            <Flex>
                <Text style={{ minWidth: 150 }}>Email</Text>
                <Input type='email' placeholder="Email" value={userDetails?.emergencyContact?.email || ""} onChange={(e) => onChangeValue('emergencyContact.email', e.target.value)} />
            </Flex>

            <Flex>
                <Text style={{ minWidth: 150 }}>Relation</Text>
                <Select
                    defaultValue={userDetails?.emergencyContact?.relation || ""}
                    value={userDetails?.emergencyContact?.relation || ""}
                    style={{ width: "100%" }}
                    placeholder="Select Emergency Contact Relation"
                    onChange={(value) => onChangeValue('emergencyContact.relation', value)}
                    options={[
                        { lable: "Mother", value: "Mother" },
                        { lable: "Father", value: "Father" },
                        { lable: "Parent", value: "Parent" },
                        { lable: "Brother", value: "Brother" },
                        { lable: "Sister", value: "Sister" },
                        { lable: "Son", value: "Son" },
                        { lable: "Daughter", value: "Daughter" },
                        { lable: "Child", value: "Child" },
                        { lable: "Friend", value: "Friend" },
                        { lable: "Spouse", value: "Spouse" },
                        { lable: "Partner", value: "Partner" },
                        { lable: "Assistant", value: "Assistant" },
                        { lable: "Manager", value: "Manager" },
                        { lable: "Other", value: "Other" },
                        { lable: "Housemate", value: "Housemate" },
                        { lable: "Doctor", value: "Doctor" },
                        { lable: "Emergency", value: "Emergency" },
                        { lable: "Family member", value: "Family member" },
                        { lable: "Teacher", value: "Teacher" },
                        { lable: "Carer", value: "Carer" },
                        { lable: "Guardian", value: "Guardian" },
                        { lable: "Social worker", value: "Social worker" },
                        { lable: "School", value: "School" },
                        { lable: "Day care", value: "Day care" },
                    ]}
                />
            </Flex>
        </EditorWrapper>
    )
}

export default emergencyContact